"""
Iteration 13 — Razorpay payment.captured webhook (POST /api/payments/webhook)
Covers: signature verification, event filtering, invalid JSON, booking lookup
(order_id + notes.reference fallback), amount guard, confirm + idempotency.
Regression: /api/payments/verify bad signature, /api/admin/bookings shape,
/api/admin/bookings/{ref}/reconcile response fields.
"""
import hashlib
import hmac
import json
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

backend_env = dotenv_values("/app/backend/.env")
WEBHOOK_SECRET = backend_env.get("RAZORPAY_WEBHOOK_SECRET")
if not WEBHOOK_SECRET:
    raise RuntimeError("RAZORPAY_WEBHOOK_SECRET missing in /app/backend/.env")
BILLED_PASSCODE = backend_env.get("BILLED_DELETE_PASSCODE") or "ONAM26"
COMP_PASSCODE = backend_env.get("COMP_PASSCODE") or "PRIME26"
UA = {"User-Agent": "Razorpay-Test"}


# ---------- fixtures ----------
@pytest.fixture(scope="session")
def creds():
    content = Path("/app/memory/test_credentials.md").read_text(encoding="utf-8")
    email = re.search(r"(?im)^\s*[-*]?\s*Email:\s*(\S+)", content).group(1)
    password = re.search(r"(?im)^\s*[-*]?\s*Password:\s*(\S+)", content).group(1)
    return {"email": email, "password": password}


@pytest.fixture(scope="session")
def anon():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", **UA})
    return s


@pytest.fixture(scope="session")
def client(anon, creds):
    r = anon.post(f"{API}/auth/login", json=creds, timeout=30)
    if r.status_code != 200:
        pytest.fail(f"Admin login failed {r.status_code}: {r.text[:300]}")
    token = r.json().get("token")
    assert token, "no token in login response"
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {token}", **UA})
    return s


@pytest.fixture(scope="session")
def created():
    return []


@pytest.fixture(scope="session", autouse=True)
def cleanup(client, created):
    yield
    for ref in created:
        for pc in (None, COMP_PASSCODE, BILLED_PASSCODE):
            body = {"passcode": pc} if pc else {}
            r = client.request("DELETE", f"{API}/admin/bookings/{ref}", json=body, timeout=30)
            print(f"cleanup {ref} pc={pc}: {r.status_code} {r.text[:100]}")
            if r.status_code in (200, 404):
                break


# ---------- helpers ----------
def _booking_payload(name, email="qa.iter13@example.com"):
    return {
        "name": name,
        "phone": "9000000013",
        "email": email,
        "adults": 1,
        "kids_5_12": 0,
        "kids_below_5": 0,
        "veg_adults": 0,
        "veg_kids_5_12": 0,
        "veg_kids_below_5": 0,
        "contests": [],
        "games": [],
        "boating": False,
        "payment_mode": "Online (Razorpay)",
    }


def _sign(raw: bytes) -> str:
    return hmac.new(WEBHOOK_SECRET.encode(), raw, hashlib.sha256).hexdigest()


def _post_webhook(anon, payload_obj=None, raw=None, signature=None, headers=None):
    raw_body = raw if raw is not None else json.dumps(payload_obj).encode()
    hdrs = {"Content-Type": "application/json", **UA}
    if headers:
        hdrs.update(headers)
    if signature != "OMIT":
        hdrs["X-Razorpay-Signature"] = signature if signature else _sign(raw_body)
    return requests.post(f"{API}/payments/webhook", data=raw_body, headers=hdrs, timeout=60)


def _captured_event(payment_id, order_id, amount, reference=None):
    return {
        "event": "payment.captured",
        "payload": {"payment": {"entity": {
            "id": payment_id,
            "order_id": order_id,
            "amount": amount,
            "notes": {"reference": reference} if reference else {},
        }}},
    }


def _make_pending(anon, created, name):
    r = anon.post(f"{API}/payments/order", json=_booking_payload(name), timeout=60)
    assert r.status_code == 200, f"payments/order failed {r.status_code}: {r.text[:300]}"
    data = r.json()
    created.append(data["reference"])
    return data  # order_id, amount(paise), reference


def _admin_booking(client, ref):
    r = client.get(f"{API}/admin/bookings", timeout=60)
    assert r.status_code == 200, r.text[:200]
    items = r.json()
    items = items.get("bookings", items) if isinstance(items, dict) else items
    return next((b for b in items if b.get("reference") == ref), None)


# ---------- signature / event / payload validation ----------
class TestWebhookValidation:
    def test_invalid_signature(self, anon):
        r = _post_webhook(anon, _captured_event("pay_BAD", "order_BAD", 100), signature="deadbeef")
        assert r.status_code == 400, r.text[:300]
        assert "Invalid webhook signature" in r.text

    def test_missing_signature_header(self, anon):
        r = _post_webhook(anon, _captured_event("pay_BAD", "order_BAD", 100), signature="OMIT")
        assert r.status_code == 400, r.text[:300]
        assert "Invalid webhook signature" in r.text

    @pytest.mark.parametrize("event", ["payment.authorized", "order.paid", "payment.failed"])
    def test_other_events_ignored(self, anon, event):
        body = {"event": event, "payload": {}}
        r = _post_webhook(anon, body)
        assert r.status_code == 200, r.text[:300]
        assert r.json() == {"ok": True, "ignored": event}

    def test_non_json_body_valid_signature(self, anon):
        raw = b"not-a-json-body"
        r = _post_webhook(anon, raw=raw)
        assert r.status_code == 400, f"expected 400 got {r.status_code}: {r.text[:300]}"

    def test_booking_not_found(self, anon):
        body = _captured_event("pay_NOPE13", "order_DOESNOTEXIST13", 100, "EO-ZZZZZZ")
        r = _post_webhook(anon, body)
        assert r.status_code == 200, r.text[:300]
        j = r.json()
        assert j.get("ok") is False and j.get("reason") == "booking_not_found", j


# ---------- amount guard ----------
class TestAmountGuard:
    def test_amount_mismatch_keeps_pending_and_logs(self, anon, client, created):
        order = _make_pending(anon, created, "TEST_iter13 mismatch")
        ref = order["reference"]
        body = _captured_event("pay_TESTMISMATCH13", order["order_id"], max(order["amount"] - 100, 100), ref)
        r = _post_webhook(anon, body)
        assert r.status_code == 200, r.text[:300]
        j = r.json()
        assert j.get("ok") is False and j.get("reason") == "amount_mismatch", j
        assert j.get("expected") == order["amount"]

        b = _admin_booking(client, ref)
        assert b is not None, "booking missing from admin list"
        assert b.get("status") == "pending_payment", b.get("status")
        assert b.get("razorpay_payment_id") in (None, ""), b.get("razorpay_payment_id")
        log = b.get("webhook_log") or []
        assert len(log) == 1, log
        assert log[0].get("error") == "amount_mismatch", log[0]


# ---------- happy path + idempotency ----------
class TestConfirmAndIdempotency:
    def test_confirm_then_idempotent_replay(self, anon, client, created):
        order = _make_pending(anon, created, "TEST_iter13 confirm")
        ref = order["reference"]
        payload = _captured_event("pay_TESTCONFIRM13", order["order_id"], order["amount"], ref)
        raw = json.dumps(payload).encode()

        r = _post_webhook(anon, raw=raw)
        assert r.status_code == 200, r.text[:300]
        j = r.json()
        assert j.get("ok") is True, j
        assert j.get("reference") == ref
        assert j.get("payment_id") == "pay_TESTCONFIRM13"
        assert j.get("was_already_confirmed") is False, j

        b = _admin_booking(client, ref)
        assert b["status"] == "confirmed", b["status"]
        assert b["razorpay_payment_id"] == "pay_TESTCONFIRM13"
        assert b.get("confirmed_via") == "webhook", b.get("confirmed_via")
        assert b.get("webhook_confirmed_at"), "webhook_confirmed_at missing"
        assert b.get("paid_at"), "paid_at missing"
        assert len(b.get("webhook_log") or []) == 1, b.get("webhook_log")

        # replay exact same webhook
        r2 = _post_webhook(anon, raw=raw)
        assert r2.status_code == 200, r2.text[:300]
        j2 = r2.json()
        assert j2.get("ok") is True and j2.get("idempotent") is True, j2

        b2 = _admin_booking(client, ref)
        assert len(b2.get("webhook_log") or []) == 1, f"replay pushed a second log entry: {b2.get('webhook_log')}"
        assert b2.get("webhook_confirmed_at") == b.get("webhook_confirmed_at")


# ---------- notes.reference fallback ----------
class TestReferenceFallback:
    def test_bogus_order_id_but_valid_notes_reference(self, anon, client, created):
        order = _make_pending(anon, created, "TEST_iter13 fallback")
        ref = order["reference"]
        body = _captured_event("pay_TESTFALLBACK13", "order_BOGUS_NOT_IN_DB13", order["amount"], ref)
        r = _post_webhook(anon, body)
        assert r.status_code == 200, r.text[:300]
        j = r.json()
        assert j.get("ok") is True, f"fallback by notes.reference did not confirm booking: {j}"
        b = _admin_booking(client, ref)
        assert b["status"] == "confirmed", b


# ---------- regressions ----------
class TestRegressions:
    def test_payments_verify_bad_signature(self, anon):
        r = anon.post(f"{API}/payments/verify", json={
            "razorpay_order_id": "order_FAKE13",
            "razorpay_payment_id": "pay_FAKE13",
            "razorpay_signature": "badsig",
        }, timeout=30)
        assert r.status_code == 400, f"{r.status_code}: {r.text[:200]}"

    def test_admin_bookings_serialization(self, client):
        r = client.get(f"{API}/admin/bookings", timeout=60)
        assert r.status_code == 200, r.text[:200]
        items = r.json()
        items = items.get("bookings", items) if isinstance(items, dict) else items
        assert isinstance(items, list)
        for b in items:
            assert "_id" not in b, "MongoDB _id leaked in /admin/bookings"
            assert "status" in b

    def test_reconcile_still_works(self, anon, client, created):
        order = _make_pending(anon, created, "TEST_iter13 reconcile")
        ref = order["reference"]
        r = client.post(f"{API}/admin/bookings/{ref}/reconcile", timeout=90)
        assert r.status_code == 200, f"{r.status_code}: {r.text[:300]}"
        j = r.json()
        assert j.get("ok") is False, j
        assert j.get("reference") == ref
        assert "razorpay_payments" in j and "message" in j, j

    def test_reconcile_no_order_attached(self, client):
        r = client.post(f"{API}/admin/bookings/EO-NOSUCH/reconcile", timeout=60)
        assert r.status_code == 404, f"{r.status_code}: {r.text[:200]}"
