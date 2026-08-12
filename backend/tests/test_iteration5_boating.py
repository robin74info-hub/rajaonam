"""Iteration 5: verify new 45-min boating slots + Sea Food adults default=0."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL") or open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].splitlines()[0].strip()
BASE_URL = BASE_URL.rstrip("/")

NEW_SLOTS = [
    "11:00 AM \u2013 11:45 AM",
    "12:00 PM \u2013 12:45 PM",
    "1:00 PM \u2013 1:45 PM",
    "2:00 PM \u2013 2:45 PM",
    "3:00 PM \u2013 3:45 PM",
    "4:00 PM \u2013 4:45 PM",
]
OLD_SLOT = "12:00 PM \u2013 1:00 PM"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@rajaonam.com", "password": "RajaOnam@2026"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


def test_event_returns_new_boating_slots():
    r = requests.get(f"{BASE_URL}/api/event")
    assert r.status_code == 200
    slots = r.json().get("boating_slots")
    assert slots == NEW_SLOTS, f"got {slots}"


def test_booking_old_slot_rejected():
    payload = {
        "name": "TEST Iter5 Old",
        "phone": "9999999999",
        "email": "delivered@resend.dev",
        "adults": 1,
        "boating": True,
        "boating_slot": OLD_SLOT,
        "boating_persons": 1,
        "payment_mode": "UPI",
    }
    r = requests.post(f"{BASE_URL}/api/bookings", json=payload)
    assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text}"


def test_booking_new_slot_success_and_cleanup(admin_token):
    payload = {
        "name": "TEST Iter5 New",
        "phone": "9999999999",
        "email": "delivered@resend.dev",
        "adults": 1,
        "boating": True,
        "boating_slot": NEW_SLOTS[0],
        "boating_persons": 1,
        "payment_mode": "UPI",
    }
    r = requests.post(f"{BASE_URL}/api/bookings", json=payload)
    assert r.status_code in (200, 201), r.text
    body = r.json()
    ref = body.get("reference") or body.get("booking", {}).get("reference")
    assert ref, f"no reference in {body}"
    # cleanup
    d = requests.request(
        "DELETE",
        f"{BASE_URL}/api/admin/bookings/{ref}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"passcode": "ONAM26"},
    )
    assert d.status_code in (200, 204), f"cleanup failed: {d.status_code} {d.text}"


def test_slot_report_uses_new_slots(admin_token):
    r = requests.get(f"{BASE_URL}/api/admin/slot-report", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200, r.text
    data = r.json()
    boating = data.get("boating") or {}
    keys = list(boating.keys())
    assert set(keys) == set(NEW_SLOTS), f"got {keys}"
