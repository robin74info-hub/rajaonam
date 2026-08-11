"""Verification tests for the 'Download Royal Ticket (PDF)' bug fix.

Verifies:
1. GET /api/bookings/{ref}/ticket.pdf returns attachment PDF
2. booking_email_html: anchor text is exactly 'Download Ticket (PDF)' with the passed ticket URL
3. booking_email_html: the string 'Royal' does not appear anywhere
"""
import os
import re
import sys
import asyncio
import requests

sys.path.insert(0, "/app/backend")

from dotenv import load_dotenv
load_dotenv("/app/frontend/.env")
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
REF = "EO-MIACEJ"


# --- PDF endpoint tests ---
class TestTicketPdfEndpoint:
    def test_pdf_status_and_headers(self):
        r = requests.get(f"{BASE_URL}/api/bookings/{REF}/ticket.pdf", timeout=30)
        assert r.status_code == 200, r.text
        assert r.headers.get("content-type", "").lower().startswith("application/pdf")
        cd = r.headers.get("content-disposition", "")
        assert cd.lower().startswith("attachment"), f"Expected attachment, got: {cd}"
        assert f"RajaOnam-Ticket-{REF}.pdf" in cd, cd
        assert r.content.startswith(b"%PDF"), r.content[:20]


# --- Email HTML tests ---
class TestBookingEmailHtml:
    @classmethod
    def setup_class(cls):
        from dotenv import load_dotenv as _ld
        _ld("/app/backend/.env")
        from pymongo import MongoClient
        from server import booking_email_html  # noqa
        cls.booking_email_html = staticmethod(booking_email_html)
        client = MongoClient(os.environ["MONGO_URL"])
        cls.doc = client[os.environ["DB_NAME"]].bookings.find_one(
            {"reference": REF}, {"_id": 0}
        )
        assert cls.doc, f"Booking {REF} not found"

    def test_anchor_text_and_url(self):
        ticket_url = f"{BASE_URL}/api/bookings/{REF}/ticket.pdf"
        qr_url = f"{BASE_URL}/api/qr/xyz.png"
        html = self.booking_email_html(self.doc, qr_url, ticket_url)
        # Find anchor with ticket_url
        m = re.search(
            r'<a\s+href="' + re.escape(ticket_url) + r'"[^>]*>([^<]+)</a>',
            html,
        )
        assert m, f"Anchor with ticket_url not found. URL={ticket_url}"
        assert m.group(1).strip() == "Download Ticket (PDF)", m.group(1)

    def test_no_royal_in_html(self):
        ticket_url = f"{BASE_URL}/api/bookings/{REF}/ticket.pdf"
        qr_url = f"{BASE_URL}/api/qr/xyz.png"
        html = self.booking_email_html(self.doc, qr_url, ticket_url)
        # Case-insensitive search for 'royal'
        occurrences = [
            m.start() for m in re.finditer(r"royal", html, re.IGNORECASE)
        ]
        assert not occurrences, (
            f"'Royal' appears at positions {occurrences}. "
            f"Context: {[html[max(0,p-40):p+40] for p in occurrences]}"
        )
