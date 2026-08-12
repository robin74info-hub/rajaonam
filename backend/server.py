from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse, Response, FileResponse
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
import razorpay
from fpdf import FPDF
from twilio.rest import Client as TwilioClient
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
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
    "boating_slots": ["11:00 AM – 11:45 AM", "12:00 PM – 12:45 PM", "1:00 PM – 1:45 PM", "2:00 PM – 2:45 PM", "3:00 PM – 3:45 PM", "4:00 PM – 4:45 PM"],
    "boating_slot_capacity": 150,
    "sadhya_slots": ["11:30 AM – 12:30 PM", "12:30 PM – 1:30 PM", "1:30 PM – 2:30 PM", "2:30 PM – 3:30 PM"],
    "sadhya_slot_capacity": 250,
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
    sea_slot: Optional[str] = None
    veg_slot: Optional[str] = None
    referral_code: Optional[str] = None
    payment_mode: str = "Pending"
    ticket_type: str = "VIP Guest"
    passcode: Optional[str] = None


PAYMENT_MODES = ["Pending", "UPI", "Card", "Net Banking", "Pay at Venue", "Online (Razorpay)", "COMP"]

ENTRY_TERMS = [
    "Entry is permitted only with a valid Rajaonam 2026 ticket with QR code.",
    "Guests are subject to security checks at the venue.",
    "Weapons, sharp objects, explosives, inflammable or hazardous materials are strictly prohibited.",
    "Possession or use of narcotic drugs and illegal substances is strictly prohibited.",
    "Outside food and beverages are not permitted.",
    "Children must be accompanied and supervised by a parent/guardian.",
    "Guests must maintain appropriate conduct and follow all venue, safety and security instructions.",
    "The organiser is not responsible for loss or damage of personal belongings.",
    "The organiser reserves the right of admission and may remove anyone violating event or safety regulations.",
    "Event schedules and activities may change due to operational or unforeseen circumstances.",
    "Photography and videography will take place during the event.",
    "Guests are required to comply with all applicable laws and regulations while attending Rajaonam 2026.",
    "Purchase/use of the ticket confirms acceptance of the Rajaonam 2026 Entry Ticket Terms & Conditions.",
]

COMP_TERMS = [
    "This pass is valid for entry to Rajaonam 2026 only.",
    "Entry is subject to QR code scanning and verification at the venue.",
    "This pass is valid only for the date and venue mentioned on the pass.",
    "The pass must be presented at the entrance and is valid for one-time entry only.",
    "Guests are subject to security checks at the venue.",
    "Weapons, sharp objects, explosives, inflammable or hazardous materials are strictly prohibited.",
    "Possession or use of narcotic drugs or illegal substances is strictly prohibited.",
    "Outside food and beverages are not permitted.",
    "Children must be accompanied and supervised by a parent or guardian.",
    "Guests must follow all venue, safety and security instructions.",
    "The organiser is not responsible for the loss or damage of personal belongings.",
    "The organiser reserves the right of admission and may deny entry or remove anyone violating event or safety regulations.",
    "Photography and videography may take place during the event.",
    "This Entry Pass carries no monetary or redemption value and cannot be used to avail the redemption offer at Chungath Jewellery, M.G. Road, Ernakulam.",
    "Use of this pass constitutes acceptance of the Rajaonam 2026 Terms & Conditions.",
]

REDEMPTION_TERMS = [
    "Each paid ticket is eligible for 50% redemption of the value of the ticket at ONLY Chungath Jewellery, M.G. Road, Ernakulam, and redeemable until 30 September 2026.",
    "Only PAID ticket with QR code issued for Rajaonam 2026 must be presented at Chungath Jewellery, M.G. Road, Ernakulam for redemption.",
    "A single QR code may contain multiple tickets. Each ticket within the QR code will have its own individual 50% redemption eligibility based on the value of each ticket.",
    "If a QR code contains multiple tickets, each ticket must be redeemed individually against individual invoice until all eligible tickets under the QR code are redeemed.",
    "At the time of redemption, the name and mobile number of the person redeeming the benefit must be provided at Chungath Jewellery, M.G. Road, Ernakulam.",
    "For example, an Adult Seafood Non-Veg Ticket worth Rs. 2,999/- carries a redemption value of 50% of the ticket value which is Rs. 1,499.50/- and can be redeemed against one single invoice only.",
    "Redemption values of multiple tickets cannot be clubbed or combined into a single invoice.",
    "The redemption is a one-time benefit and must be fully utilised in a single invoice. Any unutilised balance will lapse and cannot be refunded, transferred, carried forward or clubbed with another ticket.",
    "Redemption is applicable ONLY towards the purchase of Gold, Silver and Platinum Ornaments.",
    "The redemption benefit cannot be exchanged for cash, transferred or refunded, and can be redeemed only once.",
    "Any purchase amount exceeding the eligible redemption value must be paid by the customer.",
    "Rajaonam 2026 Organiser and Chungath Jewellery, M.G. Road, Ernakulam reserve the right to verify ticket and redemption details before processing the benefit.",
]
TICKET_TYPES = ["VIP Guest"]

rz_client = razorpay.Client(auth=(os.environ["RAZORPAY_KEY_ID"], os.environ["RAZORPAY_KEY_SECRET"]))


@api_router.get("/")
async def root():
    return {"message": "RajaoNam API"}


@api_router.get("/event")
async def get_event():
    return EVENT


def validate_booking(input: BookingCreate):
    if input.boating:
        if not input.boating_slot or input.boating_slot not in EVENT["boating_slots"]:
            raise HTTPException(status_code=400, detail="Choose a valid boating time slot")
        if input.boating_persons < 1:
            raise HTTPException(status_code=400, detail="Boating needs at least 1 person")
    if input.adults + input.veg_adults < 1:
        raise HTTPException(status_code=400, detail="At least 1 adult required")
    if input.payment_mode not in PAYMENT_MODES:
        raise HTTPException(status_code=400, detail="Invalid payment mode")


def _slot_minutes(slot: str):
    """'11:00 AM – 11:45 AM' -> (660, 705)"""
    def parse(t):
        t = t.strip()
        hh, mm = t[:-2].strip().split(":")
        h = int(hh) % 12
        if t.strip().upper().endswith("PM"):
            h += 12
        return h * 60 + int(mm)
    a, b = slot.split("–")
    return parse(a), parse(b)


def sadhya_boating_compatible(sadhya_slot: str, boating_slot: str, gap: int = 30) -> bool:
    """Sadhya must not overlap boating and must keep a gap (default 30 min) before or after."""
    s0, s1 = _slot_minutes(sadhya_slot)
    b0, b1 = _slot_minutes(boating_slot)
    return s1 <= b0 - gap or s0 >= b1 + gap


async def assign_sadhya_slots(input: BookingCreate):
    """Auto-assign the earliest sadhya slot that fits the party.
    Slot capacity is COMBINED: Sea Food + Veg guests together, max 250 per slot.
    Sea and Veg on the same booking always get the SAME slot.
    When boating is booked, the sadhya slot must not clash with the boating time (30-min gap)."""
    cap = EVENT["sadhya_slot_capacity"]
    sea_pax = input.adults + input.kids_5_12 + input.kids_below_5
    veg_pax = input.veg_adults + input.veg_kids_5_12 + input.veg_kids_below_5
    input.sea_slot = None
    input.veg_slot = None
    party = sea_pax + veg_pax

    if input.boating and input.boating_slot:
        boat_booked = 0
        async for b in db.bookings.find({"status": "confirmed", "boating_slot": input.boating_slot}):
            boat_booked += b.get("boating_persons", 0)
        if boat_booked + input.boating_persons > EVENT["boating_slot_capacity"]:
            raise HTTPException(status_code=400, detail=f"Boating slot {input.boating_slot} is full — please choose another boating time")

    if party == 0:
        return
    booked = {s: 0 for s in EVENT["sadhya_slots"]}
    async for b in db.bookings.find({"status": "confirmed"}):
        slot = b.get("sea_slot") or b.get("veg_slot")
        if slot in booked:
            booked[slot] += (
                b.get("adults", 0) + b.get("kids_5_12", 0) + b.get("kids_below_5", 0)
                + b.get("veg_adults", 0) + b.get("veg_kids_5_12", 0) + b.get("veg_kids_below_5", 0)
            )
    for slot in EVENT["sadhya_slots"]:
        if input.boating and input.boating_slot and not sadhya_boating_compatible(slot, input.boating_slot):
            continue
        if booked[slot] + party > cap:
            continue
        if sea_pax > 0:
            input.sea_slot = slot
        if veg_pax > 0:
            input.veg_slot = slot
        return
    raise HTTPException(status_code=400, detail="No Sadhya time slot available that fits your group and boating time — please choose a different boating slot or contact the organiser")


@api_router.get("/slots/availability")
async def slots_availability():
    cap = EVENT["sadhya_slot_capacity"]
    sea = {s: 0 for s in EVENT["sadhya_slots"]}
    veg = {s: 0 for s in EVENT["sadhya_slots"]}
    boating = {s: 0 for s in EVENT["boating_slots"]}
    async for b in db.bookings.find({"status": {"$in": ["confirmed", "pending_payment"]}}):
        if b.get("sea_slot") in sea:
            sea[b["sea_slot"]] += b.get("adults", 0) + b.get("kids_5_12", 0) + b.get("kids_below_5", 0)
        if b.get("veg_slot") in veg:
            veg[b["veg_slot"]] += b.get("veg_adults", 0) + b.get("veg_kids_5_12", 0) + b.get("veg_kids_below_5", 0)
        if b.get("boating_slot") in boating and b.get("status") == "confirmed":
            boating[b["boating_slot"]] += b.get("boating_persons", 0)
    return {"capacity": cap, "sea": sea, "veg": veg, "boating": boating, "boating_capacity": EVENT["boating_slot_capacity"]}


def booking_total(input: BookingCreate) -> int:
    base = (
        input.adults * EVENT["sea_price_adult"]
        + input.kids_5_12 * EVENT["sea_price_kid"]
        + input.veg_adults * EVENT["veg_price_adult"]
        + input.veg_kids_5_12 * EVENT["veg_price_kid"]
    )
    total_participants = (
        input.adults + input.kids_5_12 + input.kids_below_5
        + input.veg_adults + input.veg_kids_5_12 + input.veg_kids_below_5
    )
    if input.referral_code and input.referral_code.strip().upper() == os.environ.get("REFERRAL_CODE") and total_participants >= 10:
        return round(base * 0.95)
    return base


def new_reference() -> str:
    return "EO-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


def build_booking_doc(input: BookingCreate, reference: str, total: int, status: str, payment: str) -> dict:
    total_participants = (
        input.adults + input.kids_5_12 + input.kids_below_5
        + input.veg_adults + input.veg_kids_5_12 + input.veg_kids_below_5
    )
    return {
        "id": str(uuid.uuid4()),
        "reference": reference,
        "referral_code": input.referral_code.strip().upper() if input.referral_code else None,
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
        "sea_slot": input.sea_slot,
        "veg_slot": input.veg_slot,
        "sea_price_adult": EVENT["sea_price_adult"],
        "sea_price_kid": EVENT["sea_price_kid"],
        "veg_price_adult": EVENT["veg_price_adult"],
        "veg_price_kid": EVENT["veg_price_kid"],
        "total": total,
        "currency_symbol": EVENT["currency_symbol"],
        "status": status,
        "payment": payment,
        "payment_mode": input.payment_mode,
        "ticket_type": input.ticket_type,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


class PaymentVerify(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@api_router.post("/payments/order")
async def create_payment_order(input: BookingCreate):
    validate_booking(input)
    await assign_sadhya_slots(input)
    total = booking_total(input)
    reference = new_reference()
    doc = build_booking_doc(input, reference, total, "pending_payment", "razorpay")
    order = rz_client.order.create({
        "amount": total * 100,
        "currency": "INR",
        "payment_capture": 1,
        "receipt": reference,
        "notes": {"reference": reference, "event": "RAJAONAM 2026"},
    })
    doc["razorpay_order_id"] = order["id"]
    await db.bookings.insert_one(doc)
    return {
        "order_id": order["id"],
        "amount": total * 100,
        "currency": "INR",
        "key_id": os.environ["RAZORPAY_KEY_ID"],
        "reference": reference,
        "referral_code": input.referral_code.strip().upper() if input.referral_code else None,
    }


@api_router.get("/bookings/{reference}/public")
async def booking_public(reference: str):
    doc = await db.bookings.find_one({"reference": reference.upper()}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {
        "reference": doc["reference"],
        "name": doc["name"],
        "total": doc.get("total", 0),
        "status": doc.get("status"),
        "payment_mode": doc.get("payment_mode"),
    }


@api_router.post("/payments/resume/{reference}")
async def resume_payment(reference: str):
    doc = await db.bookings.find_one({"reference": reference.upper()})
    if not doc:
        raise HTTPException(status_code=404, detail="Booking not found")
    if doc.get("status") != "pending_payment":
        raise HTTPException(status_code=400, detail="This booking is already paid")
    order = rz_client.order.create({
        "amount": doc["total"] * 100,
        "currency": "INR",
        "payment_capture": 1,
        "receipt": doc["reference"],
        "notes": {"reference": doc["reference"], "event": "RAJAONAM 2026", "resume": "true"},
    })
    await db.bookings.update_one({"reference": doc["reference"]}, {"$set": {"razorpay_order_id": order["id"]}})
    return {
        "order_id": order["id"],
        "amount": doc["total"] * 100,
        "currency": "INR",
        "key_id": os.environ["RAZORPAY_KEY_ID"],
        "reference": doc["reference"],
        "name": doc["name"],
        "email": doc.get("email"),
        "phone": doc.get("phone"),
    }


@api_router.post("/payments/verify")
async def verify_payment(input: PaymentVerify, request: Request):
    try:
        rz_client.utility.verify_payment_signature(input.dict())
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Payment verification failed")

    doc = await db.bookings.find_one({"razorpay_order_id": input.razorpay_order_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Booking not found for this order")

    if doc["status"] != "confirmed":
        await db.bookings.update_one(
            {"razorpay_order_id": input.razorpay_order_id},
            {"$set": {
                "status": "confirmed",
                "razorpay_payment_id": input.razorpay_payment_id,
                "paid_at": datetime.now(timezone.utc).isoformat(),
            }},
        )
        doc["status"] = "confirmed"
        doc["razorpay_payment_id"] = input.razorpay_payment_id
        asyncio.create_task(send_confirmation_email(doc, public_base(request)))
        asyncio.create_task(send_whatsapp_confirmation(doc, public_base(request)))
    return doc


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
    await assign_sadhya_slots(input)

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
        "referral_code": input.referral_code.strip().upper() if input.referral_code else None,
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
        "sea_slot": input.sea_slot,
        "veg_slot": input.veg_slot,
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
    asyncio.create_task(send_whatsapp_confirmation(doc, public_base(request)))
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


@api_router.get("/email-assets/{filename}")
async def email_asset(filename: str):
    if filename not in ("rajaonam-chungath.png", "primetime-logo.png", "chungath-logo.png"):
        raise HTTPException(status_code=404, detail="Not found")
    path = os.path.join(os.path.dirname(__file__), "assets", filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(path, media_type="image/png", headers={"Cache-Control": "public, max-age=86400"})


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
    assets_dir = os.path.join(os.path.dirname(__file__), "assets")
    bg = os.path.join(assets_dir, "pdf-bg.jpg")
    has_bg = os.path.exists(bg)

    def draw_bg():
        """Full ornate frame, aspect preserved: cream page fill + image fit by height, centered."""
        pdf.set_fill_color(245, 235, 216)
        pdf.rect(0, 0, 210, 297, "F")
        img_h = 297
        img_w = img_h * 768 / 1368
        pdf.image(bg, x=(210 - img_w) / 2, y=0, w=img_w, h=img_h)

    if has_bg:
        draw_bg()

    pdf.set_y(96 if has_bg else 10)
    pdf.set_font("helvetica", "B", 16)
    pdf.set_text_color(138, 42, 27)
    pdf.cell(0, 9, f"BOOKING ID: {doc['reference']}", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(2)
    pdf.set_font("helvetica", "B", 11)
    pdf.set_text_color(27, 88, 18)
    pdf.cell(0, 6, "WELCOME TO RAJAONAM 2026", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.set_font("helvetica", "I", 8)
    pdf.set_text_color(90, 74, 56)
    pdf.set_x(38)
    pdf.multi_cell(134, 4, pdf_safe("Get ready to celebrate the spirit of Onam with a day filled with tradition, flavours, entertainment and togetherness. We're delighted to have you with us and look forward to making this celebration memorable. See you at RAJAONAM 2026!"), align="C")
    pdf.ln(3)

    rows = [
        ("Name", doc["name"]),
        ("Phone", doc["phone"]),
        ("Email", doc["email"]),
        ("Sea Food Sadhya", f"{doc['adults']} Adults, {doc['kids_5_12']} Kids (5-12), {doc['kids_below_5']} Below 5"),
        ("Veg Onam Sadhya", f"{doc['veg_adults']} Adults, {doc['veg_kids_5_12']} Kids (5-12), {doc['veg_kids_below_5']} Below 5"),
        ("Sadhya Time Slot", doc.get("sea_slot") or doc.get("veg_slot") or "-"),
        ("Contests", ", ".join(doc["contests"]) or "-"),
        ("Games", ", ".join(doc["games"]) or "-"),
        ("Boating", f"{doc['boating_slot']} ({doc['boating_persons']} persons)" if doc["boating"] else "-"),
        *([("Ticket Type", doc.get("ticket_type", "VIP Guest"))] if doc.get("payment_mode") == "COMP" else []),
        ("Ticket", "VIP Ticket" if doc.get("payment_mode") == "COMP" else f"Rs. {doc['total']:,}"),
    ]

    details_top = pdf.get_y()
    # Jingalala offer banner to the right of ticket information
    jing = os.path.join(assets_dir, "jingalala-new.png")
    jing_bottom = details_top
    if os.path.exists(jing):
        jw = 44
        pdf.image(jing, x=132, y=details_top, w=jw)
        jing_bottom = details_top + jw * 931 / 800

    for k, v in rows:
        pdf.set_x(34)
        pdf.set_font("helvetica", "B", 9.5)
        pdf.set_text_color(107, 26, 15)
        pdf.cell(38, 7, pdf_safe(k))
        pdf.set_font("helvetica", "", 9.5)
        pdf.set_text_color(43, 33, 24)
        pdf.set_x(72)
        pdf.multi_cell(56, 7, pdf_safe(v), new_x="LMARGIN", new_y="NEXT")

    pdf.set_y(max(pdf.get_y(), jing_bottom) + 5)
    pdf.image(io.BytesIO(qr_png), x=80, y=pdf.get_y(), w=50, h=50)
    pdf.set_y(pdf.get_y() + 54)
    pdf.set_font("helvetica", "", 10)
    pdf.set_text_color(122, 106, 88)
    pdf.cell(0, 6, "Show this QR code or your Booking ID at the gate.", new_x="LMARGIN", new_y="NEXT", align="C")

    # Terms & Conditions page
    pdf.add_page()
    if has_bg:
        draw_bg()
        pdf.set_y(84)
    pdf.set_auto_page_break(False)
    pdf.set_font("helvetica", "B", 11)
    pdf.set_text_color(138, 42, 27)
    if doc.get("payment_mode") == "COMP":
        pdf.cell(0, 7, "RAJAONAM 2026 - ENTRY PASS TERMS & CONDITIONS", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.ln(2)
        pdf.set_font("helvetica", "", 8.2)
        pdf.set_text_color(60, 50, 40)
        for i, term in enumerate(COMP_TERMS, 1):
            pdf.multi_cell(0, 4.2, pdf_safe(f"{i}. {term}"), new_x="LMARGIN", new_y="NEXT")
            pdf.ln(0.5)
        pdf.ln(6)
        pdf.set_font("helvetica", "I", 8.5)
        pdf.set_text_color(122, 106, 88)
        pdf.cell(0, 6, "Copyright 2026 RajaOnam - Powered by Event Ticketing Solutions by Berrysys Media Global LLC", new_x="LMARGIN", new_y="NEXT", align="C")
        return bytes(pdf.output())
    pdf.cell(0, 7, "RAJAONAM 2026 - ENTRY TICKET TERMS & CONDITIONS", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(2)
    pdf.set_font("helvetica", "", 8.2)
    pdf.set_text_color(60, 50, 40)
    for i, term in enumerate(ENTRY_TERMS, 1):
        pdf.multi_cell(0, 4.2, pdf_safe(f"{i}. {term}"), new_x="LMARGIN", new_y="NEXT")
        pdf.ln(0.5)
    pdf.ln(2)
    pdf.set_font("helvetica", "B", 11)
    pdf.set_text_color(138, 42, 27)
    pdf.cell(0, 7, "TERMS & CONDITIONS - REDEMPTION OF TICKET AT CHUNGATH JEWELLERY,", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.cell(0, 7, "M.G. ROAD, ERNAKULAM", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(2)
    pdf.set_font("helvetica", "", 8.2)
    pdf.set_text_color(60, 50, 40)
    for i, term in enumerate(REDEMPTION_TERMS, 1):
        pdf.multi_cell(0, 4.2, pdf_safe(f"{i}. {term}"), new_x="LMARGIN", new_y="NEXT")
        pdf.ln(0.5)
    pdf.ln(4)
    pdf.set_font("helvetica", "I", 8.5)
    pdf.set_text_color(122, 106, 88)
    pdf.cell(0, 6, "Copyright 2026 RajaOnam - Powered by Event Ticketing Solutions by Berrysys Media Global LLC", new_x="LMARGIN", new_y="NEXT", align="C")
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
        headers={"Content-Disposition": f"attachment; filename=RajaOnam-Ticket-{reference}.pdf"},
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
            ("Sadhya Time Slot", doc.get("sea_slot") or doc.get("veg_slot") or "—"),
            ("Contests", ", ".join(doc["contests"]) or "—"),
            ("Games", ", ".join(doc["games"]) or "—"),
            ("Boating", f"{doc['boating_slot']} · {doc['boating_persons']} persons" if doc["boating"] else "—"),
            *([("Ticket Type", doc.get("ticket_type", "VIP Guest"))] if doc.get("payment_mode") == "COMP" else []),
            ("Ticket", "VIP Ticket" if doc.get("payment_mode") == "COMP" else f"₹{doc['total']:,}"),
        ]
    ])
    asset_base = qr_url.split("api/")[0]
    left_logo_url = f"{asset_base}api/email-assets/rajaonam-chungath.png"
    right_logo_url = f"{asset_base}api/email-assets/primetime-logo.png"
    is_comp = doc.get("payment_mode") == "COMP"
    if is_comp:
        entry_terms = "".join(
            f'<li style="margin:0 0 5px;color:#5A4A38;font-size:11px;line-height:1.5;">{t}</li>' for t in COMP_TERMS
        )
        redemption_terms = ""
        terms_block = f"""<p style="margin:0 0 10px;color:#8A2A1B;font-size:11px;letter-spacing:2px;text-transform:uppercase;text-align:center;font-weight:bold;">Rajaonam 2026 — Entry Pass Terms &amp; Conditions</p>
  <ol style="margin:0;padding-left:18px;">{entry_terms}</ol>"""
    else:
        entry_terms = "".join(
            f'<li style="margin:0 0 5px;color:#5A4A38;font-size:11px;line-height:1.5;">{t}</li>' for t in ENTRY_TERMS
        )
        redemption_terms = "".join(
            f'<li style="margin:0 0 5px;color:#5A4A38;font-size:11px;line-height:1.5;">{t}</li>' for t in REDEMPTION_TERMS
        )
        terms_block = f"""<p style="margin:0 0 10px;color:#8A2A1B;font-size:11px;letter-spacing:2px;text-transform:uppercase;text-align:center;font-weight:bold;">Rajaonam 2026 — Entry Ticket Terms &amp; Conditions</p>
  <ol style="margin:0;padding-left:18px;">{entry_terms}</ol>
  <p style="margin:14px 0 10px;color:#8A2A1B;font-size:11px;letter-spacing:2px;text-transform:uppercase;text-align:center;font-weight:bold;">Terms &amp; Conditions — Redemption of Ticket at Chungath Jewellery, M.G. Road, Ernakulam</p>
  <ol style="margin:0;padding-left:18px;">{redemption_terms}</ol>"""
    return f"""<!DOCTYPE html><html><body style="margin:0;padding:0;background:#EFE3CB;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#EFE3CB;padding:36px 14px;"><tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="background:#6B1A0F;border-radius:16px;padding:3px;">
<tr><td style="background:#FFFBF2;border-radius:13px;overflow:hidden;">
<table width="100%" cellpadding="0" cellspacing="0">
<!-- Greeting with corner logos -->
<tr><td align="center" style="padding:30px 28px 8px;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td align="left" style="width:100px;"><img src="{left_logo_url}" width="92" alt="RajaOnam 2026" style="display:block;" /></td>
    <td align="center">
      <p style="margin:0;color:#8A2A1B;font-size:11px;letter-spacing:5px;text-transform:uppercase;">&#10022; Prime Time Festivals Presents &#10022;</p>
      <p style="margin:12px 0 0;color:#2B2118;font-size:26px;line-height:1.35;">Your RajaOnam Celebration<br/>is Confirmed, {doc['name'].split()[0]}!</p>
      <p style="margin:10px 0 0;color:#7A6A58;font-size:11px;letter-spacing:2px;text-transform:uppercase;">A Grand Onam Celebration &middot; Bolgatty Palace, Kochi</p>
    </td>
    <td align="right" style="width:100px;"><img src="{right_logo_url}" width="96" alt="Prime Time Events" style="display:block;margin-left:auto;" /></td>
  </tr></table>
  <table cellpadding="0" cellspacing="0" style="margin:16px auto 0;"><tr>
    <td style="width:70px;height:1px;background:#C9A227;"></td>
    <td style="color:#8A2A1B;font-size:12px;padding:0 10px;">&#10022;</td>
    <td style="width:70px;height:1px;background:#C9A227;"></td>
  </tr></table>
</td></tr>
<!-- Welcome -->
<tr><td align="center" style="padding:14px 40px 6px;">
  <p style="margin:0 0 8px;color:#1b5812;font-size:15px;letter-spacing:3px;font-weight:bold;">WELCOME TO RAJAONAM 2026</p>
  <p style="margin:0;color:#5A4A38;font-size:13px;line-height:1.7;font-style:italic;">Get ready to celebrate the spirit of Onam with a day filled with tradition, flavours, entertainment and togetherness. We&rsquo;re delighted to have you with us and look forward to making this celebration memorable. See you at RAJAONAM 2026!</p>
</td></tr>
<!-- Details card -->
<tr><td style="padding:22px 36px 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #C9A227;border-radius:12px;background:#FFFDF7;">
    <tr><td style="padding:6px 22px;">
      <table width="100%" cellpadding="0" cellspacing="0">{rows}</table>
    </td></tr>
  </table>
</td></tr>
<!-- QR frame -->
<tr><td align="center" style="padding:28px 36px 0;">
  <table cellpadding="0" cellspacing="0"><tr><td style="border:2px solid #C9A227;border-radius:16px;padding:6px;">
    <table cellpadding="0" cellspacing="0"><tr><td align="center" style="border:1px solid #E4D6BC;border-radius:11px;background:#FFFBF2;padding:26px 40px;">
      <p style="margin:0 0 14px;color:#8A2A1B;font-size:11px;letter-spacing:4px;text-transform:uppercase;">Your Entry Pass</p>
      <img src="{qr_url}" width="180" height="180" alt="Booking QR code" style="display:block;border:4px solid #F5EBD8;border-radius:8px;" />
      <p style="margin:14px 0 0;color:#2B2118;font-size:15px;font-weight:bold;letter-spacing:2px;">{doc['reference']}</p>
      <p style="margin:6px 0 0;color:#7A6A58;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Show this QR at the gate</p>
      <p style="margin:14px 0 0;"><a href="https://maps.app.goo.gl/q6ZminHj9X8hBhBa6" style="color:#1b5812;font-size:13px;font-weight:bold;text-decoration:none;">&#128205; Venue Location — Open in Google Maps</a></p>
    </td></tr></table>
  </td></tr></table>
</td></tr>
<!-- CTA -->
<tr><td align="center" style="padding:26px 36px 8px;">
  <a href="{ticket_url}" style="display:inline-block;background:#6B1A0F;color:#F5D47E;font-size:13px;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:15px 42px;border-radius:30px;border:1px solid #C9A227;">Download Ticket (PDF)</a>
</td></tr>
<tr><td align="center" style="padding:18px 36px 34px;">
  <p style="margin:0;color:#7A6A58;font-size:13px;line-height:1.7;">26 August 2026 &middot; 11:00 AM – 5:00 PM<br/>Bolgatty Palace &amp; Island Resort, Kochi<br/>Present Booking ID <b style="color:#8A2A1B;">{doc['reference']}</b> or the QR code at the entrance.</p>
</td></tr>
<!-- Terms & Conditions -->
<tr><td style="padding:10px 36px 0;">
  <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
    <td style="width:50px;height:1px;background:#C9A227;"></td>
    <td style="color:#8A2A1B;font-size:12px;padding:0 10px;">&#10022;</td>
    <td style="width:50px;height:1px;background:#C9A227;"></td>
  </tr></table>
</td></tr>
<tr><td style="padding:18px 36px 26px;">
  {terms_block}
</td></tr>
<!-- Footer -->
<tr><td align="center" style="background:#6B1A0F;padding:18px 32px;">
  <p style="margin:0;color:#E8B54A;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Copyright 2026 RajaOnam &middot; Powered by Event Ticketing Solutions by <a href="https://berrysysglobal.com/" style="color:#F5D47E;text-decoration:underline;">Berrysys Media Global LLC</a></p>
</td></tr>
</table>
</td></tr></table>
</td></tr></table></body></html>"""


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


WHATSAPP_SERVICE_URL = os.environ.get("WHATSAPP_SERVICE_URL", "http://localhost:3001")

twilio_client = TwilioClient(
    os.environ["TWILIO_API_KEY_SID"],
    os.environ["TWILIO_API_KEY_SECRET"],
    os.environ["TWILIO_ACCOUNT_SID"],
)
TWILIO_FROM = os.environ["TWILIO_WHATSAPP_FROM"]


def normalize_phone(phone: str) -> str:
    digits = "".join(ch for ch in phone if ch.isdigit())
    if digits.startswith("00"):
        digits = digits[2:]
    if len(digits) == 10:
        digits = "91" + digits
    return digits


async def send_whatsapp_confirmation(doc, base_url):
    phone = normalize_phone(doc["phone"])
    qr_url = f"{base_url}api/bookings/{doc['reference']}/qr"
    ticket_url = f"{base_url}api/bookings/{doc['reference']}/ticket.pdf"
    caption = (
        f"🌸 *RAJAONAM 2026 — Booking Confirmed* 🌸\n\n"
        f"*Booking ID:* {doc['reference']}\n"
        f"*Name:* {doc['name']}\n"
        + (f"*Ticket Type:* {doc.get('ticket_type', 'VIP Guest')}\n" if doc.get("payment_mode") == "COMP" else "")
        + f"*Sea Food Sadhya:* {doc['adults']} Adults · {doc['kids_5_12']} Kids (5-12) · {doc['kids_below_5']} Below 5\n"
        f"*Veg Onam Sadhya:* {doc['veg_adults']} Adults · {doc['veg_kids_5_12']} Kids (5-12) · {doc['veg_kids_below_5']} Below 5\n"
        f"*Contests:* {', '.join(doc['contests']) or '—'}\n"
        f"*Games:* {', '.join(doc['games']) or '—'}\n"
        f"*Boating:* {doc['boating_slot'] + ' · ' + str(doc['boating_persons']) + ' persons' if doc['boating'] else '—'}\n"
        f"*Ticket:* {'VIP Ticket' if doc.get('payment_mode') == 'COMP' else '₹' + format(doc['total'], ',')}\n\n"
        f"26 Aug 2026 · 11 AM – 5 PM\nBolgatty Palace & Island Resort, Kochi\n\n"
        f"Show this QR at the gate."
    )
    try:
        to = f"whatsapp:+{phone}"
        m1 = twilio_client.messages.create(from_=TWILIO_FROM, to=to, body=caption, media_url=[qr_url])
        m2 = twilio_client.messages.create(from_=TWILIO_FROM, to=to, body=f"📄 Download your ticket (PDF): {ticket_url}")
        logger.info(f"WhatsApp to {to} for {doc['reference']}: {m1.sid} / {m2.sid}")
    except Exception as e:
        logger.error(f"WhatsApp send failed for {doc['reference']}: {e}")


@api_router.get("/bookings/{reference}")
async def get_booking(reference: str):
    doc = await db.bookings.find_one({"reference": reference}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Booking not found")
    return doc


JWT_ALGORITHM = "HS256"


def create_access_token(email: str, role: str) -> str:
    payload = {
        "sub": email,
        "role": role,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
    }
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)


async def _decode_token(request: Request):
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else None
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_admin(request: Request):
    payload = await _decode_token(request)
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return payload["sub"]


async def get_current_staff(request: Request):
    payload = await _decode_token(request)
    if payload.get("role") not in ("admin", "gate"):
        raise HTTPException(status_code=403, detail="Staff access required")
    return payload["sub"]


async def get_current_sponsor(request: Request):
    payload = await _decode_token(request)
    if payload.get("role") not in ("admin", "sponsor"):
        raise HTTPException(status_code=403, detail="Sponsor access required")
    return payload["sub"]


SPONSOR_ITEMS = [
    ("adults", "Sea Food Adult", "sea_price_adult"),
    ("kids_5_12", "Sea Food Kid (5-12)", "sea_price_kid"),
    ("veg_adults", "Veg Adult", "veg_price_adult"),
    ("veg_kids_5_12", "Veg Kid (5-12)", "veg_price_kid"),
]
SPONSOR_ITEM_LABELS = {k: l for k, l, _ in SPONSOR_ITEMS}


def sponsor_items(doc):
    redeemed = {}
    for r in doc.get("redemptions", []):
        redeemed[r["item"]] = redeemed.get(r["item"], 0) + r.get("qty", 0)
    items = []
    for key, label, price_key in SPONSOR_ITEMS:
        qty = doc.get(key, 0)
        if qty < 1:
            continue
        items.append({"key": key, "label": label, "qty": qty, "price": doc.get(price_key, 0), "redeemed": redeemed.get(key, 0)})
    return items


@api_router.get("/sponsor/booking/{reference}")
async def sponsor_get_booking(reference: str, staff: str = Depends(get_current_sponsor)):
    doc = await db.bookings.find_one({"reference": reference.upper()})
    if not doc:
        raise HTTPException(status_code=404, detail="Booking not found")
    if doc.get("payment_mode") == "COMP":
        return {"vip": True, "reference": doc["reference"], "name": doc["name"], "phone": doc["phone"], "items": []}
    if doc.get("status") != "confirmed":
        raise HTTPException(status_code=400, detail="Booking is not confirmed/paid yet")
    return {"vip": False, "reference": doc["reference"], "name": doc["name"], "phone": doc["phone"], "items": sponsor_items(doc)}


@api_router.get("/sponsor/redemptions")
async def sponsor_redemptions(staff: str = Depends(get_current_sponsor)):
    out = []
    async for b in db.bookings.find({"redemptions": {"$exists": True, "$ne": []}}):
        items = sponsor_items(b)
        remaining = [{"label": i["label"], "qty": i["qty"] - i["redeemed"]} for i in items if i["qty"] - i["redeemed"] > 0]
        out.append({
            "reference": b["reference"],
            "name": b.get("name"),
            "phone": b.get("phone"),
            "redemptions": b.get("redemptions", []),
            "remaining": remaining,
        })
    out.sort(key=lambda r: max((x.get("at") or "" for x in r["redemptions"]), default=""), reverse=True)
    return out


class RedeemRequest(BaseModel):
    reference: str
    items: Dict[str, int]


@api_router.post("/sponsor/redeem")
async def sponsor_redeem(input: RedeemRequest, staff: str = Depends(get_current_sponsor)):
    doc = await db.bookings.find_one({"reference": input.reference.upper()})
    if not doc:
        raise HTTPException(status_code=404, detail="Booking not found")
    if doc.get("payment_mode") == "COMP":
        raise HTTPException(status_code=400, detail="Complimentary VIP tickets are not eligible for sponsor offers")
    items = sponsor_items(doc)
    by_key = {i["key"]: i for i in items}
    now = datetime.now(timezone.utc).isoformat()
    for key, qty in input.items.items():
        if qty < 1:
            continue
        item = by_key.get(key)
        if not item:
            raise HTTPException(status_code=400, detail=f"Item {key} not on this ticket")
        if item["redeemed"] + qty > item["qty"]:
            raise HTTPException(status_code=400, detail=f"{item['label']} has only {item['qty'] - item['redeemed']} left to redeem")
        await db.bookings.update_one(
            {"reference": doc["reference"]},
            {"$push": {"redemptions": {"item": key, "label": item["label"], "qty": qty, "price": item["price"], "at": now, "by": staff}}},
        )
    updated = await db.bookings.find_one({"reference": doc["reference"]})
    return {"ok": True, "items": sponsor_items(updated)}


@api_router.get("/admin/sponsor-redemptions")
async def admin_sponsor_redemptions(admin: str = Depends(get_current_admin)):
    rows = []
    async for b in db.bookings.find({"redemptions": {"$exists": True, "$ne": []}}):
        for r in b.get("redemptions", []):
            rows.append({
                "reference": b["reference"],
                "name": b.get("name"),
                "phone": b.get("phone"),
                "item": r.get("label") or SPONSOR_ITEM_LABELS.get(r.get("item"), r.get("item")),
                "qty": r.get("qty", 0),
                "price": r.get("price", 0),
                "at": r.get("at"),
                "by": r.get("by"),
            })
    rows.sort(key=lambda r: r.get("at") or "", reverse=True)
    return rows


@api_router.get("/admin/whatsapp/status")
async def whatsapp_status(admin: str = Depends(get_current_admin)):
    return {"connected": True, "provider": "twilio", "sender": TWILIO_FROM.replace("whatsapp:", "")}


@api_router.get("/admin/website-qr")
async def website_qr(request: Request, admin: str = Depends(get_current_admin)):
    site_url = public_base(request).rstrip("/")
    img = qrcode.make(site_url, box_size=12, border=3)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return Response(content=buf.getvalue(), media_type="image/png")


@api_router.get("/admin/slot-report")
async def admin_slot_report(admin: str = Depends(get_current_admin)):
    cap = EVENT["sadhya_slot_capacity"]
    slots = {s: {"sea": 0, "veg": 0, "total": 0} for s in EVENT["sadhya_slots"]}
    boating = {s: 0 for s in EVENT["boating_slots"]}
    async for b in db.bookings.find({"status": "confirmed"}):
        slot = b.get("sea_slot") or b.get("veg_slot")
        if slot in slots:
            sea = b.get("adults", 0) + b.get("kids_5_12", 0) + b.get("kids_below_5", 0)
            veg = b.get("veg_adults", 0) + b.get("veg_kids_5_12", 0) + b.get("veg_kids_below_5", 0)
            slots[slot]["sea"] += sea
            slots[slot]["veg"] += veg
            slots[slot]["total"] += sea + veg
        if b.get("boating_slot") in boating:
            boating[b["boating_slot"]] += b.get("boating_persons", 0)
    return {"capacity": cap, "slots": slots, "boating": boating}


class DeleteBookingRequest(BaseModel):
    passcode: Optional[str] = None


@api_router.delete("/admin/bookings/{reference}")
async def delete_booking(reference: str, input: DeleteBookingRequest, admin: str = Depends(get_current_admin)):
    doc = await db.bookings.find_one({"reference": reference})
    if not doc:
        raise HTTPException(status_code=404, detail="Booking not found")
    if doc.get("status") == "pending_payment":
        await db.bookings.delete_one({"reference": reference})
        return {"deleted": reference}
    if doc.get("payment_mode") == "COMP":
        if (input.passcode or "").strip().upper() != os.environ.get("COMP_PASSCODE"):
            raise HTTPException(status_code=403, detail="Enter the organiser passcode to delete a complimentary booking")
        await db.bookings.delete_one({"reference": reference})
        return {"deleted": reference}
    if (input.passcode or "").strip().upper() != os.environ.get("BILLED_DELETE_PASSCODE"):
        raise HTTPException(status_code=403, detail="Enter the billed-delete passcode to delete a paid booking")
    await db.bookings.delete_one({"reference": reference})
    return {"deleted": reference}

@api_router.post("/admin/bookings/clear-unbilled")
async def clear_unbilled(admin: str = Depends(get_current_admin)):
    res = await db.bookings.delete_many({"status": "pending_payment"})
    return {"deleted": res.deleted_count}


@api_router.post("/admin/manual-booking")
async def create_manual_booking(input: BookingCreate, request: Request, admin: str = Depends(get_current_admin)):
    if (input.passcode or "").strip().upper() != os.environ.get("COMP_PASSCODE"):
        raise HTTPException(status_code=403, detail="Invalid passcode — complimentary tickets require the organiser passcode")
    if input.ticket_type not in TICKET_TYPES:
        raise HTTPException(status_code=400, detail="Invalid ticket type")
    await assign_sadhya_slots(input)
    if input.adults + input.veg_adults < 1:
        raise HTTPException(status_code=400, detail="At least 1 adult required")
    input.payment_mode = "COMP"
    doc = build_booking_doc(input, new_reference(), 0, "confirmed", "comp")
    await db.bookings.insert_one(doc)
    doc.pop("_id", None)
    asyncio.create_task(send_confirmation_email(doc, public_base(request)))
    asyncio.create_task(send_whatsapp_confirmation(doc, public_base(request)))
    return doc


@api_router.get("/admin/whatsapp/qr-image")
async def whatsapp_qr_image(admin: str = Depends(get_current_admin)):
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{WHATSAPP_SERVICE_URL}/qr")
        qr = resp.json().get("qr")
    except Exception:
        qr = None
    if not qr:
        raise HTTPException(status_code=404, detail="No pairing QR available — already connected or service starting")
    return Response(content=make_qr_png(qr), media_type="image/png")


class AdminLogin(BaseModel):
    email: EmailStr
    password: str


@api_router.post("/auth/login")
async def admin_login(input: AdminLogin):
    email = input.email.lower()
    user = await db.users.find_one({"email": email, "role": {"$in": ["admin", "gate", "sponsor"]}})
    if not user or not bcrypt.checkpw(input.password.encode("utf-8"), user["password_hash"].encode("utf-8")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    role = user.get("role", "admin")
    return {"token": create_access_token(email, role), "email": email, "role": role}


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
async def checkin_booking(reference: str, input: CheckinUpdate, admin: str = Depends(get_current_staff)):
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
    rows = await db.bookings.find({"status": "confirmed"}, {"_id": 0}).sort("created_at", -1).to_list(10000)
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
    for env_email, env_pass, role in [("ADMIN_EMAIL", "ADMIN_PASSWORD", "admin"), ("GATE_EMAIL", "GATE_PASSWORD", "gate"), ("SPONSOR_EMAIL", "SPONSOR_PASSWORD", "sponsor")]:
        email = os.environ[env_email].lower()
        password = os.environ[env_pass]
        existing = await db.users.find_one({"email": email})
        if existing is None:
            hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            await db.users.insert_one({
                "email": email,
                "password_hash": hashed,
                "role": role,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            logger.info(f"{role} user seeded: {email}")
        elif not bcrypt.checkpw(password.encode("utf-8"), existing["password_hash"].encode("utf-8")):
            hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            await db.users.update_one({"email": email}, {"$set": {"password_hash": hashed, "role": role}})
            logger.info(f"{role} password updated: {email}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
