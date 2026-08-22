"""
Iteration 14 — Retest of notes.reference fallback in POST /api/payments/webhook
after the two-step lookup fix. Also re-runs two regressions:
  - exact replay -> idempotent
  - order_id path with NO notes.reference
Cleanup: deletes every pending/confirmed booking created here.
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
UA = {"User-Agent": "Razorpay-Test-Iter14"}


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
        for pc in (None, BILLED_PASSCODE, COMP_PASSCODE):
            body = {"passcode": pc} if pc else {}
            r = client.request("DELETE", f"{API}/admin/bookings/{ref}", json=body, timeout=30)
            print(f"cleanup {ref} pc={pc}: {r.status_code} {r.text[:120]}")
            if r.status_code in (200, 404):
                break


def _booking_payload(name):
    return {
        "name": name,
        "phone": "9000000014",
        "email": "qa.iter14@example.com",
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


def _post_webhook(raw: bytes):
    hdrs = {"Content-Type": "application/json", "X-Razorpay-Signature": _sign(raw), **UA}
    return requests.post(f"{API}/payments/webhook", data=raw, headers=hdrs, timeout=60)


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
    return data


def _admin_booking(client, ref):
    r = client.get(f"{API}/admin/bookings", timeout=60)
    assert r.status_code == 200, r.text[:200]
    items = r.json()
    items = items.get("bookings", items) if isinstance(items, dict) else items
    return next((b for b in items if b.get("reference") == ref), None)


class TestReferenceFallback:
    """Bogus order_id + correct notes.reference must self-heal via reference lookup."""

    def test_bogus_order_id_valid_notes_reference_confirms(self, anon, client, created):
        order = _make_pending(anon, created, "TEST_iter14 fallback")
        ref = order["reference"]
        raw = json.dumps(_captured_event("pay_TEST_fallback", "order_BOGUS_xyz", order["amount"], ref)).encode()

        r = _post_webhook(raw)
        assert r.status_code == 200, r.text[:300]
        j = r.json()
        assert j.get("ok") is True, f"fallback lookup failed: {j}"
        assert j.get("reference") == ref, j
        assert j.get("payment_id") == "pay_TEST_fallback", j
        assert j.get("was_already_confirmed") is False, j

        b = _admin_booking(client, ref)
        assert b is not None, "booking missing from admin list"
        assert b.get("status") == "confirmed", b.get("status")
        assert b.get("confirmed_via") == "webhook", b.get("confirmed_via")
        assert b.get("razorpay_payment_id") == "pay_TEST_fallback", b.get("razorpay_payment_id")
        assert b.get("webhook_confirmed_at"), "webhook_confirmed_at missing"
        assert len(b.get("webhook_log") or []) == 1, b.get("webhook_log")

        # regression: exact replay -> idempotent, no extra log entry
        r2 = _post_webhook(raw)
        assert r2.status_code == 200, r2.text[:300]
        j2 = r2.json()
        assert j2.get("ok") is True and j2.get("idempotent") is True, j2
        b2 = _admin_booking(client, ref)
        assert len(b2.get("webhook_log") or []) == 1, f"replay added log entry: {b2.get('webhook_log')}"
        assert b2.get("webhook_confirmed_at") == b.get("webhook_confirmed_at")


class TestOrderIdPathNoReference:
    """Correct order_id, no notes.reference at all -> confirms via order_id path."""

    def test_order_id_only_confirms(self, anon, client, created):
        order = _make_pending(anon, created, "TEST_iter14 orderid")
        ref = order["reference"]
        raw = json.dumps(_captured_event("pay_TEST_orderid", order["order_id"], order["amount"])).encode()

        r = _post_webhook(raw)
        assert r.status_code == 200, r.text[:300]
        j = r.json()
        assert j.get("ok") is True, j
        assert j.get("reference") == ref, j
        assert j.get("was_already_confirmed") is False, j

        b = _admin_booking(client, ref)
        assert b.get("status") == "confirmed", b.get("status")
        assert b.get("confirmed_via") == "webhook", b.get("confirmed_via")
        assert b.get("razorpay_payment_id") == "pay_TEST_orderid"


class TestStillNotFound:
    """Both order_id and reference unknown -> booking_not_found (no regression)."""

    def test_both_unknown(self):
        raw = json.dumps(_captured_event("pay_TEST_nf14", "order_UNKNOWN14", 100, "EO-ZZZZ14")).encode()
        r = _post_webhook(raw)
        assert r.status_code == 200, r.text[:300]
        j = r.json()
        assert j.get("ok") is False and j.get("reason") == "booking_not_found", j
