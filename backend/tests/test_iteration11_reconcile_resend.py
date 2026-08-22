"""
Iteration 11 — Admin reconcile + resend-ticket endpoints (v79)
Covers: POST /api/admin/bookings/{ref}/reconcile, POST /api/admin/bookings/{ref}/resend-ticket
Regression: GET /api/admin/sponsor-redemptions, GET /api/admin/bookings, POST /api/payments/order
"""
import os
import re
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"
COMP_PASSCODE = "PRIME26"


@pytest.fixture(scope="session")
def creds():
    content = Path("/app/memory/test_credentials.md").read_text(encoding="utf-8")
    email = re.search(r"(?im)^\s*[-*]?\s*Email:\s*(\S+)", content).group(1)
    password = re.search(r"(?im)^\s*[-*]?\s*Password:\s*(\S+)", content).group(1)
    return {"email": email, "password": password}


@pytest.fixture(scope="session")
def anon():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def client(anon, creds):
    r = anon.post(f"{API}/auth/login", json=creds, timeout=30)
    if r.status_code != 200:
        pytest.fail(f"Admin login failed {r.status_code}: {r.text[:300]}")
    token = r.json().get("token")
    assert token, "no token in login response"
    assert r.json().get("role") == "admin"
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {token}"})
    return s


@pytest.fixture(scope="session")
def created():
    return []


@pytest.fixture(scope="session", autouse=True)
def cleanup(client, created):
    yield
    for ref, passcode in created:
        r = client.request("DELETE", f"{API}/admin/bookings/{ref}", json={"passcode": passcode}, timeout=30)
        print(f"cleanup {ref}: {r.status_code} {r.text[:120]}")


def _payload(name):
    return {
        "name": name,
        "phone": "9000000001",
        "email": "qa.reconcile@example.com",
        "adults": 1,
        "kids_5_12": 0,
        "kids_below_5": 0,
        "veg_adults": 0,
        "contests": [],
        "games": [],
        "boating": False,
        "payment_mode": "Online (Razorpay)",
        "ticket_type": "VIP Guest",
    }


@pytest.fixture(scope="session")
def comp_booking(client, created):
    """Confirmed complimentary booking (no razorpay_order_id)."""
    body = _payload("TEST_ Comp Recon")
    body["payment_mode"] = "COMP"
    body["passcode"] = COMP_PASSCODE
    r = client.post(f"{API}/admin/manual-booking", json=body, timeout=60)
    assert r.status_code == 200, f"manual-booking failed {r.status_code}: {r.text[:400]}"
    doc = r.json()
    assert "_id" not in doc
    assert doc["status"] == "confirmed"
    assert not doc.get("razorpay_order_id")
    created.append((doc["reference"], COMP_PASSCODE))
    return doc


@pytest.fixture(scope="session")
def pending_booking(client, created):
    """Pending_payment booking with a real razorpay_order_id (payment NOT completed)."""
    r = requests.post(f"{API}/payments/order", json=_payload("TEST_ Pending Recon"), timeout=60)
    assert r.status_code == 200, f"payments/order failed {r.status_code}: {r.text[:400]}"
    data = r.json()
    for k in ("order_id", "amount", "key_id", "reference"):
        assert k in data, f"missing {k} in payments/order response"
    assert data["order_id"].startswith("order_")
    assert isinstance(data["amount"], int) and data["amount"] > 0
    created.append((data["reference"], None))
    return data


# ---------- reconcile ----------
class TestReconcile:
    def test_reconcile_requires_auth(self, anon):
        r = anon.post(f"{API}/admin/bookings/EO-NOPE01/reconcile", timeout=30)
        assert r.status_code == 401, f"expected 401, got {r.status_code}: {r.text[:200]}"

    def test_reconcile_not_found(self, client):
        r = client.post(f"{API}/admin/bookings/EO-ZZZZZZ/reconcile", timeout=30)
        assert r.status_code == 404, r.text[:300]
        assert r.json()["detail"] == "Booking not found"

    def test_reconcile_no_razorpay_order(self, client, comp_booking):
        r = client.post(f"{API}/admin/bookings/{comp_booking['reference']}/reconcile", timeout=60)
        assert r.status_code == 400, r.text[:300]
        assert "No Razorpay order attached" in r.json()["detail"]

    def test_reconcile_pending_no_captured_payment(self, client, pending_booking):
        ref = pending_booking["reference"]
        r = client.post(f"{API}/admin/bookings/{ref}/reconcile", timeout=90)
        assert r.status_code == 200, f"{r.status_code}: {r.text[:400]}"
        data = r.json()
        assert data["ok"] is False
        assert data["reference"] == ref
        assert data["status"] == "pending_payment"
        assert data["razorpay_payments"] == []
        assert "No captured/authorized payment found" in data["message"]

        # booking must remain pending in DB
        rows = client.get(f"{API}/admin/bookings", timeout=60).json()
        row = next(b for b in rows if b["reference"] == ref)
        assert row["status"] == "pending_payment"
        assert row.get("razorpay_payment_id") in (None, "")
        assert row.get("razorpay_order_id") == pending_booking["order_id"]

    def test_reconcile_lowercase_reference_resolves(self, client, comp_booking):
        # reference lookup is upper-cased server side -> should hit the 400 path, not 404
        r = client.post(f"{API}/admin/bookings/{comp_booking['reference'].lower()}/reconcile", timeout=60)
        assert r.status_code == 400, r.text[:300]


# ---------- resend-ticket ----------
class TestResendTicket:
    def test_resend_requires_auth(self, anon):
        r = anon.post(f"{API}/admin/bookings/EO-NOPE01/resend-ticket", timeout=30)
        assert r.status_code == 401, f"expected 401, got {r.status_code}: {r.text[:200]}"

    def test_resend_not_found(self, client):
        r = client.post(f"{API}/admin/bookings/EO-ZZZZZZ/resend-ticket", timeout=30)
        assert r.status_code == 404, r.text[:300]
        assert r.json()["detail"] == "Booking not found"

    def test_resend_pending_rejected(self, client, pending_booking):
        r = client.post(f"{API}/admin/bookings/{pending_booking['reference']}/resend-ticket", timeout=60)
        assert r.status_code == 400, r.text[:300]
        assert "Only confirmed bookings can have tickets resent" in r.json()["detail"]

    def test_resend_confirmed_ok(self, client, comp_booking):
        ref = comp_booking["reference"]
        r = client.post(f"{API}/admin/bookings/{ref}/resend-ticket", timeout=90)
        assert r.status_code == 200, f"{r.status_code}: {r.text[:400]}"
        data = r.json()
        assert data["ok"] is True
        assert data["reference"] == ref
        assert data["message"] == "Ticket resent via email and WhatsApp"

        # status untouched
        rows = client.get(f"{API}/admin/bookings", timeout=60).json()
        row = next(b for b in rows if b["reference"] == ref)
        assert row["status"] == "confirmed"


# ---------- regressions ----------
class TestRegressions:
    def test_sponsor_redemptions_shape(self, client):
        r = client.get(f"{API}/admin/sponsor-redemptions", timeout=60)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert isinstance(data, dict)
        assert "rows" in data and isinstance(data["rows"], list)
        assert "totals" in data
        assert "_id" not in str(data)

    def test_admin_bookings_fields(self, client, pending_booking):
        r = client.get(f"{API}/admin/bookings", timeout=60)
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list) and len(rows) > 0
        assert all("_id" not in b for b in rows)
        row = next(b for b in rows if b["reference"] == pending_booking["reference"])
        assert "status" in row and "razorpay_order_id" in row

    def test_admin_bookings_requires_auth(self, anon):
        r = anon.get(f"{API}/admin/bookings", timeout=30)
        assert r.status_code == 401
