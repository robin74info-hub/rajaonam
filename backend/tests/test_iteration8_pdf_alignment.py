"""Iteration 8: Verify PDF background alignment fix + copyright on last page + COMP PDF background.

Requirements:
- Paid PDF: 2 pages; page1 3 images (bg, jingalala, QR), NO 'Copyright' text on page1;
  page2 1 image (bg) + copyright text on page2.
- COMP PDF: 2 pages; page1 3 images; page2 1 image + ENTRY PASS TERMS + copyright on page2.
- Bookings collection cleaned up after test.
"""
import io
import os
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
COMP_PASSCODE = "PRIME26"
COPYRIGHT_TEXT = "Copyright 2026 RajaOnam"


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
def paid_booking(admin_token):
    payload = {
        "name": "TEST Iter8 Paid",
        "phone": "9999922222",
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
    assert r.status_code == 200, r.text
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
def comp_booking(admin_token):
    payload = {
        "name": "TEST Iter8 Comp",
        "phone": "9999933333",
        "email": "delivered@resend.dev",
        "adults": 2,
        "kids_5_12": 0,
        "kids_below_5": 0,
        "veg_adults": 0,
        "veg_kids_5_12": 0,
        "veg_kids_below_5": 0,
        "contests": [],
        "games": [],
        "boating": False,
        "boating_slot": None,
        "boating_persons": 0,
        "ticket_type": "VIP Guest",
        "passcode": COMP_PASSCODE,
    }
    r = requests.post(
        f"{BASE_URL}/api/admin/manual-booking",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=30,
    )
    assert r.status_code == 200, f"comp create failed: {r.status_code} {r.text}"
    ref = r.json()["reference"]
    yield ref
    dr = requests.delete(
        f"{BASE_URL}/api/admin/bookings/{ref}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"passcode": COMP_PASSCODE},
        timeout=30,
    )
    assert dr.status_code == 200, dr.text


def _fetch_pdf(ref):
    r = requests.get(f"{BASE_URL}/api/bookings/{ref}/ticket.pdf", timeout=60)
    assert r.status_code == 200
    assert r.headers.get("content-type", "").startswith("application/pdf")
    return r.content


class TestPaidPdfLayout:
    def test_paid_two_pages(self, paid_booking):
        reader = PdfReader(io.BytesIO(_fetch_pdf(paid_booking)))
        assert len(reader.pages) == 2

    def test_paid_page1_no_copyright(self, paid_booking):
        reader = PdfReader(io.BytesIO(_fetch_pdf(paid_booking)))
        text = reader.pages[0].extract_text() or ""
        assert COPYRIGHT_TEXT not in text, f"Copyright should not be on page 1: {text}"

    def test_paid_page2_has_copyright(self, paid_booking):
        reader = PdfReader(io.BytesIO(_fetch_pdf(paid_booking)))
        text = reader.pages[1].extract_text() or ""
        assert COPYRIGHT_TEXT in text
        assert "Berrysys Media Global LLC" in text

    def test_paid_page1_three_images(self, paid_booking):
        reader = PdfReader(io.BytesIO(_fetch_pdf(paid_booking)))
        assert len(reader.pages[0].images) == 3

    def test_paid_page2_one_image(self, paid_booking):
        reader = PdfReader(io.BytesIO(_fetch_pdf(paid_booking)))
        assert len(reader.pages[1].images) == 1

    def test_paid_page1_starts_with_booking_id(self, paid_booking):
        reader = PdfReader(io.BytesIO(_fetch_pdf(paid_booking)))
        text = reader.pages[0].extract_text() or ""
        before = text.split("BOOKING ID", 1)[0]
        for line in before.splitlines():
            assert line.strip().lower() != "rajaonam 2026"

    def test_paid_no_pay_at_venue(self, paid_booking):
        reader = PdfReader(io.BytesIO(_fetch_pdf(paid_booking)))
        for p in reader.pages:
            assert "pay at venue" not in (p.extract_text() or "").lower()


class TestCompPdfLayout:
    def test_comp_two_pages(self, comp_booking):
        reader = PdfReader(io.BytesIO(_fetch_pdf(comp_booking)))
        assert len(reader.pages) == 2

    def test_comp_page1_three_images(self, comp_booking):
        reader = PdfReader(io.BytesIO(_fetch_pdf(comp_booking)))
        assert len(reader.pages[0].images) == 3

    def test_comp_page2_one_image(self, comp_booking):
        reader = PdfReader(io.BytesIO(_fetch_pdf(comp_booking)))
        assert len(reader.pages[1].images) == 1

    def test_comp_page2_entry_pass_terms(self, comp_booking):
        reader = PdfReader(io.BytesIO(_fetch_pdf(comp_booking)))
        text = reader.pages[1].extract_text() or ""
        assert "ENTRY PASS TERMS" in text

    def test_comp_page1_no_copyright(self, comp_booking):
        reader = PdfReader(io.BytesIO(_fetch_pdf(comp_booking)))
        text = reader.pages[0].extract_text() or ""
        assert COPYRIGHT_TEXT not in text

    def test_comp_page2_has_copyright(self, comp_booking):
        reader = PdfReader(io.BytesIO(_fetch_pdf(comp_booking)))
        text = reader.pages[1].extract_text() or ""
        assert COPYRIGHT_TEXT in text
