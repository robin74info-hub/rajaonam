# PRD — Ember & Oak: Festival Booking Landing Page

## Original Problem Statement
"Build a landing page: event organisation for a festival booking with time slot for food, get customer details with name, phone, email and number of people, price and a payment button, front page should show the event details and leftside the booking options"

## User Choices
- Payment: MOCK payment (simulated success, no real charges)
- Festival type: Food festival + cultural/seasonal
- Bookings: saved to DB, no admin view — confirmation shown after booking
- Design: Warm & festive + Dark & premium (ember-lit aesthetic)
- Currency chosen by agent: INR (₹1,499/person) — easy to change on request

## Architecture
- Frontend: React + Tailwind + framer-motion + lenis (smooth scroll). Split layout: 35% sticky glassmorphic booking rail (left), 65% editorial scroll content (right). Mobile: stacked.
- Backend: FastAPI, routes prefixed /api. MongoDB via motor (MONGO_URL/DB_NAME from env).
- Components: BookingPanel (slots, guests stepper, form, price, mock pay states), Hero (kinetic masked line reveal + parallax), Marquee (CSS editorial ribbon), Manifesto (numbered chapters 01–03 with clipped image reveals).

## API
- GET /api/event — event details + slots with live remaining seats
- POST /api/bookings — validates input, checks slot capacity, creates confirmed booking (mock payment), returns reference (EO-XXXXXX)
- GET /api/bookings/{reference} — booking lookup

## User Personas
- Festival-goer: browses event story, picks a food seating slot, books & pays for their group
- Organizer (future): would view/manage bookings

## Implemented (2026-08-01)
- Dark premium ember-lit landing page, award-level art direction (Cormorant Garamond + Manrope, grain overlay, flame/saffron accents)
- Kinetic hero with masked line-by-line reveal + parallax chef-fire photography
- Left sticky booking panel: 3 time slots with live seat counts, guest stepper (1–10), name/phone/email validation, dynamic total, multi-state pay button (idle → processing → success)
- Confirmation view with booking reference, slot, guests, total paid
- Editorial marquee + numbered manifesto chapters with scroll reveals
- Slot capacity enforcement (409 when over capacity), seat counts decrement on booking
- Mobile responsive stacked layout

## Redesign v2 (2026-08-01) — RajaoNam / Oru Kottara Sadhya 2026
- Rebranded to Onam theme per user: LIGHT floral theme (cream #FFFBF2, pookalam SVG pattern bg, leaf-green/gold/maroon palette)
- User-provided assets in /app/frontend/public/assets/: onam-hero.png (hero banner), logo.webp (transparent logo, organiser section)
- New layout: full-width hero banner → marquee → grid (event details left, booking unit RIGHT, sticky) → organiser section with logo → footer
- Slots changed to: Onam Sadhya Slot 1 (12:00–1:00 PM), Onam Sadhya Slot 2 (1:30–2:30 PM); seat counts removed from UI
- Event details: The Invitation + 3 chapters (Legend of Mahabali, Grand Sadhya, Festivities) using crops of hero image + sadhya seatings card
- Organiser: Kottara Cultural Collective (placeholder contact: +91 98470 00000, hello@rajaonam.in) with logo
- Booking flow re-verified end-to-end (ref EO-HESFCZ, 3 guests, ₹4,497)

## Layout v3 (2026-08-01)
- Hero banner now uses the RajaoNam logo image (replaces text title) on the left
- Hero image repositioned (object-top) so the "Happy Onam" text in the image is fully visible lower on the banner
- Booking unit moved INTO the hero banner, right side (grid 1fr/400px); event details + organiser below
- Re-verified: booking ref EO-92P6S0 (Slot 1, 2 guests, ₹2,998); mobile stacks logo → details → booking

## Registration Form v4 (2026-08-01) — per "Rajyonam 2026 program requirement website.docx"
- Form REMOVED from hero banner; banner now has "Booking Details" button (desktop) + "Book Your Slot" (mobile, on banner image footer) scrolling to form below
- Form sits directly after banner (max-w-2xl), sections per docx:
  01 Your Details (name, WhatsApp number, email)
  02 Sea Food Sadhya slot (2 slots kept) + participants: Adults ₹1,499 / Kids 5–12 ₹749 / Kids below 5 Free (PRICES ASSUMED — docx has none), auto total participants
  03 Contests Yes/No → multi-select: Malayali Manka, Sreeman, Kids Contest, Best Couple
  04 Traditional Games Yes/No → multi-select: Uriyadi, Vadamvali, Sack Race, Bun Eating, Sundarikku Pottu Thodal, Lemon & Spoon
  05 Boating Yes/No → single slot (12–1, 2:30–3:30, 3:30–4:30, 4:30–5:30) + persons stepper
  Booking Summary box + mock pay
- Backend BookingCreate rewritten for new fields; total = adults×1499 + kids512×749; boating slot validated
- Verified: EO-PU27TY (2A+1K+1U5, Best Couple, Uriyadi, boating 2:30–3:30, ₹3,747)
- NOT built yet (docx phase 2): QR code per ticket, PDF ticket download, email/WhatsApp confirmations, venue QR scanning, real payment gateway (UPI/cards/netbanking/wallets)

## Updates v5 (2026-08-01)
- Sadhya Slot 1/2 REMOVED per user (backend slots, form pills, manifesto seatings card, capacity logic all gone)
- Form made full-width on desktop (was max-w-2xl)
- Real event details applied: RajyOnam 2026 · Bolgatty Palace, Kochi · 26 August 2026 · 11:00 AM – 5:00 PM (hero, footer, organiser, copy)
- Bug fixed: leftover slot_id reference broke payment ("slotId is not defined") — removed; re-verified EO-QC6GCR (2A+1K, boating 3:30–4:30, ₹3,747)

## Updates v6 (2026-08-01)
- Section 02 split into two columns: Sea Food Sadhya + Veg Onam Sadhya, each with Adults/Kids 5–12/Kids below 5 steppers (backend veg_* fields added; total = (sea+veg adults)×1499 + (sea+veg kids)×749; ≥1 adult across both required)
- Form title changed to "Raja Onam - Oru Kottara Sadhya 2026" (EVENT.name)
- Games icon (Gamepad2) added to section 04 question
- Chapter 02 image → sadhya.png (user upload), Chapter 03 → "House Boat" with houseboat.png (user upload) + boating text
- Page title: "Happy Onam - Oru Kottara Sadhya"; marquee: Onam Sadhya · Contest · Games · Boating
- Verified: EO-PXXY45 (2 sea adults + 1 veg adult + 1 veg infant, ₹4,497)

## Pricing v7 (2026-08-01, updated 2026-08-03) — REAL prices from user
- Sea Food Sadhya: Adult ₹2,999, Kid (5–12) ₹1,399 · Veg Onam Sadhya: Adult ₹2,699, Kid (5–12) ₹1,199 · Below 5 free
- Backend fields: sea_price_adult/sea_price_kid/veg_price_adult/veg_price_kid
- Admin dashboard stats: Bookings, Total Guests, Sea Food Sadhya count, Veg Onam Sadhya count, Kids count, Revenue, Boating
- Verified: EO-GJI6OI (1 sea A + 1 veg A = ₹5,698)

## Chapters v8 (2026-08-01) — per "RAJA ONAM -2026.pdf"
- 10 chapters below The Invitation, same numbered format: 01 The Legend: Mahabali, 02 The Royal Welcome, 03 Capture the Royalty, 04 Activities & Leisure, 05 Traditional Onam Games, 06 Onam Contests, 07 Onam Chandha, 08 Live Counters & Vintage Delights, 09 Nadan Vibes with Unarth, 10 The Grand Sadhya
- Invitation text updated to PDF copy ("One leaf. Twenty-six dishes. A royal welcome.")
- Organiser renamed to Prime Time Events (from PDF); contact details still placeholders
- Chapter images are PLACEHOLDERS (existing assets) — user will supply real images later
- Brochure floating button: "Raja Onam Events Brochure" → downloads /assets/raja-onam-brochure.pdf

## Admin Dashboard v9 (2026-08-03)
- /admin route: passcode-protected dashboard (JWT auth, bcrypt, seeded admin from env)
- Login: admin@rajaonam.com / RajaOnam@2026 (in backend/.env, test_credentials.md)
- Dashboard: stats (bookings, guests, revenue, boating) + full bookings table
- "Export to Excel" button → GET /api/admin/bookings/export → rajaonam-bookings.csv (UTF-8 BOM, Excel-compatible)
- Endpoints: POST /api/auth/login, GET /api/auth/me, GET /api/admin/bookings, GET /api/admin/bookings/export (all Bearer-protected)
- Verified: wrong password rejected, no-token 401, CSV downloads with all 16 rows

## Admin Dashboard v10 (2026-08-03, updated)
- Kids card removed; separate clickable cards: Sea Food Adults, Sea Food Kids, Veg Adults, Veg Kids, Contests, Games (+ Bookings, Total Guests, Revenue, Boating)
- Each clickable card filters the table (toggle) with a "Showing: X (N) ✕" chip; Export downloads the filtered CSV (rajaonam-bookings-{filter}.csv)
- Verified: contests filter 4 rows + export, sea-kids filter 8 rows, clear restores all

## Admin Dashboard v11 (2026-08-04)
- Boating stat card is now a clickable filter (was inactive) — chip + filtered export (rajaonam-bookings-boating.csv)
- Payment mode tracking: form section 06 (UPI / Card / Net Banking / Pay at Venue, default UPI) → stored as payment_mode → shown in confirmation, dashboard PAYMENT column, and CSV export. Old bookings (pre-feature) show "—"
- Verified: EO-EO6K3E booked with Net Banking shows in dashboard; boating filter 4 rows + export works

## Submit + QR + Email v12 (2026-08-05)
- Payment SKIPPED: form button is now "Submit Booking" (no charge; "pay at venue" note); payment_mode defaults to "Pending"
- Success page shows generated QR code (GET /api/bookings/{ref}/qr → PNG, content: RAJAONAM-2026|ref|name|guests)
- Confirmation email via Emergent managed Resend proxy (EMERGENT_EMAIL_KEY in .env, EMAIL_FROM_NAME="RajaOnam 2026"): branded HTML with booking details + QR image (linked from backend URL); sent async (asyncio.create_task), failure doesn't break booking
- qrcode[pil] + httpx installed
- Verified: EO-K16SUD success page QR renders; email HTTP 202 to delivered@resend.dev (test address)

## Email QR fix + PDF ticket v13 (2026-08-05)
- BUG FIX: email QR image was broken — URL was built from internal request.base_url; now uses x-forwarded-proto/host (public URL, works in production too)
- PDF ticket: GET /api/bookings/{ref}/ticket.pdf (fpdf2) — branded ticket with all booking details + embedded QR; latin-1 sanitized (en-dash fix), multi_cell cursor fix
- Email now includes working QR image + "Download Ticket (PDF)" button (email proxy has no attachment support, so PDF is a hosted link)
- Success page also has "Download Ticket (PDF)" button
- Verified: EO-5TA1SL — QR GET 200, PDF GET 200 (valid %PDF), email 202 with public URLs; PDF content extracted and confirmed (testing_agent subagent not available in toolset — verified via curl/browser/PDF extraction)

## QR Gate Scanner v14 (2026-08-05)
- /scanner route (admin-token protected, redirects to /admin login): camera QR scanning via html5-qrcode + manual Booking ID entry fallback
- POST /api/checkin/{reference} (Bearer-protected): marks checked_in + checked_in_at; returns ok / already (duplicate) / 404
- QR payload parsed: RAJAONAM-2026|EO-XXXXXX|name|guests → reference
- Result cards: green "Welcome, {name}!" with guests/sadhya/boating detail, orange "Already Checked In", red "Invalid Ticket"
- Admin dashboard: Gate Scanner link, Checked In stat card, CHECKED IN column (✓), checked_in in CSV export
- Verified: checkin ok → duplicate → 404 → 401 flows; UI manual entry all three states; camera NOT testable headless (needs real phone)

## Partial Check-In v15 (2026-08-05)
- Scanner now shows PER-PERSON checkboxes after scan (e.g. Sea Food Adult 1/2, Sea Food Kid 1); gatekeeper ticks who entered, submits
- Backend: POST /api/checkin/{ref} accepts counts per category, stores checked_in_counts (capped at booked), fully_checked_in flag; legacy checked_in bookings treated as fully in
- Result shows "2/3 checked in · 1 pending" or "all in"; re-scanning same QR shows already-in guests disabled, remaining tickable
- Dashboard: Guests Checked In stat (person count), column shows "2/3" (gold partial, green ✓ full), CSV "Guests Checked In" column
- Verified: EO-IXXUIE 2-of-3 partial → pending shown → re-scan completes 3/3; over-cap capped; zero selection rejected

## Gate Role v16 (2026-08-05)
- Separate gate login: gate@rajaonam.com / Gate@2026 (role "gate", seeded from env)
- Gate can ONLY: login (redirects to /scanner), scan/manual check-in. Blocked (403) from /api/admin/bookings + export; /admin redirects gate → /scanner; Dashboard link hidden on scanner for gate
- Backend: get_current_staff (admin+gate) for checkin, get_current_admin (admin-only) for bookings/export; login returns role
- Verified: gate login → /scanner, no dashboard access anywhere, check-in works; admin unaffected (25 bookings visible)

## WhatsApp Confirmations v17 (2026-08-07)
- Baileys WhatsApp microservice at /app/whatsapp-service (port 3001, supervisor program "whatsapp") — pairs with a WhatsApp number via QR (Linked Devices), no API keys
- After booking: WhatsApp message with QR image + full details caption, then ticket PDF link (phone normalized to 91XXXXXXXXXX); non-blocking, failure logged
- Admin dashboard: "WhatsApp Confirmations" card — live status (polls 15s), pairing QR image + pairing instructions, refresh button
- Backend proxies: GET /api/admin/whatsapp/status, GET /api/admin/whatsapp/qr-image (admin-only)
- Confirmation page text now mentions email + WhatsApp
- Verified: service running, pairing QR renders in dashboard, booking EO-5VJ1MR triggered send (503 until paired — EXPECTED)
- PENDING MANUAL STEP: user must scan the pairing QR in /admin with the WhatsApp number that will send tickets

## Razorpay Online Payments v18 (2026-08-08)
- TEST keys in backend/.env (RAZORPAY_KEY_ID/SECRET); razorpay==2.0.1 installed
- Flow: form → "Pay Online ₹X" (Razorpay checkout) OR "Pay at Venue" (instant confirm, as before)
- POST /api/payments/order: validates, creates pending_payment booking + Razorpay order (receipt=booking ref)
- POST /api/payments/verify: HMAC signature verify → status confirmed + payment_id → email + WhatsApp fire ONLY after verification
- Admin list/export show ONLY status=confirmed (pending_payment hidden)
- Confirmation shows Payment row (Online (Razorpay) / Pay at Venue)
- Verified: real order created (₹5,698), bad signature rejected, valid-signature verify → EO-JNTQRM confirmed + email 202, admin shows 27 confirmed only
- NOT completable in headless env: Razorpay test-mode mock bank page hangs — needs real device test (card 4111… rejected as international by this account; use netbanking/UPI in test)

## Clear Data + WhatsApp prod issue v19 (2026-08-08)
- DELETE /api/admin/bookings (admin-only) + "Clear Data" button on dashboard (confirm dialog) — works in both envs after redeploy
- Cleared all 39 test bookings from PREVIEW DB (dashboard now empty)
- FINDING: WhatsApp pairing QR shows in PREVIEW but NOT in production — the Baileys Node service (/app/whatsapp-service, supervisor program) is NOT part of the Emergent deployment (only frontend+backend deploy); prod /api/admin/whatsapp/status returns "All connection attempts failed". Needs Emergent Support to run the extra service in production, or a hosted WhatsApp API (Twilio/Meta) instead

## Razorpay LIVE v20 (2026-08-08)
- Switched to LIVE keys (rzp_live_...) in backend/.env — REAL MONEY now charged on completed payments
- "Pay at Venue" button REMOVED — online payment is the only booking path (backend /api/bookings endpoint still exists but unused by UI)
- Verified: live order created (order_TNHekfDTPGppas, ₹2,999), form shows only "Pay Online"

## Billed/Unbilled Dashboard v21 (2026-08-08)
- Clear Data button + DELETE endpoint REMOVED
- Dashboard splits Billed (status=confirmed, paid) vs Unbilled (status=pending_payment — filled form, started Razorpay, never paid)
- Billed/Unbilled stat cards + view tabs above table; stats/revenue computed from billed only; unbilled rows show "Not Paid" in maroon; export per view (rajaonam-bookings-billed/unbilled[-filter].csv)
- Verified: EO-NZL4VT billed (verified payment), EO-KCC1AU + EO-HNDT2O unbilled; tabs switch, export downloads per view

## Manual COMP Bookings v22 (2026-08-08)
- POST /api/admin/manual-booking (admin-only): ticket_type Guest/VIP Guest, creates confirmed booking with payment_mode "COMP", total ₹0, fires email + WhatsApp with QR
- Admin "Manual Booking (Complimentary)" card: type dropdown, name/phone/email, 6 participant counts, Generate → shows ref + QR + email confirmation
- Third view: Complimentary tab + stat card; COMP gold badge in payment column, VIP badge next to VIP names; ticket_type in CSV export; email/PDF show "Complimentary (COMP)" + ticket type
- Verified: EO-ZML8ZW (VIP, COMP, ₹0, email 202), UI generated EO-HMGLU7, comp tab 2 rows, gate role blocked (403)

## Twilio WhatsApp v23 (2026-08-08)
- Replaced Baileys companion service with Twilio WhatsApp API (twilio==9.10.9); works in BOTH preview and production (no companion service needed)
- Creds in backend/.env: TWILIO_ACCOUNT_SID (AC65...), TWILIO_API_KEY_SID/SECRET, TWILIO_WHATSAPP_FROM=whatsapp:+14155238886 (sandbox)
- send_whatsapp_confirmation: QR image + caption via media_url, then PDF link; non-blocking
- /api/admin/whatsapp/status now returns {connected: true, provider: twilio}
- BLOCKER: user's Twilio account is TRIAL — API returns "trial accounts have limited parameter access" even for plain text WhatsApp. Credentials verified valid (account fetch works). Needs: activate WhatsApp Sandbox in Twilio Console (Messaging → Try it out) + join sandbox from 9048599965, OR upgrade to paid account + register own sender
- Baileys service still exists at /app/whatsapp-service but is now UNUSED by backend

## SEO Metadata v24 (2026-08-08)
- index.html title: "RAJAONAM 2026 | Onam Celebration at Bolgatty Palace, Kochi, Kerala"
- Meta description: "Celebrate Raja Onam 2026 at Bolgatty Palace, Kochi on 26 August. Enjoy Mahabali's grand welcome, Onam Sadhya, Samudra Sadhya, games, music, cultural programs and family entertainment. Book tickets online."
- Hero.jsx: added h1 "Raja Onam 2026 – A Royal Onam Celebration at Bolgatty Palace" as sr-only (visual logo image preserved); verified title, h1 count=1, hero renders unchanged
- Admin dashboard card reorder (WhatsApp, Website QR, Manual Booking below bookings table) verified working from previous session

## Backlog
- P1: Confirm Twilio WhatsApp Sandbox activation with user (join code texted from their phone) and run live WhatsApp ticket test
- P2: Multi-date selection, QR ticket code, waitlist when slot full
- P2: Currency/locale switcher
- P2: Printable A4 marketing poster PDF with website QR + event details
