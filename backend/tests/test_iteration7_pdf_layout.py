"""Iteration 7: PDF layout changes verification.

Verifies for a UPI paid booking:
- 2 pages
- page 1 contains 'BOOKING ID' and 'WELCOME TO RAJAONAM 2026'
- page 1 does NOT contain '(pay at venue)' or a standalone 'RajaOnam 2026' title before BOOKING ID
- page 2 has BOTH T&C sections (Entry Ticket Terms + Redemption at Chungath)
- page 1 has 3 embedded images (bg + jingalala + QR); page 2 has 1 image (bg)
"""
import io
import os
import re
import pytest
import requests
from pypdf import PdfReader
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
load_dotenv("/app/backend/.env")

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
ADMIN_EMAIL = "admin@rajaonam.com"
ADMIN_PASSWORD = "RajaOnam@2026"
BILLED_PASSCODE = "ONAM26"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def booking(admin_token):
    payload = {
        "name": "TEST Iter7 PDF",
        "phone": "9999911111",
        "email": "delivered@resend.dev",
        "adults": 2,
        "kids_5_12": 1,
        "kids_below_5": 0,
        "veg_adults": 1,
        "veg_kids_5_12": 0,
        "veg_kids_below_5": 0,
        "contests": [],
        "games": [],
        "boating": True,
        "boating_slot": "2:00 PM \u2013 2:45 PM",
        "boating_persons": 2,
        "payment_mode": "UPI",
    }
    r = requests.post(f"{BASE_URL}/api/bookings", json=payload, timeout=30)
    assert r.status_code == 200, f"create failed: {r.status_code} {r.text}"
    ref = r.json()["reference"]
    yield ref
    dr = requests.delete(
        f"{BASE_URL}/api/admin/bookings/{ref}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"passcode": BILLED_PASSCODE},
        timeout=30,
    )
    assert dr.status_code == 200, dr.text


@pytest.fixture(scope="module")
def pdf_bytes(booking):
    r = requests.get(f"{BASE_URL}/api/bookings/{booking}/ticket.pdf", timeout=60)
    assert r.status_code == 200
    assert r.headers.get("content-type", "").startswith("application/pdf")
    return r.content, booking


class TestPdfPage1Content:
    def test_two_pages(self, pdf_bytes):
        content, _ = pdf_bytes
        reader = PdfReader(io.BytesIO(content))
        assert len(reader.pages) == 2

    def test_page1_texts(self, pdf_bytes):
        content, ref = pdf_bytes
        reader = PdfReader(io.BytesIO(content))
        text = reader.pages[0].extract_text() or ""
        assert "BOOKING ID" in text
        assert ref in text
        assert "WELCOME TO RAJAONAM 2026" in text

    def test_page1_no_pay_at_venue(self, pdf_bytes):
        content, _ = pdf_bytes
        reader = PdfReader(io.BytesIO(content))
        text = reader.pages[0].extract_text() or ""
        assert "pay at venue" not in text.lower()

    def test_page1_no_standalone_rajaonam_title(self, pdf_bytes):
        """A standalone line 'RajaOnam 2026' should NOT appear before BOOKING ID."""
        content, _ = pdf_bytes
        reader = PdfReader(io.BytesIO(content))
        text = reader.pages[0].extract_text() or ""
        # Split on BOOKING ID; the text before it should not contain a standalone 'RajaOnam 2026'
        before = text.split("BOOKING ID", 1)[0]
        # Check no line equals or matches a RajaOnam heading pattern
        for line in before.splitlines():
            stripped = line.strip()
            assert stripped.lower() != "rajaonam 2026", f"Standalone title line found: {stripped!r}"


class TestPdfPage2Content:
    def test_page2_terms_sections(self, pdf_bytes):
        content, _ = pdf_bytes
        reader = PdfReader(io.BytesIO(content))
        text = reader.pages[1].extract_text() or ""
        assert "ENTRY TICKET TERMS & CONDITIONS" in text
        assert "REDEMPTION OF TICKET AT CHUNGATH" in text


class TestPdfImages:
    def test_page1_has_three_images(self, pdf_bytes):
        content, _ = pdf_bytes
        reader = PdfReader(io.BytesIO(content))
        page1 = reader.pages[0]
        images = page1.images
        assert len(images) == 3, f"expected 3 images on page 1, got {len(images)}"

    def test_page2_has_one_image(self, pdf_bytes):
        content, _ = pdf_bytes
        reader = PdfReader(io.BytesIO(content))
        page2 = reader.pages[1]
        images = page2.images
        assert len(images) == 1, f"expected 1 image on page 2, got {len(images)}"
