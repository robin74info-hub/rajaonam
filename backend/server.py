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
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

EVENT = {
    "id": "ember-oak-2026",
    "name": "Ember & Oak",
    "tagline": "A Fire-Lit Food & Culture Festival",
    "edition": "3rd Edition",
    "date": "14 – 16 August 2026",
    "venue": "The Old Ironworks Grounds, Riverside District",
    "price_per_person": 1499,
    "currency_symbol": "₹",
    "slots": [
        {"id": "golden-hour", "label": "Golden Hour Feast", "time": "5:00 PM – 7:00 PM", "capacity": 120},
        {"id": "ember-service", "label": "The Ember Service", "time": "7:30 PM – 9:30 PM", "capacity": 150},
        {"id": "midnight-tasting", "label": "Midnight Tasting", "time": "10:00 PM – 12:00 AM", "capacity": 80},
    ],
}


class BookingCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    phone: str = Field(min_length=7, max_length=20)
    email: EmailStr
    guests: int = Field(ge=1, le=10)
    slot_id: str


@api_router.get("/")
async def root():
    return {"message": "Ember & Oak API"}


@api_router.get("/event")
async def get_event():
    slots = []
    for s in EVENT["slots"]:
        booked = await db.bookings.count_documents({"slot_id": s["id"], "status": "confirmed"})
        slots.append({**s, "remaining": max(0, s["capacity"] - booked)})
    return {**EVENT, "slots": slots}


@api_router.post("/bookings")
async def create_booking(input: BookingCreate):
    slot = next((s for s in EVENT["slots"] if s["id"] == input.slot_id), None)
    if not slot:
        raise HTTPException(status_code=404, detail="Time slot not found")

    booked = await db.bookings.count_documents({"slot_id": slot["id"], "status": "confirmed"})
    remaining = slot["capacity"] - booked
    if input.guests > remaining:
        raise HTTPException(status_code=409, detail=f"Only {max(0, remaining)} seats left in this slot")

    reference = "EO-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    doc = {
        "id": str(uuid.uuid4()),
        "reference": reference,
        "name": input.name,
        "phone": input.phone,
        "email": input.email,
        "guests": input.guests,
        "slot_id": slot["id"],
        "slot_label": slot["label"],
        "slot_time": slot["time"],
        "price_per_person": EVENT["price_per_person"],
        "total": input.guests * EVENT["price_per_person"],
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
