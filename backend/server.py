from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import random
import string
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

EVENT = {
    "id": "rajaonam-2026",
    "name": "Raja Onam - Oru Kottara Sadhya 2026",
    "tagline": "Oru Kottara Sadhya 2026",
    "edition": "Grand Onam Celebration",
    "date": "26 August 2026",
    "time": "11:00 AM – 5:00 PM",
    "venue": "Bolgatty Palace, Kochi",
    "sea_price_adult": 2899,
    "sea_price_kid": 1399,
    "veg_price_adult": 2599,
    "veg_price_kid": 1199,
    "currency_symbol": "₹",
    "contests": ["Malayali Manka", "Sreeman", "Kids Contest", "Best Couple"],
    "games": ["Uriyadi", "Vadamvali (Tug of War)", "Sack Race", "Bun Eating Competition", "Sundarikku Pottu Thodal", "Lemon & Spoon Race"],
    "boating_slots": ["12:00 PM – 1:00 PM", "2:30 PM – 3:30 PM", "3:30 PM – 4:30 PM", "4:30 PM – 5:30 PM"],
}


class BookingCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    phone: str = Field(min_length=7, max_length=20)
    email: EmailStr
    adults: int = Field(ge=0, le=30)
    kids_5_12: int = Field(ge=0, le=30, default=0)
    kids_below_5: int = Field(ge=0, le=30, default=0)
    veg_adults: int = Field(ge=0, le=30, default=0)
    veg_kids_5_12: int = Field(ge=0, le=30, default=0)
    veg_kids_below_5: int = Field(ge=0, le=30, default=0)
    contests: List[str] = []
    games: List[str] = []
    boating: bool = False
    boating_slot: Optional[str] = None
    boating_persons: int = Field(ge=0, le=30, default=0)


@api_router.get("/")
async def root():
    return {"message": "RajaoNam API"}


@api_router.get("/event")
async def get_event():
    return EVENT


@api_router.post("/bookings")
async def create_booking(input: BookingCreate):
    if input.boating:
        if not input.boating_slot or input.boating_slot not in EVENT["boating_slots"]:
            raise HTTPException(status_code=400, detail="Choose a valid boating time slot")
        if input.boating_persons < 1:
            raise HTTPException(status_code=400, detail="Boating needs at least 1 person")

    if input.adults + input.veg_adults < 1:
        raise HTTPException(status_code=400, detail="At least 1 adult required")

    total_participants = (
        input.adults + input.kids_5_12 + input.kids_below_5
        + input.veg_adults + input.veg_kids_5_12 + input.veg_kids_below_5
    )
    total = (
        input.adults * EVENT["sea_price_adult"]
        + input.kids_5_12 * EVENT["sea_price_kid"]
        + input.veg_adults * EVENT["veg_price_adult"]
        + input.veg_kids_5_12 * EVENT["veg_price_kid"]
    )
    reference = "EO-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    doc = {
        "id": str(uuid.uuid4()),
        "reference": reference,
        "name": input.name,
        "phone": input.phone,
        "email": input.email,
        "adults": input.adults,
        "kids_5_12": input.kids_5_12,
        "kids_below_5": input.kids_below_5,
        "veg_adults": input.veg_adults,
        "veg_kids_5_12": input.veg_kids_5_12,
        "veg_kids_below_5": input.veg_kids_below_5,
        "total_participants": total_participants,
        "contests": input.contests,
        "games": input.games,
        "boating": input.boating,
        "boating_slot": input.boating_slot if input.boating else None,
        "boating_persons": input.boating_persons if input.boating else 0,
        "sea_price_adult": EVENT["sea_price_adult"],
        "sea_price_kid": EVENT["sea_price_kid"],
        "veg_price_adult": EVENT["veg_price_adult"],
        "veg_price_kid": EVENT["veg_price_kid"],
        "total": total,
        "currency_symbol": EVENT["currency_symbol"],
        "status": "confirmed",
        "payment": "mock",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.bookings.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/bookings/{reference}")
async def get_booking(reference: str):
    doc = await db.bookings.find_one({"reference": reference}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Booking not found")
    return doc


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
