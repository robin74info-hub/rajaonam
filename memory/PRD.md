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

## Hero Copy + Email Venue Link v25 (2026-08-08)
- Hero.jsx: after logo now shows "RAJA ONAM 2026" heading + "Mahabali returns to Kerala for a grand celebration of Onam, bringing together tradition, culture, food, music and unforgettable family moments." (data-testids hero-heading, hero-description)
- server.py booking_email_html: added "📍 Venue Location — Open in Google Maps" link (https://maps.app.goo.gl/q6ZminHj9X8hBhBa6) right after the QR code block in confirmation emails
- Verified: hero renders both lines, backend syntax OK, email HTML generation includes maps link

## Footer Branding + Marquee Green v26 (2026-08-08)
- Marquee.jsx: scrolling text color changed gold → green (text-leaf)
- Organiser.jsx footer: email now admin@primetimeevents.in; "Presented By" logo replaced with prime-time-festivals.png; added "Event Managed By Prime Time Events" banner (event-managed-by.webp); added green "Get Directions" button below venue linking to https://maps.app.goo.gl/q6ZminHj9X8hBhBa6
- New assets in /app/frontend/public/assets/: prime-time-festivals.png, event-managed-by.webp
- Verified via screenshot: marquee green, footer logos render, email text, directions button href correct

## Booking Header + Footer Green v27 (2026-08-08)
- BookingPanel.jsx: form header now "RAJAONAM 2026 - GRAND ONAM CELEBRATION" with "Book Your Tickets" subline
- Organiser.jsx: Prime Time Festivals logo enlarged (h-24/28), Event Managed By banner reduced (h-9/10)
- App.js footer: background now green #1b5812 with cream text; "Berrysys Media Global LLC" is now an anchor to https://berrysysglobal.com/
- Verified via screenshots: header text, logo sizes, green footer, berrysys link href

## Brochure Open + COMP Passcode v28 (2026-08-08)
- BrochureButton.jsx: side button now OPENS the new "RAJAONAM 2026 EXPERIENCE.pdf" in a new tab (was forced download); new PDF (2.4MB) replaced at /assets/rajaonam-experience.pdf
- Manual complimentary booking now requires passcode PRIME26 before QR generation + email/WhatsApp send: backend validates COMP_PASSCODE env (403 on wrong/missing, case-insensitive); Admin.jsx form has "Passcode" password input (data-testid="manual-passcode-input")
- Verified: wrong/missing passcode rejected, "prime26" accepted → booking EO-OQ9WT5 created confirmed+comp

## Admin Billed-Only View v29 (2026-08-08)
- Admin.jsx: removed Unbilled and Complimentary stat cards, view tabs, and their data lists — dashboard now shows ONLY billed bookings ("Billed Bookings (n)" heading above table)
- Manual complimentary booking card remains functional (creates ticket + sends email/WhatsApp with PRIME26 passcode); comp bookings just aren't listed in the table
- Verified: stat-unbilled/stat-comp/view tabs absent, table shows billed rows only

## Dummy Data Cleanup v30 (2026-08-08)
- User clarified v29: keep the Unbilled + Complimentary tabs/stat cards — only the dummy DATA should go. Admin.jsx restored from git (tabs, stats, passcode field all intact)
- Deleted 7 dummy bookings from MongoDB: 2 unbilled (pending_payment) + 5 complimentary (COMP). Only real record remains: EO-NZL4VT "Paid Person" (Online Razorpay, ₹5,698)
- Verified: tabs show Billed (1) / Unbilled (0) / Complimentary (0); unbilled and comp tabs show "No bookings found"
- NOTE for future agents: DB is now production data — do NOT seed test bookings without flagging them

## Billed Data Cleared + Razorpay Live Verification v31 (2026-08-08)
- User asked to remove billed data too: deleted EO-NZL4VT "Paid Person" — bookings collection now completely EMPTY (0 records). Dashboard shows all zeros.
- User reported "test mode" + UPI failing on rajaonam.com (PRODUCTION). Diagnosis: production was deployed BEFORE live Razorpay keys were added — it still runs old test keys. Preview verified using rzp_live_TNHXkrBGaKvHUT (matches user-provided key/secret), live order creation works.
- User confirmed: Razorpay account fully activated, UPI enabled for live mode.
- FIX PENDING (user action): REDEPLOY the app so production picks up the live keys. UPI should work in live mode after redeploy.

## Safe Delete Feature v32 (2026-08-08)
- Backend: DELETE /api/admin/bookings/{reference} — deletes ONLY pending_payment (unbilled); COMP bookings require COMP_PASSCODE (PRIME26); paid/confirmed bookings are HARD BLOCKED server-side ("Paid bookings can never be deleted") — cannot be deleted even via direct API. POST /api/admin/bookings/clear-unbilled wipes all pending orders.
- Frontend Admin.jsx: Delete button per row appears ONLY on Unbilled + Complimentary tabs (Action column); billed tab has no Action column at all. Unbilled delete = confirm dialog; comp delete = passcode prompt; "Clear All Unbilled" button next to tabs (confirm dialog)
- Verified all 6 cases via API: billed blocked, comp blocked w/o + with wrong passcode, comp works with PRIME26, unbilled delete works, clear-all works. UI: 0 delete buttons on billed tab.
- After REDEPLOY: user can clean production dummy data ("Paid Person", "Prod Key Check", "Prod Key Check 2") via Unbilled tab delete. NOTE: "Paid Person" EO-NZL4VT on production is status=confirmed — if it's genuinely a test payment it CANNOT be deleted by design; refund via Razorpay dashboard if needed.

## Billed Delete with Passcode v33 (2026-08-08)
- User requested billed deletion too: DELETE /api/admin/bookings/{reference} now allows deleting PAID bookings with BILLED_DELETE_PASSCODE=ONAM26 (env). Without/with wrong passcode → 403. Unbilled still free-delete, COMP still uses PRIME26.
- Admin.jsx: Action column now on ALL tabs; billed delete = confirm dialog + passcode prompt (ONAM26)
- Verified: billed blocked w/o passcode, blocked with PRIME26 (wrong), works with onam26 (case-insensitive)

## Auto Sadhya Time Slots v34 (2026-08-09)
- User revised: NO frontend slot picker — backend AUTO-ASSIGNS slots. Removed all slot UI/state from BookingPanel.jsx
- server.py assign_sadhya_slots(): earliest slot with capacity wins; each slot max 250 per sadhya type (confirmed + pending count); sea+veg in one booking get the SAME slot; overflow rolls to next slot; all full → 400 error. Applied to /api/bookings, /api/payments/order, /api/admin/manual-booking
- Slots: 11:30–12:30, 12:30–1:30, 1:30–2:30, 2:30–3:30 (EVENT["sadhya_slots"], capacity EVENT["sadhya_slot_capacity"]=250)
- Email + PDF ticket include Sea Food Time Slot, Veg Time Slot, Boating slot (verified in generated PDF/email HTML)
- Admin: GET /api/admin/slot-report + "Time Slot Report" card (sea/veg per-slot x/250, boating pax per slot) below bookings table, auto-refresh 30s
- Verified: slot1 sea=244 + 10-pax booking → assigned slot 2; mixed sea+veg → same slot; veg-only → slot1; test data cleaned after
- Note: fixed BookingPanel.jsx corruption (duplicated lines at EOF) that blanked the landing page

## Combined Slot Capacity v35 (2026-08-09)
- User clarified: 250 limit is COMBINED (Sea Food + Veg together) per slot, not per type. assign_sadhya_slots() rewritten: per-slot combined count, earliest fitting slot wins, sea+veg same booking always same slot
- Admin slot report redesigned: one "Sadhya Time Slots (combined · max 250)" panel showing per-slot "Sea x · Veg y" breakdown + total/250, plus Boating pax panel
- Verified: 244 combined + 10 → slot 2; 244 + 6 (exactly 250) → fits slot 1 with same slot for sea+veg; 250 full → next booking to slot 2; report API returns sea/veg/total per slot. Test data cleaned.

## TEMP: Sea Adult Price ₹1 (2026-08-09)
- EVENT["sea_price_adult"] changed 2999 → 1 for live payment testing. REVERT TO 2999 after user finishes testing (user confirmed "later we will change")

## Single Slot Display + Comp Form Polish v36 (2026-08-09)
- Email + PDF ticket now show ONE "Sadhya Time Slot" row (sea/veg always share a slot — dual rows removed); confirmation screen also shows single "Sadhya Time Slot" row; boating time still shown in both
- Admin manual booking form: passcode input moved to last position (right above Generate button); labels renamed "Sea Food Adult" and "Sea Food Kid"
- Verified: mixed booking gets identical sea/veg slot, PDF & email contain exactly one slot row + boating time, form order correct in UI

## Price Restored v37 (2026-08-09)
- sea_price_adult restored 1 → 2999 after user's ₹1 live payment test. All prices back to normal: Sea 2999/1399, Veg 2699/1199. Remember: redeploy needed for production.

## UI/Email Copy Polish v38 (2026-08-09)
- Email greeting changed: "Your banana leaf is reserved" → "Your RajaOnam Celebration is Confirmed" (verified in generated HTML)
- Admin: "Manual Booking (Complimentary)" heading → "Complimentary Tickets"; passcode input now dark brown (#2B2118) with cream text to stand out, sits right above Generate

## Footer Text + Bottom Bar v39 (2026-08-09)
- Organiser.jsx: description below Prime Time Festivals logo replaced with "Creating celebrations worth remembering..." company profile text
- App.js footer: removed RAJAONAM 2026 wordmark + date/location line; bottom bar now only "Copyright 2026 RajaOnam · Powered by Berrysys Media Global LLC" in bright yellow (#FFD700) on green
- PENDING: user asked to change Prime Time Events logo "as per image attached" but no logo image came through — awaiting re-upload

## Footer Headline + New PTE Logo v40 (2026-08-09)
- "Creating celebrations worth remembering." now a dark green (#1b5812) serif headline above the description
- Event Managed By logo replaced with crop from user's attached footer.jpg (extracted "Event Managed By PRIME TIME EVENTS" region → /assets/event-managed-by.webp, 258x84)
- Verified via screenshot: headline renders green, new logo displays, yellow copyright bar intact

## PTE Logo Move v41 (2026-08-09)
- Replaced event-managed-by.webp with the user's new attached logo (2000x523, white bg, black "Event Managed By" header)
- Moved the managed-by logo from the left column to the RIGHT column, directly beneath the RajaOnam logo (w-56/64)
- Verified via screenshot: logo sits under RajaOnam logo, left column now Presented By festivals logo + tagline + description + contacts

## Sponsor QR Scanner v42 (2026-08-09)
- New role "sponsor" (sponsor@rajaonam.com / Sponsor@2026, env SPONSOR_EMAIL/SPONSOR_PASSWORD, seeded); login allows roles admin/gate/sponsor
- Frontend: /sponsor route (Sponsor.jsx) — own login, camera QR scan + manual booking-ID entry, item picker with per-unit checkboxes (Sea Food Adult/Kid, Veg Adult/Kid with unit prices), already-redeemed units disabled, Confirm Purchase
- Backend: GET /api/sponsor/booking/{ref} (sponsor role only, confirmed bookings only), POST /api/sponsor/redeem {reference, items{key:qty}} — server validates remaining count per item (double-redemption impossible), appends to booking.redemptions [{item,label,qty,price,at,by}]
- Admin: GET /api/admin/sponsor-redemptions + "Sponsor Redemptions" card (Booking ID, customer, item, qty, price, shop, redeemed at), auto-refresh 30s
- Verified end-to-end: login, fetch 4 items with prices, redeem 1 adult, re-redeem blocked ("only 1 left"), sponsor token blocked from admin APIs (403), UI flow Purchase Confirmed, admin card shows rows; test booking deleted afterwards

## Required-Fields Popup v43 (2026-08-09)
- BookingPanel.jsx: clicking Pay with incomplete form now opens a centered popup listing each missing field (label + reason) with "OK, Let Me Fill It" close; rendered outside the backdrop-blur aside so fixed positioning works
- Verified via UI test: empty form → popup lists Full Name/WhatsApp Number/Email, closes correctly

## Favicon v44 (2026-08-09)
- Prime Time "PT" logo set as site favicon: favicon.ico (64px), favicon-32.png, apple-touch-icon.png generated from primetime logo_fav.png; linked in index.html head; verified all serve 200

## Send-to-WhatsApp Button v45 (2026-08-10)
- Admin.jsx: green "WhatsApp" button per booking row (Action column) opens wa.me/{phone} (91 auto-prefixed for 10-digit numbers) with pre-filled message: greeting, Booking ID, guest counts (sea/veg split), Sadhya Time Slot, Boating slot+pax, amount + payment mode, ticket PDF link ({BACKEND_URL}/api/bookings/{ref}/ticket.pdf), event date/venue + maps link
- Verified via UI test: captured wa.me URL, message fully populated; test booking cleaned

## Route Rename v46 (2026-08-10)
- /scanner → /entry (gate scanner); /sponsor → /sponsors. Updated App.js routes + Admin.jsx navigations/redirects (gate login lands on /entry). Backend API paths unchanged (/api/sponsor/* stays).
- Verified: /entry loads scanner login flow, /sponsors loads Sponsor Login

## Slot Report Confirmed-Only + Payment Resume v47 (2026-08-10)
- Slot assignment (assign_sadhya_slots) and /api/admin/slot-report now count ONLY confirmed bookings (billed + complimentary) — unbilled/pending no longer occupy or display slot seats
- New guest-facing resume-payment page /pay/:reference (PayPage.jsx): GET /api/bookings/{ref}/public shows summary; POST /api/payments/resume/{ref} creates a FRESH Razorpay order for the SAME booking (updates razorpay_order_id); existing /payments/verify confirms it and fires email/WhatsApp
- Admin WhatsApp button: unbilled rows now send "Payment Pending — RajaOnam 2026" message with Amount to Pay and the /pay/{ref} link ("Complete your payment with the SAME Booking ID"); billed rows keep the confirmed-ticket message
- Verified: pending booking didn't appear in slot report, resume created live order for same ref (404 on bad ref), /pay page rendered with amount + pay button, pending WA message captured with correct heading and link; test booking cleaned

## VIP-Only Comp + Grand Email v48 (2026-08-10)
- Complimentary tickets: TICKET_TYPES now ["VIP Guest"] only; Admin comp form select has only VIP Guest; BookingCreate default ticket_type "VIP Guest"
- booking_email_html fully redesigned — royal maroon (#6B1A0F) + gold (#C9A227/#F5D47E) theme: "Prime Time Festivals Presents" header, gold divider, "Royal Booking Confirmed" greeting, gold-bordered details card, double-framed QR "Royal Entry Pass" with booking ID, maroon/gold PDF button, maroon footer
- Verified: comp booking works with VIP Guest, email HTML renders grand (screenshot reviewed); test booking cleaned

## VIP Ticket Label v49 (2026-08-10)
- Email + PDF: comp bookings no longer show "Total Amount — Complimentary (COMP)"; row now reads "Ticket: VIP Ticket". Paid bookings still show amount (label "Ticket"). Verified in generated email HTML and PDF text.

## Comp Blocked in Sponsor Scanner v50 (2026-08-10)
- GET /api/sponsor/booking/{ref} and POST /api/sponsor/redeem now reject COMP bookings: "Complimentary VIP tickets are not eligible for sponsor offers" (both lookup and direct redeem attempt blocked — verified via API)

## Referral Code RAJA05 v51 (2026-08-10)
- Groups of 10+ guests (adults+kids combined, both sadhya types) see an optional "Have a Referral Code?" box right above the Pay button; hidden below 10. Code RAJA05 (env REFERRAL_CODE) → 5% off total. Not mandatory — payment continues without it
- Backend booking_total applies 5% (round) only if referral_code matches AND total_participants >= 10 — tamper-proof; doc stores referral_code
- Frontend: apply/remove, invalid-code error, summary shows strikethrough original + discounted total + "you save ₹X" banner
- Verified: 10 pax+RAJA05 → ₹28,490 (5% off 29,990); 9 pax+code → full price; wrong code → full price; UI show/hide/apply/remove all pass

## VIP Display in Sponsor Scanner v52 (2026-08-10)
- Scanning a VIP/comp ticket in the sponsor scanner now shows a gold "Complimentary — VIP Ticket" screen with the guest's name and booking ID (not an error). Backend returns {vip:true,...} from sponsor booking lookup; redeem endpoint still blocks COMP
- Verified via UI: heading "VIP Ticket", guest name below, "not eligible for sponsor offers" note

## Terms & Conditions in Email + PDF v53 (2026-08-11)
- Chungath Jewellery logo (cropped from user's combined PNG, 390x148) saved to /app/frontend/public/assets/chungath-logo.png (email <img> via site URL) and /app/backend/assets/chungath-logo.png (PDF embed)
- server.py: ENTRY_TERMS (13) + REDEMPTION_TERMS (12) constants from user's docx; email shows centered Chungath logo above both T&C blocks (entry + Chungath 50% redemption terms); PDF gets a page 2 with centered logo + both numbered T&C lists
- Applies to all booked customers (confirmation email + ticket PDF). Verified: PDF 2 pages, image embedded on p2, both term sets in text; email HTML contains logo + all terms

## Corner Logos + Welcome Text v54 (2026-08-11)
- Email + PDF now show RajaOnam+Chungath combined logo top-LEFT and Prime Time Events logo top-RIGHT (assets: rajaonam-chungath.png, primetime-logo.png in frontend/public/assets + backend/assets)
- Removed the Chungath logo above T&C in both email and PDF
- Added welcome block before ticket details: green "WELCOME TO RAJAONAM 2026" heading + the Onam welcome paragraph
- Verified: PDF page1 has 3 images (2 logos + QR), welcome text present, T&C page has no logo; email HTML has both logos, welcome heading, no chungath-logo above T&C; asset URLs serve 200; test booking cleaned

## TEMP: Adult Prices ₹1 (2026-08-11)
- sea_price_adult 2999→1 AND veg_price_adult 2699→1 for user's dummy/live test bookings. REVERT both after testing (kids prices unchanged: 1399/1199)

## Dummy Mail Sent to User v55 (2026-08-11)
- Sent real confirmation email for dummy VIP comp booking EO-GAASYU to robin74info@gmail.com (HTTP 202 accepted) — showcases grand email, corner logos, welcome text, T&C
- testing_agent iteration_1.json: 11/11 backend tests passed (PDF structure, email content, admin visibility). Booking EO-GAASYU PRESERVED for user review
- Also fixed per test review: WhatsApp caption now shows "VIP Ticket" for comp bookings (was "Complimentary (COMP)")

## Prices Restored v56 (2026-08-11)
- sea_price_adult back to 2999, veg_price_adult back to 2699 (kids 1399/1199). Verified by testing_agent iteration_2.json: /api/event correct, Razorpay order for 1 adult = ₹2,999, comp vs paid T&C suite 10/10 green
- User: NO more test emails — email testing stopped
- Dummy bookings EO-GAASYU + EO-MIACEJ (robin74info@gmail.com) remain in DB for user to delete via ONAM26

## Email Header Restructure + Logo Fix v57 (2026-08-11)
- ROOT CAUSE of "broken logo in email": frontend /assets/* responses carry Cross-Origin-Resource-Policy: same-origin (blocks all cross-origin embedding incl. email clients). FIXED: new GET /api/email-assets/{filename} serves the 3 logos from backend/assets with no CORP header; email now uses /api/email-assets/ URLs
- Email: maroon header band removed; left (RajaOnam+Chungath) and right (Prime Time Events) logos now flank the "Your RajaOnam Celebration is Confirmed" greeting on cream background
- "Ticket Type: VIP Guest" row now shows ONLY for COMP bookings — removed from email, PDF, and WhatsApp caption for paid tickets
- Verified: all 3 images decode in browser (nw 600/1288/296), comp shows ticket type, paid doesn't; test suite 10/10 green

## Ticket Download Fix v58 (2026-08-11)
- ticket.pdf endpoint now Content-Disposition: attachment (was inline) — clicking the email button downloads the PDF directly
- Email button "Download Royal Ticket (PDF)" → "Download Ticket (PDF)"; ALL "Royal" strings removed from email HTML (tagline now "A Grand Onam Celebration", "Royal Entry Pass" → "Entry Pass")
- Verified by testing_agent iteration_3 + iteration_4: attachment headers, button text/URL, zero 'Royal' in email, suites 13/13 green

## Sponsor Purchase Dashboard v59 (2026-08-11)
- Sponsor page after login now lands on "Purchase Details — Chungath Jewellery" dashboard: per customer card with name, phone, booking ID, ticked (redeemed) items with price/time, and unchecked balance items left
- QR scanning moved behind a green "Scan Customer QR Code" button on top; scan view has a Back button; after redeem, "Done — Back to Purchases" returns to refreshed list (auto-refresh 30s)
- Backend: GET /api/sponsor/redemptions (sponsor role) returns bookings with redemptions + computed remaining items
- Verified end-to-end: paid booking + 1 redemption → dashboard shows ticked item + 2 balance items; test data cleaned

## Email Footer Text v60 (2026-08-11)
- Email footer now: "Copyright 2026 RajaOnam · Powered by Event Ticketing Solutions by Berrysys Media Global LLC" (Berrysys name is a link to berrysysglobal.com)

## Jingalala Fixed Banner v61 (2026-08-11)
- Jingalala.webp (Chungath 50% redemption offer banner) pinned fixed top-right corner on the landing page (w-20 sm:w-28, pointer-events-none, z-50) — stays visible while scrolling; verified position unchanged after scroll

## Jingalala Banner Behavior v62 (2026-08-11)
- Fixed banner enlarged (w-36 sm:w-52, readable) and now FADES OUT after the hero (opacity 0 beyond 70% viewport scroll)
- Large static Jingalala banner (w-64 sm:w-96) added centered right after the booking form
- Verified via screenshots: visible on hero, gone after scroll, centered banner below form

## Jingalala Marquee v63 (2026-08-11)
- Hero fixed banner enlarged again (w-44 sm:w-64)
- After-form banner changed from static centered image to a continuous scrolling marquee (3 repeated banners x2 halves, marquee-drift 24s) — verified moving via x-position delta

## Sponsor Report Shop Column v64 (2026-08-11)
- Admin Sponsor Redemptions: Shop column now displays "Chungath Jewellery" (was sponsor email)

## Gift Value in Sponsor Scanner v65 (2026-08-11)
- Each item checkbox in the sponsor scanner now shows a gold "Gift Value ₹X" chip = 50% of the item price (₹2,999 → ₹1,499.50, ₹1,399 → ₹699.50), formatted with paise

## New Logos + Mobile Banner v66 (2026-08-11)
- Jingalala banner image replaced with "Jingalala NEW.png" (red/gold banner) in both fixed corner + after-form marquee
- Hero: new combined RajaOnam+Chungath logo (ENGLISH CHUNGATH LOGO PNG.png → rajaonam-chungath.png, also updated backend/assets for email), "Oru Kottara Sadhya 2026" tagline text removed, logo moved up (-mt-4)
- Mobile (<640px): fixed banner hidden on hero, appears after hero top-right; desktop unchanged (shows on hero, fades after)
- Verified: desktop hero + mobile scroll behavior via screenshots

## Mobile Banner Window v67 (2026-08-11)
- Mobile fixed banner now visible ONLY in the gap between hero and booking form (shows after 55% viewport scroll, hides 230px before the form header) — verified opacity 0 → 1 → 0 across scroll positions

## Mobile Banner Removed v68 (2026-08-12)
- Fixed corner Jingalala banner now completely hidden on mobile (hidden sm:block) — mobile shows no floating right-side image; desktop unchanged. After-form scrolling marquee remains on all views.

## Adults Default 0 + New Boating Slots v69 (2026-08-12)
- Booking form Sea Food Adults default now 0 (was 2); reset also 0
- Boating slots now six 45-min slots: 11:00–11:45 AM, 12:00–12:45 PM, 1:00–1:45 PM, 2:00–2:45 PM, 3:00–3:45 PM, 4:00–4:45 PM (EVENT config drives frontend form + admin slot report)
- Verified by testing_agent iteration_5: 4/4 backend pytest + frontend UI checks (default 0, 6 new slots, required-fields popup at 0 adults, old slots rejected 400)

## Boating Capacity + Clash Rule v70 (2026-08-12)
- Each boating slot caps at 150 persons (EVENT["boating_slot_capacity"]); /api/slots/availability now returns boating counts + capacity; full slots show "Full" and are disabled in the frontend
- Sadhya auto-assignment now keeps a 30-min gap from the booked boating slot (helpers _slot_minutes, sadhya_boating_compatible); no clash possible
- Fixed corrupted duplicate seed/shutdown block at end of server.py found during this change
- Verified by testing_agent iteration_6: 7/7 pytest + frontend Full/disabled rendering; DB cleaned to empty

## PDF Background + Admin PDF Button v71 (2026-08-12)
- PDF ticket: ornate cream/gold frame background (pdf-bg.jpg, A4-cropped) on both pages; "RajaOnam 2026" heading removed; "(pay at venue)" removed; Jingalala banner right of ticket info; T&C tightened to fit one page (8.2pt, 0.5 spacing, auto-break off)
- Admin rows: gold PDF download button per booking (links to public /api/bookings/{ref}/ticket.pdf, attachment download)
- Verified by testing_agent iteration_7 (7/7 new tests). Old suites reference deleted dummy booking EO-MIACEJ — data dependency only, not a code issue
- NOT DONE: booking EO-FJB2BP boating change — that booking is on the PRODUCTION database, not accessible from preview. Needs an admin edit feature or production-side action

## PDF Background Alignment Fix v72 (2026-08-12)
- Background restored to FULL uncropped frame (768x1368), drawn aspect-preserved (fit by height, centered on cream page fill) — frame and top logos now perfectly aligned
- Copyright/powered-by line moved to LAST page (bottom of T&C page); page 1 clean
- COMP PDFs get the same 2-page background treatment (Entry Pass terms)
- Verified by testing_agent iteration_8: 20/20 tests green (paid + comp), visual render confirms frame intact. DB clean.

## T&C Page Background v73 (2026-08-12)
- Second (T&C) PDF page now uses the new no-logo background (2page.jpg → backend/assets/pdf-bg-terms.jpg); content starts at y=26 since no logos; page 1 keeps the logo background; verified visually via pdftoppm render

## T&C Padding Fix v74 (2026-08-12)
- PDF page 2 T&C text now padded inside the frame (x=35, width=140) with font 7.2pt (headings 10) — no text touches the ornate borders; applies to paid and COMP variants
- Verified by testing_agent iteration_9: 15/15 tests green incl. visual frame checks; DB clean

## New Page-1 Background + Contact Info v75 (2026-08-12)
- PDF page 1 background replaced with pdfpage1.jpg (frame + PTE logo top-right, Onam artwork bottom); standalone RajaOnam+Chungath logo (rajaonam-logo-big.png) drawn top-left at x=26,y=10,w=30 (same size as before); content starts y=46
- Page 2 (T&C) now ends with "Contact Us For More Information +91 90485 99965 | 99938 | 99968" above the copyright line (both comp + paid)
- Verified visually via pdftoppm renders of both pages; test data cleaned

## Admin Slot Editor v76 (2026-08-12)
- Admin rows now have an Edit button → inline row with Sadhya slot + Boating slot dropdowns (from /api/event) + dark passcode field + Save/Cancel. POST /api/admin/bookings/{ref}/slots requires ONAM26 passcode, validates slot values, applies same sadhya slot to sea+veg
- Verified: wrong passcode 403, invalid slot 400, correct edit updates both sea/veg + boating, UI row renders with prefilled values; slot report reflects edits. This lets user fix EO-FJB2BP on production after redeploy.

## Stale PDF Fix v77 (2026-08-12)
- Bug: after admin edits sadhya/boating slots, the downloaded ticket PDF showed old times (browser cached the PDF URL)
- Fix: ticket.pdf endpoint now sends Cache-Control: no-store/no-cache/must-revalidate + Pragma: no-cache + Expires: 0; PDF download links in Admin.jsx and BookingPanel.jsx get a ?t=<timestamp> cache-buster
- Bonus fix: PDF generation crashed (500) for legacy bookings missing total_participants/contests/games/veg_* fields — qr_payload + ticket rows now use safe .get() fallbacks
- Cleanup: dummy booking EO-LEGCY2 deleted from DB
- Verified end-to-end via API: edited sadhya slot 11:30→2:30 PM and boating slot 2:00→4:00 PM on EO-LEGACY, freshly downloaded PDF contained the NEW slots and not the old ones; reverted cleanly. Admin dashboard PDF link confirmed carrying cache-buster.

## Gift Value In Report v78 (2026-08-13)
- Admin Sponsor Redemptions report now shows per-row Ticket Value (qty × price) and Gift Value (50%) plus summary chips + totals footer row (Total Qty / Total Ticket Value / Total Gift Value) so operations can settle with Chungath Jewellery in one glance
- Backend: GET /api/admin/sponsor-redemptions response shape changed from list → `{rows:[...], totals:{qty, ticket_value, gift_value}}`; each row includes `ticket_value` and `gift_value` (float, .50 preserved)
- Frontend: Admin.jsx table adds "Ticket Value" + "Gift Value" columns, a `<tfoot>` totals row, and rounded chips above the table; new `fmtHalf` formatter shows ₹1,499.50 style with decimals only when needed
- Verified via curl: seeded 1× Sea Food Adult (₹2,999) redemption → API returned `gift_value: 1499.5`, `totals.gift_value: 1499.5`; test seed cleaned up

## Backlog
- P2: Slot Full Alerts — email when any sadhya slot crosses 200 guests (server.py)
- P1: Confirm Twilio WhatsApp Sandbox activation with user (join code texted from their phone) and run live WhatsApp ticket test
- P2: Multi-date selection, QR ticket code, waitlist when slot full
- P2: Currency/locale switcher
- P2: Printable A4 marketing poster PDF with website QR + event details
- Refactor: split server.py (~1,290 lines) into routes/models/services
