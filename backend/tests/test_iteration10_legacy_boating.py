"""Iteration 10 — Legacy boating slot in slot-report and edit endpoint."""
import os
import uuid
import pytest
import requests
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else "https://event-slots-hub.preview.emergentagent.com"
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

LEGACY_SLOT = "2:30 PM – 3:30 PM"  # en-dash
NEW_SLOT = "2:00 PM – 2:45 PM"
REF = "EO-LEGCY1"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@rajaonam.com", "password": "RajaOnam@2026"
    }, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module", autouse=True)
def seed_and_cleanup():
    # Insert legacy booking directly via pymongo
    from pymongo import MongoClient
    c = MongoClient(MONGO_URL)
    db = c[DB_NAME]
    db.bookings.delete_many({"reference": REF})
    doc = {
        "id": str(uuid.uuid4()),
        "reference": REF,
        "name": "TEST Legacy Boating",
        "phone": "+919000000000",
        "email": "delivered@resend.dev",
        "adults": 2, "kids_5_12": 0, "kids_below_5": 0,
        "veg_adults": 0, "veg_kids_5_12": 0, "veg_kids_below_5": 0,
        "total_participants": 2,
        "contests": [], "games": [],
        "boating": True,
        "boating_slot": LEGACY_SLOT,
        "boating_persons": 3,
        "sea_slot": "11:30 AM – 12:30 PM",
        "veg_slot": None,
        "sea_price_adult": 2999, "sea_price_kid": 1399,
        "veg_price_adult": 2699, "veg_price_kid": 1199,
        "total": 5998,
        "currency_symbol": "₹",
        "status": "confirmed",
        "payment": "mock",
        "payment_mode": "UPI",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    db.bookings.insert_one(doc)
    yield
    db.bookings.delete_many({"reference": REF})
    c.close()


class TestLegacyBoating:
    def test_slot_report_includes_legacy(self, headers):
        r = requests.get(f"{BASE_URL}/api/admin/slot-report", headers=headers, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        boating = data["boating"]
        assert LEGACY_SLOT in boating, f"legacy slot missing. keys={list(boating.keys())}"
        assert boating[LEGACY_SLOT] >= 3, f"expected >=3, got {boating[LEGACY_SLOT]}"

    def test_slots_availability_includes_legacy(self):
        r = requests.get(f"{BASE_URL}/api/slots/availability", timeout=15)
        assert r.status_code == 200
        assert LEGACY_SLOT in r.json()["boating"]

    def test_edit_wrong_passcode_403(self, headers):
        r = requests.post(f"{BASE_URL}/api/admin/bookings/{REF}/slots",
                          headers=headers,
                          json={"passcode": "WRONG", "boating_slot": NEW_SLOT}, timeout=15)
        assert r.status_code == 403

    def test_edit_only_boating_field_succeeds(self, headers):
        # Send ONLY boating_slot (sadhya untouched) — this is what fixed frontend does
        r = requests.post(f"{BASE_URL}/api/admin/bookings/{REF}/slots",
                          headers=headers,
                          json={"passcode": "ONAM26", "boating_slot": NEW_SLOT}, timeout=15)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["boating_slot"] == NEW_SLOT

    def test_slot_report_after_edit(self, headers):
        r = requests.get(f"{BASE_URL}/api/admin/slot-report", headers=headers, timeout=15)
        boating = r.json()["boating"]
        assert boating.get(NEW_SLOT, 0) >= 3
        # legacy slot should now be 0 (or absent from EVENT list, but might be 0)
        assert boating.get(LEGACY_SLOT, 0) == 0

    def test_edit_invalid_boating_slot_400(self, headers):
        r = requests.post(f"{BASE_URL}/api/admin/bookings/{REF}/slots",
                          headers=headers,
                          json={"passcode": "ONAM26", "boating_slot": "9:00 PM – 10:00 PM"}, timeout=15)
        assert r.status_code == 400
