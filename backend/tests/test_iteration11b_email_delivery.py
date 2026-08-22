"""Iteration 11b — verify resend-ticket actually triggers a deliverable email (delivered@resend.dev)."""
import os, re, time
from pathlib import Path
import pytest, requests
from dotenv import dotenv_values

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"]).rstrip("/")
API = f"{BASE_URL}/api"
COMP = "PRIME26"
LOG = "/var/log/supervisor/backend.err.log"


@pytest.fixture(scope="module")
def client():
    c = Path("/app/memory/test_credentials.md").read_text()
    email = re.search(r"(?im)^\s*[-*]?\s*Email:\s*(\S+)", c).group(1)
    pw = re.search(r"(?im)^\s*[-*]?\s*Password:\s*(\S+)", c).group(1)
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=30)
    assert r.status_code == 200, r.text[:200]
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {r.json()['token']}", "Content-Type": "application/json"})
    return s


def test_resend_email_delivers(client):
    body = {
        "name": "TEST_ Deliver Probe", "phone": "9000000002", "email": "delivered@resend.dev",
        "adults": 1, "contests": [], "games": [], "boating": False,
        "payment_mode": "COMP", "ticket_type": "VIP Guest", "passcode": COMP,
    }
    r = client.post(f"{API}/admin/manual-booking", json=body, timeout=60)
    assert r.status_code == 200, r.text[:400]
    ref = r.json()["reference"]
    try:
        time.sleep(4)
        r2 = client.post(f"{API}/admin/bookings/{ref}/resend-ticket", timeout=90)
        assert r2.status_code == 200, r2.text[:400]
        assert r2.json()["ok"] is True
        time.sleep(8)
        log = Path(LOG).read_text(errors="ignore")
        lines = [l for l in log.splitlines() if ref in l and "Confirmation email" in l]
        print("\n".join(lines[-4:]))
        assert lines, "no email log line found for booking"
        assert any(("HTTP 200" in l or "HTTP 202" in l) for l in lines), f"email not accepted by provider: {lines[-1]}"
    finally:
        d = client.request("DELETE", f"{API}/admin/bookings/{ref}", json={"passcode": COMP}, timeout=30)
        print("cleanup", d.status_code, d.text[:120])
