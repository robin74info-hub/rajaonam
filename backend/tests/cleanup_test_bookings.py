"""One-off cleanup of TEST_iter15 bookings left behind by failed teardowns."""
import os
import re
from pathlib import Path

import requests
from dotenv import dotenv_values

fe = dotenv_values("/app/frontend/.env")
API = (os.environ.get("REACT_APP_BACKEND_URL") or fe.get("REACT_APP_BACKEND_URL")).rstrip("/") + "/api"
be = dotenv_values("/app/backend/.env")
UA = {"User-Agent": "QA-Cleanup", "Content-Type": "application/json"}

content = Path("/app/memory/test_credentials.md").read_text()
email = re.search(r"(?im)^\s*[-*]?\s*Email:\s*(\S+)", content).group(1)
password = re.search(r"(?im)^\s*[-*]?\s*Password:\s*(\S+)", content).group(1)

s = requests.Session()
s.headers.update(UA)
tok = s.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30).json()["token"]
s.headers.update({"Authorization": f"Bearer {tok}"})

rows = s.get(f"{API}/admin/bookings", timeout=60).json()
rows = rows if isinstance(rows, list) else rows.get("bookings", [])
targets = [b for b in rows if "TEST_" in (b.get("name") or "")]
print(f"found {len(targets)} test bookings")
for b in targets:
    ref = b["reference"]
    for pc in ("", be.get("COMP_PASSCODE") or "PRIME26", be.get("BILLED_DELETE_PASSCODE") or "ONAM26"):
        r = s.request("DELETE", f"{API}/admin/bookings/{ref}", json={"passcode": pc}, timeout=30)
        if r.status_code in (200, 404):
            print(f"deleted {ref} ({r.status_code})")
            break
    else:
        print(f"FAILED {ref}: {r.status_code} {r.text[:120]}")
