from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import random
import string
import csv
import io
import jwt
import bcrypt
import asyncio
import base64
import httpx
import qrcode
from fpdf import FPDF
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

EVENT = {
    "id": "rajaonam-2026",
    "name": "RAJAONAM 2026",
    "tagline": "Oru Kottara Sadhya 2026",
    "edition": "Grand Onam Celebration",
    "date": "26 August 2026",
    "time": "11:00 AM – 5:00 PM",
    "venue": "Bolgatty Palace & Island Resort, Kochi",
    "sea_price_adult": 2999,
    "sea_price_kid": 1399,
    "veg_price_adult": 2699,
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
    payment_mode: str = "Pending"


PAYMENT_MODES = ["Pending", "UPI", "Card", "Net Banking", "Pay at Venue"]


@api_router.get("/")
async def root():
    return {"message": "RajaoNam API"}


@api_router.get("/event")
async def get_event():
    return EVENT


@api_router.post("/bookings")
async def create_booking(input: BookingCreate, request: Request):
    if input.boating:
        if not input.boating_slot or input.boating_slot not in EVENT["boating_slots"]:
            raise HTTPException(status_code=400, detail="Choose a valid boating time slot")
        if input.boating_persons < 1:
            raise HTTPException(status_code=400, detail="Boating needs at least 1 person")

    if input.adults + input.veg_adults < 1:
        raise HTTPException(status_code=400, detail="At least 1 adult required")
    if input.payment_mode not in PAYMENT_MODES:
        raise HTTPException(status_code=400, detail="Invalid payment mode")

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
        "payment_mode": input.payment_mode,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.bookings.insert_one(doc)
    doc.pop("_id", None)
    asyncio.create_task(send_confirmation_email(doc, public_base(request)))
    return doc


EMAIL_BASE_URL = "https://integrations.emergentagent.com"


def public_base(request: Request) -> str:
    proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    host = request.headers.get("x-forwarded-host", request.headers.get("host", ""))
    return f"{proto}://{host}/"


def qr_payload(doc) -> str:
    return f"RAJAONAM-2026|{doc['reference']}|{doc['name']}|{doc['total_participants']} guests"


def make_qr_png(data: str) -> bytes:
    img = qrcode.make(data, box_size=8, border=2)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


@api_router.get("/bookings/{reference}/qr")
async def booking_qr(reference: str):
    doc = await db.bookings.find_one({"reference": reference}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Booking not found")
    return Response(content=make_qr_png(qr_payload(doc)), media_type="image/png")


def pdf_safe(s) -> str:
    return str(s).replace("–", "-").replace("—", "-").replace("₹", "Rs. ").encode("latin-1", "replace").decode("latin-1")


def make_ticket_pdf(doc, qr_png: bytes) -> bytes:
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("helvetica", "B", 24)
    pdf.set_text_color(27, 88, 18)
    pdf.cell(0, 12, "RajaOnam 2026", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "", 10)
    pdf.set_text_color(122, 106, 88)
    pdf.cell(0, 6, "Oru Kottara Sadhya  |  Bolgatty Palace & Island Resort, Kochi  |  26 August 2026  |  11:00 AM - 5:00 PM", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)
    pdf.set_draw_color(201, 162, 39)
    pdf.set_line_width(0.8)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(8)
    pdf.set_font("helvetica", "B", 15)
    pdf.set_text_color(138, 42, 27)
    pdf.cell(0, 9, f"BOOKING ID: {doc['reference']}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)
    pdf.set_font("helvetica", "", 12)
    pdf.set_text_color(43, 33, 24)
    rows = [
        ("Name", doc["name"]),
        ("Phone", doc["phone"]),
        ("Email", doc["email"]),
        ("Sea Food Sadhya", f"{doc['adults']} Adults, {doc['kids_5_12']} Kids (5-12), {doc['kids_below_5']} Below 5"),
        ("Veg Onam Sadhya", f"{doc['veg_adults']} Adults, {doc['veg_kids_5_12']} Kids (5-12), {doc['veg_kids_below_5']} Below 5"),
        ("Contests", ", ".join(doc["contests"]) or "-"),
        ("Games", ", ".join(doc["games"]) or "-"),
        ("Boating", f"{doc['boating_slot']} ({doc['boating_persons']} persons)" if doc["boating"] else "-"),
        ("Total Amount", f"Rs. {doc['total']:,}  (pay at venue)"),
    ]
    for k, v in rows:
        pdf.set_font("helvetica", "B", 11)
        pdf.cell(50, 8, pdf_safe(k))
        pdf.set_font("helvetica", "", 11)
        pdf.multi_cell(0, 8, pdf_safe(v), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)
    pdf.image(io.BytesIO(qr_png), x=80, y=pdf.get_y(), w=50, h=50)
    pdf.set_y(pdf.get_y() + 54)
    pdf.set_font("helvetica", "", 10)
    pdf.set_text_color(122, 106, 88)
    pdf.cell(0, 6, "Show this QR code or your Booking ID at the gate.", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(8)
    pdf.set_font("helvetica", "I", 9)
    pdf.cell(0, 6, "Copyright 2026 RajaOnam - Powered by Berrysys Media Global LLC", new_x="LMARGIN", new_y="NEXT", align="C")
    return bytes(pdf.output())


@api_router.get("/bookings/{reference}/ticket.pdf")
async def booking_ticket_pdf(reference: str):
    doc = await db.bookings.find_one({"reference": reference}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Booking not found")
    pdf_bytes = make_ticket_pdf(doc, make_qr_png(qr_payload(doc)))
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=RajaOnam-Ticket-{reference}.pdf"},
    )


def booking_email_html(doc, qr_url, ticket_url):
    rows = "".join([
        f'<tr><td style="padding:8px 0;color:#7A6A58;font-size:13px;text-transform:uppercase;letter-spacing:1px;">{k}</td>'
        f'<td style="padding:8px 0;color:#2B2118;font-size:14px;text-align:right;font-weight:600;">{v}</td></tr>'
        for k, v in [
            ("Booking ID", doc["reference"]),
            ("Name", doc["name"]),
            ("Sea Food Sadhya", f"{doc['adults']} Adults · {doc['kids_5_12']} Kids (5-12) · {doc['kids_below_5']} Below 5"),
            ("Veg Onam Sadhya", f"{doc['veg_adults']} Adults · {doc['veg_kids_5_12']} Kids (5-12) · {doc['veg_kids_below_5']} Below 5"),
            ("Contests", ", ".join(doc["contests"]) or "—"),
            ("Games", ", ".join(doc["games"]) or "—"),
            ("Boating", f"{doc['boating_slot']} · {doc['boating_persons']} persons" if doc["boating"] else "—"),
            ("Total Amount", f"₹{doc['total']:,}"),
        ]
    ])
    return f"""<!DOCTYPE html><html><body style="margin:0;padding:0;background:#FFFBF2;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFBF2;padding:32px 16px;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #E4D6BC;border-radius:12px;overflow:hidden;">
<tr><td style="background:#1b5812;padding:24px 32px;">
  <p style="margin:0;color:#fabd8f;font-size:22px;letter-spacing:1px;">RajaOnam 2026</p>
  <p style="margin:4px 0 0;color:#fabd8f;opacity:0.75;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Oru Kottara Sadhya · Bolgatty Palace &amp; Island Resort, Kochi</p>
</td></tr>
<tr><td style="padding:32px;">
  <p style="margin:0 0 8px;color:#8A2A1B;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Booking Confirmed</p>
  <p style="margin:0 0 24px;color:#2B2118;font-size:24px;">Your banana leaf is reserved, {doc['name'].split()[0]}!</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E4D6BC;">{rows}</table>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr><td align="center" style="background:#FFFBF2;border:1px solid #E4D6BC;border-radius:12px;padding:24px;">
    <img src="{qr_url}" width="180" height="180" alt="Booking QR code" style="display:block;" />
    <p style="margin:12px 0 0;color:#7A6A58;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Show this QR at the gate</p>
  </td></tr></table>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;"><tr><td align="center">
    <a href="{ticket_url}" style="display:inline-block;background:#1b5812;color:#fabd8f;font-size:13px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:14px 36px;border-radius:30px;">Download Ticket (PDF)</a>
  </td></tr></table>
  <p style="margin:24px 0 0;color:#7A6A58;font-size:13px;line-height:1.6;">26 August 2026 · 11:00 AM – 5:00 PM · Bolgatty Palace &amp; Island Resort, Kochi.<br/>Present your Booking ID <b style="color:#8A2A1B;">{doc['reference']}</b> or the QR code at the entrance.</p>
</td></tr>
<tr><td style="background:#F5EBD8;padding:16px 32px;"><p style="margin:0;color:#7A6A58;font-size:11px;letter-spacing:1px;text-align:center;">Copyright 2026 RajaOnam · Powered by Berrysys Media Global LLC</p></td></tr>
</table></td></tr></table></body></html>"""


async def send_confirmation_email(doc, base_url):
    qr_url = f"{base_url}api/bookings/{doc['reference']}/qr"
    ticket_url = f"{base_url}api/bookings/{doc['reference']}/ticket.pdf"
    logger.info(f"Email URLs for {doc['reference']}: qr={qr_url} ticket={ticket_url}")
    payload = {
        "to": [doc["email"]],
        "subject": f"RajaOnam 2026 — Booking Confirmed ({doc['reference']})",
        "html": booking_email_html(doc, qr_url, ticket_url),
        "from_name": os.environ["EMAIL_FROM_NAME"],
    }
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{EMAIL_BASE_URL}/api/v1/email/send",
                headers={"X-Email-Key": os.environ["EMERGENT_EMAIL_KEY"]},
                json=payload,
            )
        logger.info(f"Confirmation email to {doc['email']} for {doc['reference']}: HTTP {resp.status_code}")
    except Exception as e:
        logger.error(f"Email send failed for {doc['reference']}: {e}")


@api_router.get("/bookings/{reference}")
async def get_booking(reference: str):
    doc = await db.bookings.find_one({"reference": reference}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Booking not found")
    return doc


JWT_ALGORITHM = "HS256"


def create_access_token(email: str) -> str:
    payload = {
        "sub": email,
        "role": "admin",
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
    }
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)


async def get_current_admin(request: Request):
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else None
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
        if payload.get("role") != "admin" or payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token")
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


class AdminLogin(BaseModel):
    email: EmailStr
    password: str


@api_router.post("/auth/login")
async def admin_login(input: AdminLogin):
    email = input.email.lower()
    admin = await db.users.find_one({"email": email, "role": "admin"})
    if not admin or not bcrypt.checkpw(input.password.encode("utf-8"), admin["password_hash"].encode("utf-8")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"token": create_access_token(email), "email": email, "role": "admin"}


@api_router.get("/auth/me")
async def auth_me(admin: str = Depends(get_current_admin)):
    return {"email": admin, "role": "admin"}


@api_router.get("/admin/bookings")
async def list_bookings(admin: str = Depends(get_current_admin)):
    return await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)


class CheckinUpdate(BaseModel):
    adults: int = Field(0, ge=0)
    kids_5_12: int = Field(0, ge=0)
    kids_below_5: int = Field(0, ge=0)
    veg_adults: int = Field(0, ge=0)
    veg_kids_5_12: int = Field(0, ge=0)
    veg_kids_below_5: int = Field(0, ge=0)


CAT_KEYS = ["adults", "kids_5_12", "kids_below_5", "veg_adults", "veg_kids_5_12", "veg_kids_below_5"]


@api_router.post("/checkin/{reference}")
async def checkin_booking(reference: str, input: CheckinUpdate, admin: str = Depends(get_current_admin)):
    doc = await db.bookings.find_one({"reference": reference}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Booking not found")

    current = doc.get("checked_in_counts")
    if current is None:
        current = {k: (doc.get(k, 0) if doc.get("checked_in") else 0) for k in CAT_KEYS}

    incoming = input.dict()
    if sum(incoming.values()) < 1:
        raise HTTPException(status_code=400, detail="Select at least one guest to check in")

    new_counts = {k: min(current.get(k, 0) + incoming.get(k, 0), doc.get(k, 0)) for k in CAT_KEYS}
    fully = all(new_counts[k] >= doc.get(k, 0) for k in CAT_KEYS)

    await db.bookings.update_one(
        {"reference": reference},
        {"$set": {
            "checked_in_counts": new_counts,
            "checked_in": True,
            "fully_checked_in": fully,
            "checked_in_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    doc["checked_in_counts"] = new_counts
    doc["checked_in"] = True
    doc["fully_checked_in"] = fully
    return {"status": "ok", "booking": doc}


@api_router.get("/admin/bookings/export")
async def export_bookings(admin: str = Depends(get_current_admin)):
    rows = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(10000)
    output = io.StringIO()
    output.write("\ufeff")
    writer = csv.writer(output)
    writer.writerow([
        "Booking ID", "Booked On", "Name", "Phone", "Email",
        "Sea Adults", "Sea Kids 5-12", "Sea Kids Below 5",
        "Veg Adults", "Veg Kids 5-12", "Veg Kids Below 5",
        "Total Participants", "Contests", "Games",
        "Boating", "Boating Slot", "Boating Persons",
        "Payment Mode", "Total Amount (INR)", "Status",
    ])
    for b in rows:
        writer.writerow([
            b.get("reference", ""),
            b.get("created_at", "")[:16].replace("T", " "),
            b.get("name", ""), b.get("phone", ""), b.get("email", ""),
            b.get("adults", 0), b.get("kids_5_12", 0), b.get("kids_below_5", 0),
            b.get("veg_adults", 0), b.get("veg_kids_5_12", 0), b.get("veg_kids_below_5", 0),
            b.get("total_participants", 0),
            ", ".join(b.get("contests", [])), ", ".join(b.get("games", [])),
            "Yes" if b.get("boating") else "No",
            b.get("boating_slot") or "-", b.get("boating_persons", 0),
            b.get("payment_mode") or "-",
            b.get("total", 0), b.get("status", ""),
        ])
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=rajaonam-bookings.csv"},
    )


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


@app.on_event("startup")
async def seed_admin():
    await db.users.create_index("email", unique=True)
    email = os.environ["ADMIN_EMAIL"].lower()
    password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": email})
    if existing is None:
        hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        await db.users.insert_one({
            "email": email,
            "password_hash": hashed,
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Admin user seeded")
    elif not bcrypt.checkpw(password.encode("utf-8"), existing["password_hash"].encode("utf-8")):
        hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        await db.users.update_one({"email": email}, {"$set": {"password_hash": hashed}})
        logger.info("Admin password updated")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
