"""Tests: COMP vs Paid T&C differentiation + email image URL health.

Covers:
- EO-MIACEJ (COMP) email HTML has 'Entry Pass Terms', comp-specific line, and NO Chungath redemption block
- EO-MIACEJ PDF page 2 contains 'ENTRY PASS TERMS & CONDITIONS' and no '50% redemption'
- Paid booking (UPI) email HTML has BOTH Entry Ticket Terms + Redemption block; PDF page 2 has '50% redemption of the value'
- All <img> URLs in EO-MIACEJ email HTML return HTTP 200 with content-type image/png
- Preserves EO-GAASYU & EO-MIACEJ (deletes only the paid test booking it creates)
"""
import os
import io
import re
import sys
import asyncio
import pytest
import requests
from pypdf import PdfReader
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
load_dotenv("/app/backend/.env")
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
COMP_REF = "EO-MIACEJ"
ADMIN_EMAIL = "admin@rajaonam.com"
ADMIN_PASSWORD = "RajaOnam@2026"
BILLED_PASSCODE = "ONAM26"

sys.path.insert(0, "/app/backend")


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


def _render_email_html(reference: str, doc=None):
    from server import booking_email_html  # type: ignore

    if doc is None:
        from pymongo import MongoClient  # sync driver — avoids motor event-loop reuse issues
        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.environ.get("DB_NAME", "test_database")
        client = MongoClient(mongo_url)
        try:
            doc = client[db_name]["bookings"].find_one({"reference": reference}, {"_id": 0})
        finally:
            client.close()
    assert doc is not None, f"Booking {reference} not found"
    # Use the REAL preview base URL so <img src> resolves to absolute public URLs
    qr_url = f"{BASE_URL}/api/bookings/{reference}/qr"
    ticket_url = f"{BASE_URL}/api/bookings/{reference}/ticket.pdf"
    return booking_email_html(doc, qr_url, ticket_url), doc


# ---------------- COMP email HTML ----------------
class TestCompEmailHTML:
    @pytest.fixture(scope="class")
    def html_doc(self):
        return _render_email_html(COMP_REF)

    def test_payment_mode_is_comp(self, html_doc):
        _, doc = html_doc
        assert doc.get("payment_mode") == "COMP"

    def test_entry_pass_terms_heading(self, html_doc):
        h, _ = html_doc
        assert "Entry Pass Terms" in h, "COMP email must show 'Entry Pass Terms' heading"

    def test_comp_specific_line_one_time_entry(self, html_doc):
        h, _ = html_doc
        assert "one-time entry only" in h

    def test_no_monetary_or_redemption_value(self, html_doc):
        h, _ = html_doc
        assert "no monetary or redemption value" in h

    def test_no_chungath_redemption_block(self, html_doc):
        h, _ = html_doc
        # Redemption heading block must not appear for COMP
        assert "Redemption of Ticket at Chungath" not in h
        assert "50% redemption of the value" not in h
        # Regression: the entry ticket heading (paid variant) should NOT appear either
        assert "Entry Ticket Terms" not in h


# ---------------- COMP PDF ----------------
class TestCompPDF:
    @pytest.fixture(scope="class")
    def pdf_bytes(self):
        r = requests.get(f"{BASE_URL}/api/bookings/{COMP_REF}/ticket.pdf", timeout=60)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/pdf")
        return r.content

    def test_page2_has_entry_pass_heading(self, pdf_bytes):
        reader = PdfReader(io.BytesIO(pdf_bytes))
        assert len(reader.pages) == 2
        text = reader.pages[1].extract_text() or ""
        assert "ENTRY PASS TERMS & CONDITIONS" in text
        assert "no monetary or redemption value" in text

    def test_page2_has_no_redemption_50pct(self, pdf_bytes):
        reader = PdfReader(io.BytesIO(pdf_bytes))
        text = reader.pages[1].extract_text() or ""
        assert "50% redemption of the value" not in text
        assert "ENTRY TICKET TERMS" not in text  # paid heading must be absent
        assert "REDEMPTION OF TICKET AT CHUNGATH" not in text


# ---------------- Image URL health ----------------
class TestCompEmailImages:
    def test_all_img_src_urls_return_png(self):
        h, _ = _render_email_html(COMP_REF)
        # Extract <img ... src="..."> URLs
        urls = re.findall(r'<img[^>]+src="([^"]+)"', h)
        assert urls, "no <img> tags found in email HTML"
        # Unique while preserving order
        seen = set()
        unique_urls = []
        for u in urls:
            if u not in seen:
                seen.add(u)
                unique_urls.append(u)
        print(f"IMG URLs to verify ({len(unique_urls)}): {unique_urls}")
        failures = []
        for u in unique_urls:
            try:
                r = requests.get(u, timeout=30, allow_redirects=True)
                ct = r.headers.get("content-type", "")
                if r.status_code != 200 or not ct.startswith("image/png"):
                    failures.append(f"{u} -> status={r.status_code} ct={ct}")
            except Exception as e:
                failures.append(f"{u} -> exception {e}")
        assert not failures, "Broken image URLs: " + "; ".join(failures)


# ---------------- Paid booking regression ----------------
class TestPaidBookingTerms:
    @pytest.fixture(scope="class")
    def paid_booking(self, admin_token):
        payload = {
            "name": "TEST Paid Regression",
            "phone": "9999999999",
            "email": "delivered@resend.dev",
            "adults": 1,
            "kids_5_12": 0,
            "kids_below_5": 0,
            "veg_adults": 0,
            "veg_kids_5_12": 0,
            "veg_kids_below_5": 0,
            "contests": [],
            "games": [],
            "boating": False,
            "payment_mode": "UPI",
            "ticket_type": "VIP Guest",
        }
        r = requests.post(f"{BASE_URL}/api/bookings", json=payload, timeout=30)
        assert r.status_code == 200, f"paid booking creation failed: {r.status_code} {r.text}"
        doc = r.json()
        ref = doc["reference"]
        yield ref, doc
        # Cleanup
        dr = requests.delete(
            f"{BASE_URL}/api/admin/bookings/{ref}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"passcode": BILLED_PASSCODE},
            timeout=30,
        )
        print(f"cleanup DELETE {ref}: {dr.status_code} {dr.text[:200]}")
        assert dr.status_code == 200, f"cleanup delete failed: {dr.status_code} {dr.text}"

    def test_paid_email_html_has_both_sections(self, paid_booking):
        ref, _doc = paid_booking
        h, doc = _render_email_html(ref)
        assert doc.get("payment_mode") == "UPI"
        assert "Entry Ticket Terms" in h
        assert "Redemption of Ticket at Chungath" in h
        assert "50% redemption of the value" in h
        # Paid ticket must NOT contain the comp-only heading/text
        assert "Entry Pass Terms" not in h
        assert "no monetary or redemption value" not in h

    def test_paid_pdf_page2_has_redemption(self, paid_booking):
        ref, _doc = paid_booking
        r = requests.get(f"{BASE_URL}/api/bookings/{ref}/ticket.pdf", timeout=60)
        assert r.status_code == 200
        reader = PdfReader(io.BytesIO(r.content))
        assert len(reader.pages) == 2
        text = reader.pages[1].extract_text() or ""
        assert "ENTRY TICKET TERMS & CONDITIONS" in text
        assert "REDEMPTION OF TICKET AT CHUNGATH" in text
        assert "50% redemption of the value" in text
        assert "ENTRY PASS TERMS" not in text
