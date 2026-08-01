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

## Backlog
- P0: Real payment gateway (Stripe/Razorpay) when user wants live charges
- P1: Email confirmation (Resend) to guest after booking
- P1: Admin/organizer view of bookings
- P2: Multi-date selection, QR ticket code, waitlist when slot full
- P2: Currency/locale switcher
