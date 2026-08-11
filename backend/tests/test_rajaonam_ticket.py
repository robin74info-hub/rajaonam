"""Backend tests for RajaOnam 2026 dummy booking EO-GAASYU
Verifies:
 - PDF ticket structure (2 pages, WELCOME text, T&C sections)
 - Email HTML content (logos, welcome heading, VIP Ticket label, single Sadhya slot row, no chungath-logo image)
 - Admin bookings API includes EO-GAASYU with COMP payment_mode & confirmed status
"""
import os
import io
import asyncio
import pytest
import requests
from pypdf import PdfReader
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
REF = "EO-GAASYU"
ADMIN_EMAIL = "admin@rajaonam.com"
ADMIN_PASSWORD = "RajaOnam@2026"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


# ---------------- PDF tests ----------------
class TestTicketPDF:
    @pytest.fixture(scope="class")
    def pdf_bytes(self):
        r = requests.get(f"{BASE_URL}/api/bookings/{REF}/ticket.pdf", timeout=60)
        assert r.status_code == 200, f"PDF fetch failed: {r.status_code}"
        assert r.headers.get("content-type", "").startswith("application/pdf")
        return r.content

    def test_pdf_valid_and_two_pages(self, pdf_bytes):
        reader = PdfReader(io.BytesIO(pdf_bytes))
        assert len(reader.pages) == 2, f"expected 2 pages, got {len(reader.pages)}"

    def test_page1_has_welcome_and_booking_id(self, pdf_bytes):
        reader = PdfReader(io.BytesIO(pdf_bytes))
        text = reader.pages[0].extract_text() or ""
        assert "WELCOME TO RAJAONAM 2026" in text
        assert REF in text
        assert "VIP Ticket" in text  # complimentary ticket label
        assert "Sadhya Time Slot" in text

    def test_page1_has_images(self, pdf_bytes):
        """Page 1 should have both corner logos AND the QR (>=3 images)."""
        reader = PdfReader(io.BytesIO(pdf_bytes))
        images = reader.pages[0].images
        assert len(images) >= 3, f"page 1 expected >=3 images (2 logos + QR), got {len(images)}"

    def test_page2_terms_and_no_logo(self, pdf_bytes):
        reader = PdfReader(io.BytesIO(pdf_bytes))
        text = reader.pages[1].extract_text() or ""
        assert "ENTRY TICKET TERMS & CONDITIONS" in text
        assert "REDEMPTION OF TICKET AT CHUNGATH JEWELLERY" in text
        # No image should be on page 2
        images = reader.pages[1].images
        assert len(images) == 0, f"page 2 should have no images, got {len(images)}"


# ---------------- Email HTML tests ----------------
class TestEmailHTML:
    @pytest.fixture(scope="class")
    def html(self):
        import sys
        sys.path.insert(0, "/app/backend")
        from server import booking_email_html, db  # type: ignore

        async def _load():
            return await db.bookings.find_one({"reference": REF}, {"_id": 0})

        doc = asyncio.get_event_loop().run_until_complete(_load()) if False else asyncio.run(_load())
        assert doc is not None, f"Booking {REF} not found in DB"
        qr_url = f"{BASE_URL}/api/bookings/{REF}/qr"
        ticket_url = f"{BASE_URL}/api/bookings/{REF}/ticket.pdf"
        return booking_email_html(doc, qr_url, ticket_url), doc

    def test_contains_both_logos(self, html):
        h, _ = html
        assert "rajaonam-chungath.png" in h
        assert "primetime-logo.png" in h

    def test_no_chungath_logo_image(self, html):
        h, _ = html
        assert "chungath-logo.png" not in h, "chungath-logo.png must not appear above T&C or anywhere"

    def test_welcome_heading_green(self, html):
        h, _ = html
        assert "WELCOME TO RAJAONAM 2026" in h
        assert "#1b5812" in h  # green color used for welcome heading

    def test_single_sadhya_slot_row(self, html):
        h, _ = html
        assert "Sadhya Time Slot" in h
        assert "Sea Food Time Slot" not in h
        assert "Veg Time Slot" not in h

    def test_vip_ticket_label_for_comp(self, html):
        h, doc = html
        assert doc.get("payment_mode") == "COMP"
        assert "VIP Ticket" in h
        assert "Complimentary (COMP)" not in h

    def test_terms_sections_present(self, html):
        h, _ = html
        assert "Entry Ticket Terms" in h
        assert "Redemption of Ticket at Chungath Jewellery" in h
        # verify counts: 13 entry + 12 redemption <li>
        entry_count = h.count("Entry is permitted only")
        assert entry_count == 1
        # rough li count in terms
        assert h.count("<li ") >= 13 + 12


# ---------------- Admin bookings API ----------------
class TestAdminBookings:
    def test_booking_visible_in_admin(self, admin_token):
        r = requests.get(
            f"{BASE_URL}/api/admin/bookings",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=30,
        )
        assert r.status_code == 200, f"admin bookings failed: {r.status_code} {r.text[:200]}"
        bookings = r.json()
        assert isinstance(bookings, list)
        match = [b for b in bookings if b.get("reference") == REF]
        assert len(match) == 1, f"Booking {REF} not found in admin list"
        b = match[0]
        assert b.get("status") == "confirmed", f"status: {b.get('status')}"
        assert b.get("payment_mode") == "COMP", f"payment_mode: {b.get('payment_mode')}"
