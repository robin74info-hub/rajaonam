"""Iteration 6: Sadhya/boating clash rules + boating slot capacity (150) enforcement."""
import os
import pytest
import requests
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import uuid
from datetime import datetime, timezone

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL") or open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].splitlines()[0].strip()
BASE_URL = BASE_URL.rstrip("/")

MONGO_URL = open("/app/backend/.env").read().split("MONGO_URL=")[1].splitlines()[0].strip().strip('"')
DB_NAME = open("/app/backend/.env").read().split("DB_NAME=")[1].splitlines()[0].strip().strip('"')

BOAT_11 = "11:00 AM \u2013 11:45 AM"
BOAT_12 = "12:00 PM \u2013 12:45 PM"
BOAT_1  = "1:00 PM \u2013 1:45 PM"
BOAT_2  = "2:00 PM \u2013 2:45 PM"

S_1130 = "11:30 AM \u2013 12:30 PM"
S_1230 = "12:30 PM \u2013 1:30 PM"
S_130  = "1:30 PM \u2013 2:30 PM"
S_230  = "2:30 PM \u2013 3:30 PM"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": "admin@rajaonam.com", "password": "RajaOnam@2026"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _delete_confirmed(ref, admin_token):
    return requests.request("DELETE", f"{BASE_URL}/api/admin/bookings/{ref}",
                            headers={"Authorization": f"Bearer {admin_token}"},
                            json={"passcode": "ONAM26"})


def _create_booking(boating_slot, boating_persons=1, adults=1):
    payload = {
        "name": "TEST Iter6",
        "phone": "9999999999",
        "email": "delivered@resend.dev",
        "adults": adults,
        "boating": True,
        "boating_slot": boating_slot,
        "boating_persons": boating_persons,
        "payment_mode": "UPI",
    }
    return requests.post(f"{BASE_URL}/api/bookings", json=payload)


# ---------- Regression ----------
def test_event_returns_six_boating_slots():
    r = requests.get(f"{BASE_URL}/api/event")
    assert r.status_code == 200
    slots = r.json().get("boating_slots")
    assert len(slots) == 6
    assert slots[0] == BOAT_11 and slots[-1] == "4:00 PM \u2013 4:45 PM"


def test_availability_has_boating_and_capacity():
    r = requests.get(f"{BASE_URL}/api/slots/availability")
    assert r.status_code == 200
    data = r.json()
    assert "boating" in data and isinstance(data["boating"], dict)
    assert data.get("boating_capacity") == 150
    assert len(data["boating"]) == 6


# ---------- Clash rules ----------
def test_clash_boating_11_assigns_1230_or_later(admin_token):
    r = _create_booking(BOAT_11)
    assert r.status_code == 200, r.text
    body = r.json()
    ref = body["reference"]
    try:
        assert body["sea_slot"] in (S_1230, S_130, S_230), f"got {body['sea_slot']}"
        # per spec: earliest allowed is 12:30
        assert body["sea_slot"] == S_1230
    finally:
        d = _delete_confirmed(ref, admin_token)
        assert d.status_code in (200, 204), d.text


def test_clash_boating_2pm_assigns_1130_or_1230(admin_token):
    r = _create_booking(BOAT_2)
    assert r.status_code == 200, r.text
    body = r.json()
    ref = body["reference"]
    try:
        assert body["sea_slot"] in (S_1130, S_1230), f"got {body['sea_slot']}"
        # earliest compatible = 11:30
        assert body["sea_slot"] == S_1130
    finally:
        d = _delete_confirmed(ref, admin_token)
        assert d.status_code in (200, 204), d.text


def test_clash_boating_1pm_assigns_1130_or_230(admin_token):
    r = _create_booking(BOAT_1)
    assert r.status_code == 200, r.text
    body = r.json()
    ref = body["reference"]
    try:
        assert body["sea_slot"] in (S_1130, S_230), f"got {body['sea_slot']}"
        assert body["sea_slot"] == S_1130
    finally:
        d = _delete_confirmed(ref, admin_token)
        assert d.status_code in (200, 204), d.text


# ---------- Boating capacity (150) ----------
@pytest.mark.asyncio
async def test_boating_slot_full_rejects_and_partial_accepts(admin_token):
    # Seed a confirmed booking with 145 boating persons directly in Mongo on 12:00 slot
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    seed_ref = "TEST-SEED-B12"
    seed_doc = {
        "id": str(uuid.uuid4()),
        "reference": seed_ref,
        "name": "TEST Seed Boating",
        "phone": "9999999999",
        "email": "delivered@resend.dev",
        "adults": 1, "kids_5_12": 0, "kids_below_5": 0,
        "veg_adults": 0, "veg_kids_5_12": 0, "veg_kids_below_5": 0,
        "total_participants": 1,
        "boating": True,
        "boating_slot": BOAT_12,
        "boating_persons": 145,
        "sea_slot": None, "veg_slot": None,
        "total": 0,
        "status": "confirmed",
        "payment": "seed",
        "payment_mode": "UPI",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.bookings.insert_one(seed_doc)
    try:
        # 145 + 10 = 155 > 150 => must fail
        r_full = _create_booking(BOAT_12, boating_persons=10)
        assert r_full.status_code == 400, f"expected 400, got {r_full.status_code}: {r_full.text}"
        assert "full" in r_full.text.lower() or "boating slot" in r_full.text.lower()

        # 145 + 5 = 150 => must succeed
        r_ok = _create_booking(BOAT_12, boating_persons=5)
        assert r_ok.status_code == 200, r_ok.text
        ref_ok = r_ok.json()["reference"]
        d = _delete_confirmed(ref_ok, admin_token)
        assert d.status_code in (200, 204), d.text
    finally:
        # Cleanup seed
        await db.bookings.delete_one({"reference": seed_ref})
        client.close()


# ---------- Final cleanup guard ----------
def test_final_bookings_collection_empty(admin_token):
    # Clear any pending_payment bookings then verify empty
    requests.post(f"{BASE_URL}/api/admin/bookings/clear-unbilled",
                  headers={"Authorization": f"Bearer {admin_token}"})
    r = requests.get(f"{BASE_URL}/api/admin/bookings",
                     headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200, r.text
    bookings = r.json()
    if isinstance(bookings, dict):
        bookings = bookings.get("bookings", [])
    assert bookings == [] or len(bookings) == 0, f"bookings not empty: {bookings}"
