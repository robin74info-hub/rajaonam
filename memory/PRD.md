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

## Backlog
- P0: Real payment gateway (Stripe/Razorpay) when user wants live charges
- P1: Email confirmation (Resend) to guest after booking
- P1: Admin/organizer view of bookings
- P2: Multi-date selection, QR ticket code, waitlist when slot full
- P2: Currency/locale switcher
