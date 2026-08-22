"""
Iteration 15 — Multi-code referral support (RAJA05 5%/min10, PRIMETIME31 10%/min0)
Covers: POST /api/payments/order pricing, POST /api/bookings (offline) pricing,
POST /api/admin/manual-booking (COMP) no-crash, regression on /api/payments/verify
and /api/payments/webhook signature handling.
"""
import hashlib
import hmac
import json
import math
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
BILLED_PASSCODE = backend_env.get("BILLED_DELETE_PASSCODE") or "ONAM26"
COMP_PASSCODE = backend_env.get("COMP_PASSCODE") or "PRIME26"
UA = {"User-Agent": "QA-Iteration15"}

ADULT_PRICE = 2999


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
        for pc in ("", COMP_PASSCODE, BILLED_PASSCODE):
            r = client.request("DELETE", f"{API}/admin/bookings/{ref}",
                               json={"passcode": pc}, timeout=30)
            print(f"cleanup {ref} pc={pc}: {r.status_code} {r.text[:80]}")
            if r.status_code in (200, 404):
                break


# ---------- helpers ----------
def payload(adults, referral=None, mode="Online (Razorpay)", **extra):
    p = {
        "name": "TEST_iter15 referral",
        "phone": "9000000015",
        "email": "delivered@resend.dev",
        "adults": adults,
        "kids_5_12": 0,
        "kids_below_5": 0,
        "veg_adults": 0,
        "veg_kids_5_12": 0,
        "veg_kids_below_5": 0,
        "contests": [],
        "games": [],
        "boating": False,
        "payment_mode": mode,
    }
    if referral is not None:
        p["referral_code"] = referral
    p.update(extra)
    return p


def make_order(anon, created, adults, referral=None):
    r = anon.post(f"{API}/payments/order", json=payload(adults, referral), timeout=90)
    assert r.status_code == 200, f"payments/order failed {r.status_code}: {r.text[:300]}"
    data = r.json()
    created.append(data["reference"])
    return data


# ---------- payments/order pricing ----------
class TestOrderPricing:
    def test_raja05_12_adults_5pct(self, anon, created):
        d = make_order(anon, created, 12, "RAJA05")
        assert d["amount"] == round(12 * ADULT_PRICE * 0.95) * 100 == 3418900, d
        assert d["referral_code"] == "RAJA05"
        assert d["currency"] == "INR"
        pub = anon.get(f"{API}/bookings/{d['reference']}/public", timeout=30)
        assert pub.status_code == 200
        assert pub.json()["total"] == 34189, pub.json()

    def test_raja05_5_adults_no_discount(self, anon, created):
        d = make_order(anon, created, 5, "RAJA05")
        assert d["amount"] == 5 * ADULT_PRICE * 100 == 1499500, d

    def test_primetime31_2_adults_10pct(self, anon, created):
        d = make_order(anon, created, 2, "PRIMETIME31")
        assert d["amount"] == 539800, d

    def test_primetime31_20_adults_10pct(self, anon, created):
        d = make_order(anon, created, 20, "PRIMETIME31")
        assert d["amount"] == round(20 * ADULT_PRICE * 0.9) * 100 == 5398200, d

    def test_lowercase_raja05_normalized(self, anon, created):
        d = make_order(anon, created, 12, "raja05")
        assert d["amount"] == 3418900, d
        assert d["referral_code"] == "RAJA05", d

    def test_bogus_code_no_error_no_discount(self, anon, created):
        d = make_order(anon, created, 2, "BOGUS")
        assert d["amount"] == 599800, d
        assert d["referral_code"] == "BOGUS", d

    def test_no_code_base_price(self, anon, created):
        d = make_order(anon, created, 2)
        assert d["amount"] == 599800, d
        assert d.get("referral_code") is None, d

    def test_raja05_10_adults_half_paise_rounding(self, anon, created):
        """base 29990, 5% off = 28490.5 -> round-half-up must give 28491 (matches JS Math.round)."""
        d = make_order(anon, created, 10, "RAJA05")
        print(f"10 adults RAJA05 backend amount(paise)={d['amount']} -> INR {d['amount']/100}")
        assert d["amount"] == 2849100, (
            f"backend charged {d['amount']/100} but frontend Math.round shows 28491"
        )

    def test_raja05_min_met_by_mixed_participants(self, anon, created):
        """10 total participants via adults+kids: base = 8*2999 + 2*1499 (kids 5-12)."""
        p = payload(8, "RAJA05")
        p["kids_5_12"] = 2
        r = anon.post(f"{API}/payments/order", json=p, timeout=90)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        created.append(d["reference"])
        ev = anon.get(f"{API}/event", timeout=30).json()
        base = 8 * ev["sea_price_adult"] + 2 * ev["sea_price_kid"]
        assert d["amount"] == math.floor(base * 0.95 + 0.5) * 100, (d, base)


# ---------- offline booking path ----------
class TestOfflineBooking:
    def test_bookings_raja05_10_adults(self, anon, created):
        r = anon.post(f"{API}/bookings", json=payload(10, "RAJA05", mode="Pay at Venue"), timeout=90)
        assert r.status_code == 200, r.text[:300]
        doc = r.json()
        created.append(doc["reference"])
        assert doc["referral_code"] == "RAJA05"
        assert doc["total"] == 28491, (
            f"BUG: offline /api/bookings referral total {doc['total']} (expected 28491 round-half-up)"
        )
        # verify persistence
        pub = anon.get(f"{API}/bookings/{doc['reference']}/public", timeout=30)
        assert pub.status_code == 200
        assert pub.json()["total"] == 28491, pub.json()

    def test_bookings_primetime31_2_adults(self, anon, created):
        r = anon.post(f"{API}/bookings", json=payload(2, "PRIMETIME31", mode="Pay at Venue"), timeout=90)
        assert r.status_code == 200, r.text[:300]
        doc = r.json()
        created.append(doc["reference"])
        assert doc["referral_code"] == "PRIMETIME31"
        assert doc["total"] == 5398, doc["total"]

    def test_bookings_raja05_below_min_no_discount(self, anon, created):
        r = anon.post(f"{API}/bookings", json=payload(5, "RAJA05", mode="Pay at Venue"), timeout=90)
        assert r.status_code == 200, r.text[:300]
        doc = r.json()
        created.append(doc["reference"])
        assert doc["total"] == 5 * ADULT_PRICE, doc["total"]

    def test_bookings_no_code_base(self, anon, created):
        r = anon.post(f"{API}/bookings", json=payload(2, None, mode="Pay at Venue"), timeout=90)
        assert r.status_code == 200, r.text[:300]
        doc = r.json()
        created.append(doc["reference"])
        assert doc["total"] == 5998, doc["total"]


# ---------- COMP manual booking ----------
class TestManualBooking:
    def test_comp_ignores_referral(self, client, created):
        p = payload(2, "PRIMETIME31", mode="COMP")
        p["passcode"] = COMP_PASSCODE
        p["ticket_type"] = "VIP Guest"
        r = client.post(f"{API}/admin/manual-booking", json=p, timeout=90)
        assert r.status_code == 200, r.text[:300]
        doc = r.json()
        created.append(doc["reference"])
        assert doc["status"] == "confirmed", doc
        assert doc["total"] == 0, doc["total"]
        assert "_id" not in doc


# ---------- regressions ----------
class TestRegressions:
    def test_verify_bad_signature(self, anon, created):
        d = make_order(anon, created, 1)
        r = anon.post(f"{API}/payments/verify", json={
            "razorpay_order_id": d["order_id"],
            "razorpay_payment_id": "pay_TESTBAD15",
            "razorpay_signature": "deadbeef",
            "reference": d["reference"],
        }, timeout=60)
        assert r.status_code == 400, f"{r.status_code}: {r.text[:300]}"

    def test_webhook_invalid_signature(self, anon):
        body = json.dumps({"event": "payment.captured", "payload": {}}).encode()
        r = requests.post(f"{API}/payments/webhook", data=body,
                          headers={"Content-Type": "application/json",
                                   "X-Razorpay-Signature": "deadbeef", **UA}, timeout=60)
        assert r.status_code == 400, r.text[:300]

    @pytest.mark.skipif(not WEBHOOK_SECRET, reason="no webhook secret")
    def test_webhook_ignored_event(self):
        raw = json.dumps({"event": "order.paid", "payload": {}}).encode()
        sig = hmac.new(WEBHOOK_SECRET.encode(), raw, hashlib.sha256).hexdigest()
        r = requests.post(f"{API}/payments/webhook", data=raw,
                          headers={"Content-Type": "application/json",
                                   "X-Razorpay-Signature": sig, **UA}, timeout=60)
        assert r.status_code == 200, r.text[:300]
        body = r.json()
        assert body.get("ok") is True, body
        assert "ignored" in body, body

    @pytest.mark.skipif(not WEBHOOK_SECRET, reason="no webhook secret")
    def test_webhook_captured_confirms_discounted_booking(self, anon, client, created):
        d = make_order(anon, created, 12, "RAJA05")
        event = {
            "event": "payment.captured",
            "payload": {"payment": {"entity": {
                "id": "pay_TESTITER15",
                "order_id": d["order_id"],
                "amount": d["amount"],
                "notes": {"reference": d["reference"]},
            }}},
        }
        raw = json.dumps(event).encode()
        sig = hmac.new(WEBHOOK_SECRET.encode(), raw, hashlib.sha256).hexdigest()
        r = requests.post(f"{API}/payments/webhook", data=raw,
                          headers={"Content-Type": "application/json",
                                   "X-Razorpay-Signature": sig, **UA}, timeout=90)
        assert r.status_code == 200, r.text[:300]
        pub = anon.get(f"{API}/bookings/{d['reference']}/public", timeout=30)
        assert pub.status_code == 200
        assert pub.json()["status"] == "confirmed", pub.json()
        assert pub.json()["total"] == 34189, pub.json()
