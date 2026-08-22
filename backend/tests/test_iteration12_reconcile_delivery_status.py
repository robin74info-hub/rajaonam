"""
Iteration 12 — reconcile/resend delivery-status response shape + resend_log + regressions
Covers:
  POST /api/admin/bookings/{ref}/reconcile   (captured-only wording, ok:false shape)
  POST /api/admin/bookings/{ref}/resend-ticket (email_sent/email_error/whatsapp_sent/whatsapp_error, resend_log)
Regression:
  POST /api/payments/verify (bad signature -> 400)
  POST /api/admin/manual-booking (tuple-returning helpers must not break fire-and-forget callers)
Static review: amount-mismatch guard in reconcile_booking
"""
import os
import re
import time
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
DELIVERABLE_EMAIL = "delivered@resend.dev"


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
        body = {"passcode": passcode} if passcode else {}
        r = client.request("DELETE", f"{API}/admin/bookings/{ref}", json=body, timeout=30)
        print(f"cleanup {ref}: {r.status_code} {r.text[:120]}")


def _payload(name, email="qa.iter12@example.com"):
    return {
        "name": name,
        "phone": "9000000012",
        "email": email,
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
    """Confirmed COMP booking with a deliverable email address."""
    body = _payload("TEST_ Iter12 Comp", DELIVERABLE_EMAIL)
    body["payment_mode"] = "COMP"
    body["passcode"] = COMP_PASSCODE
    r = client.post(f"{API}/admin/manual-booking", json=body, timeout=90)
    assert r.status_code == 200, f"manual-booking failed {r.status_code}: {r.text[:500]}"
    doc = r.json()
    assert "_id" not in doc
    assert doc["status"] == "confirmed"
    assert doc["email"] == DELIVERABLE_EMAIL
    created.append((doc["reference"], COMP_PASSCODE))
    return doc


@pytest.fixture(scope="session")
def pending_booking(client, created):
    r = requests.post(f"{API}/payments/order", json=_payload("TEST_ Iter12 Pending"), timeout=90)
    assert r.status_code == 200, f"payments/order failed {r.status_code}: {r.text[:500]}"
    data = r.json()
    assert data["order_id"].startswith("order_")
    created.append((data["reference"], None))
    return data


def _get_row(client, ref):
    rows = client.get(f"{API}/admin/bookings", timeout=90).json()
    return next((b for b in rows if b["reference"] == ref), None)


# ---------- reconcile ----------
class TestReconcileShape:
    def test_reconcile_no_captured_payment_wording_and_shape(self, client, pending_booking):
        ref = pending_booking["reference"]
        r = client.post(f"{API}/admin/bookings/{ref}/reconcile", timeout=120)
        assert r.status_code == 200, f"{r.status_code}: {r.text[:500]}"
        data = r.json()
        assert data["ok"] is False
        assert data["reference"] == ref
        assert data["status"] == "pending_payment"
        assert data["razorpay_payments"] == []
        # wording changed: must mention 'captured' and must NOT mention 'authorized'
        assert "No captured payment found" in data["message"], data["message"]
        assert "authorized" not in data["message"].lower(), data["message"]

    def test_booking_stays_pending_after_failed_reconcile(self, client, pending_booking):
        row = _get_row(client, pending_booking["reference"])
        assert row is not None
        assert row["status"] == "pending_payment"
        assert not row.get("razorpay_payment_id")
        assert not row.get("paid_at")

    def test_reconcile_comp_booking_no_order(self, client, comp_booking):
        r = client.post(f"{API}/admin/bookings/{comp_booking['reference']}/reconcile", timeout=90)
        assert r.status_code == 400, r.text[:300]
        assert "No Razorpay order attached" in r.json()["detail"]


class TestReconcileStaticReview:
    """Amount-mismatch guard cannot be triggered without a real captured payment."""

    def test_amount_mismatch_branch_exists(self):
        src = Path("/app/backend/server.py").read_text(encoding="utf-8")
        start = src.index("async def reconcile_booking")
        end = src.index("async def resend_ticket")
        block = src[start:end]
        assert "expected_amount" in block
        assert "Amount mismatch" in block
        assert 'p.get("status") == "captured"' in block
        assert '"authorized"' not in block
        assert "await send_confirmation_email" in block
        assert "await send_whatsapp_confirmation" in block
        assert '"email_sent"' in block and '"whatsapp_sent"' in block


# ---------- resend-ticket ----------
class TestResendTicket:
    def test_resend_returns_delivery_status(self, client, comp_booking):
        ref = comp_booking["reference"]
        r = client.post(f"{API}/admin/bookings/{ref}/resend-ticket", timeout=180)
        assert r.status_code == 200, f"{r.status_code}: {r.text[:500]}"
        data = r.json()
        assert data["ok"] is True
        assert data["reference"] == ref
        for key in ("email_sent", "whatsapp_sent"):
            assert key in data, f"missing {key}"
            assert isinstance(data[key], bool), f"{key} not bool: {data[key]!r}"
        for key in ("email_error", "whatsapp_error"):
            assert key in data, f"missing {key}"
            assert data[key] is None or isinstance(data[key], str)
        # deliverable address -> email must succeed
        assert data["email_sent"] is True, f"email failed: {data.get('email_error')}"
        if data["email_sent"]:
            assert data["email_error"] is None
        if not data["whatsapp_sent"]:
            assert data["whatsapp_error"], "whatsapp_sent false but no error string"
        print(f"resend result: {data}")

    def test_resend_log_appended(self, client, comp_booking):
        ref = comp_booking["reference"]
        before = _get_row(client, ref).get("resend_log") or []
        r = client.post(f"{API}/admin/bookings/{ref}/resend-ticket", timeout=180)
        assert r.status_code == 200, r.text[:400]
        time.sleep(1)
        after = _get_row(client, ref).get("resend_log") or []
        assert len(after) == len(before) + 1, f"resend_log did not grow: {len(before)} -> {len(after)}"
        entry = after[-1]
        for key in ("by", "at", "email_sent", "whatsapp_sent"):
            assert key in entry, f"resend_log entry missing {key}: {entry}"
        assert isinstance(entry["email_sent"], bool)
        assert isinstance(entry["whatsapp_sent"], bool)
        assert "@" in entry["by"]

    def test_resend_pending_rejected(self, client, pending_booking):
        r = client.post(f"{API}/admin/bookings/{pending_booking['reference']}/resend-ticket", timeout=90)
        assert r.status_code == 400, r.text[:300]
        assert "Only confirmed bookings" in r.json()["detail"]

    def test_resend_requires_auth(self, anon):
        r = anon.post(f"{API}/admin/bookings/EO-NOPE01/resend-ticket", timeout=30)
        assert r.status_code == 401


# ---------- regressions ----------
class TestRegressions:
    def test_verify_bad_signature(self, anon, pending_booking):
        r = anon.post(f"{API}/payments/verify", json={
            "razorpay_order_id": pending_booking["order_id"],
            "razorpay_payment_id": "pay_TESTINVALID123",
            "razorpay_signature": "deadbeef" * 8,
        }, timeout=60)
        assert r.status_code == 400, f"{r.status_code}: {r.text[:400]}"
        assert r.json()["detail"] == "Payment verification failed"

    def test_verify_bad_signature_did_not_confirm(self, client, pending_booking):
        row = _get_row(client, pending_booking["reference"])
        assert row["status"] == "pending_payment"

    def test_manual_booking_still_works_with_tuple_helpers(self, client, created):
        body = _payload("TEST_ Iter12 Regression Comp", DELIVERABLE_EMAIL)
        body["payment_mode"] = "COMP"
        body["passcode"] = COMP_PASSCODE
        r = client.post(f"{API}/admin/manual-booking", json=body, timeout=120)
        assert r.status_code == 200, f"{r.status_code}: {r.text[:500]}"
        doc = r.json()
        created.append((doc["reference"], COMP_PASSCODE))
        assert doc["status"] == "confirmed"
        assert doc["payment_mode"] == "COMP"
        assert doc["total"] == 0
        assert "_id" not in doc
        # persisted
        time.sleep(3)
        row = _get_row(client, doc["reference"])
        assert row is not None and row["status"] == "confirmed"
        # fire-and-forget send task must have run without raising
        log = Path("/var/log/supervisor")
        combined = ""
        for f in log.glob("backend*.log"):
            try:
                combined += f.read_text(errors="ignore")[-200000:]
            except Exception:
                pass
        assert doc["reference"] in combined, "no backend log line for created reference"
        ref_lines = [ln for ln in combined.splitlines() if doc["reference"] in ln]
        print("\n".join(ref_lines[-15:]))
        assert any("Confirmation email" in ln or "WhatsApp" in ln for ln in ref_lines), \
            "no email/WhatsApp send log line for manual booking (fire-and-forget may be broken)"

    def test_manual_booking_bad_passcode(self, client):
        body = _payload("TEST_ Iter12 BadPass")
        body["payment_mode"] = "COMP"
        body["passcode"] = "WRONG"
        r = client.post(f"{API}/admin/manual-booking", json=body, timeout=60)
        assert r.status_code == 403
        assert "Invalid passcode" in r.json()["detail"]

    def test_admin_bookings_no_objectid(self, client):
        r = client.get(f"{API}/admin/bookings", timeout=90)
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list)
        assert all("_id" not in b for b in rows)
