import { useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, Flame, Check, Loader2, Ticket, RotateCcw } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const fmt = (n, sym) => `${sym}${n.toLocaleString("en-IN")}`;

export default function BookingPanel({ event, onBooked }) {
  const [slotId, setSlotId] = useState(null);
  const [guests, setGuests] = useState(2);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [errors, setErrors] = useState({});
  const [phase, setPhase] = useState("idle");
  const [booking, setBooking] = useState(null);

  const total = event ? guests * event.price_per_person : 0;
  const sym = event?.currency_symbol || "₹";

  const validate = () => {
    const e = {};
    if (!slotId) e.slot = "Choose a time slot";
    if (form.name.trim().length < 2) e.name = "Enter your full name";
    if (!/^[+\d][\d\s-]{6,14}$/.test(form.phone.trim())) e.phone = "Enter a valid phone number";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Enter a valid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const pay = async () => {
    if (!validate() || phase !== "idle") return;
    setPhase("processing");
    try {
      const [res] = await Promise.all([
        axios.post(`${API}/bookings`, { ...form, name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), guests, slot_id: slotId }),
        new Promise((r) => setTimeout(r, 1600)),
      ]);
      setBooking(res.data);
      setPhase("done");
      onBooked?.();
    } catch (err) {
      setPhase("idle");
      setErrors({ slot: err.response?.data?.detail || "Payment failed — try again" });
    }
  };

  const reset = () => {
    setBooking(null);
    setPhase("idle");
    setSlotId(null);
    setGuests(2);
    setForm({ name: "", phone: "", email: "" });
    setErrors({});
  };

  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    setErrors({ ...errors, [k]: undefined });
  };

  return (
    <aside
      data-testid="booking-panel"
      className="w-full lg:w-[35%] lg:fixed lg:inset-y-0 lg:left-0 lg:h-screen z-40 bg-[#0A0A0A]/75 backdrop-blur-3xl border-b lg:border-b-0 lg:border-r border-white/5 flex flex-col"
    >
      <div className="flex items-center gap-3 px-8 pt-8 pb-6 border-b border-white/5">
        <span className="w-9 h-9 rounded-full bg-flame/15 border border-flame/30 flex items-center justify-center">
          <Flame className="w-4 h-4 text-flame animate-ember" />
        </span>
        <div>
          <p className="font-serif text-xl leading-none text-bone" data-testid="panel-event-name">
            {event?.name || "Ember & Oak"}
          </p>
          <p className="text-[10px] tracking-[0.25em] uppercase text-saffron mt-1">{event?.edition || "3rd Edition"}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-8">
        <AnimatePresence mode="wait">
          {phase === "done" && booking ? (
            <motion.div
              key="confirmation"
              data-testid="booking-confirmation"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-start gap-6"
            >
              <span className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center">
                <Check className="w-6 h-6 text-emerald-400" />
              </span>
              <div>
                <p className="text-xs tracking-[0.25em] uppercase text-saffron mb-2">Payment Successful</p>
                <h3 className="font-serif text-4xl text-bone leading-tight">Your table by the fire awaits.</h3>
              </div>
              <div className="w-full border border-white/10 rounded-lg p-5 space-y-3 bg-white/[0.02]">
                <Row label="Booking Ref" value={booking.reference} testid="confirmation-reference" mono />
                <Row label="Name" value={booking.name} testid="confirmation-name" />
                <Row label="Slot" value={`${booking.slot_label} · ${booking.slot_time}`} testid="confirmation-slot" />
                <Row label="Guests" value={String(booking.guests)} testid="confirmation-guests" />
                <div className="border-t border-white/10 pt-3 flex justify-between items-baseline">
                  <span className="text-xs tracking-[0.2em] uppercase text-ash">Paid</span>
                  <span className="font-display text-2xl text-saffron" data-testid="confirmation-total">
                    {fmt(booking.total, booking.currency_symbol)}
                  </span>
                </div>
              </div>
              <p className="text-sm text-ash leading-relaxed">
                A confirmation has been sent to <span className="text-bone">{booking.email}</span>. Show your booking reference at the gate.
              </p>
              <button
                data-testid="book-another-btn"
                onClick={reset}
                className="flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-ash hover:text-flame transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Make another booking
              </button>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -16 }} className="space-y-8">
              <div>
                <p className="text-xs tracking-[0.25em] uppercase font-bold text-saffron mb-4 flex items-center gap-2">
                  <Ticket className="w-3.5 h-3.5" /> Reserve Your Seating
                </p>
                <div className="space-y-2.5" role="radiogroup" aria-label="Time slots" data-testid="slot-group">
                  {event?.slots?.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      role="radio"
                      aria-selected={slotId === s.id}
                      data-testid={`slot-pill-${s.id}`}
                      onClick={() => { setSlotId(s.id); setErrors({ ...errors, slot: undefined }); }}
                      className={`w-full flex items-center justify-between border rounded-full px-5 py-3 transition-colors cursor-pointer ${
                        slotId === s.id
                          ? "bg-flame border-flame text-white"
                          : "border-white/20 text-bone hover:border-flame"
                      }`}
                    >
                      <span className="text-left">
                        <span className="block text-sm font-semibold">{s.label}</span>
                        <span className={`block text-xs ${slotId === s.id ? "text-white/70" : "text-ash"}`}>{s.time}</span>
                      </span>
                      <span className={`text-[10px] tracking-widest uppercase ${slotId === s.id ? "text-white/80" : s.remaining < 20 ? "text-ember" : "text-ash"}`}>
                        {s.remaining} left
                      </span>
                    </button>
                  ))}
                </div>
                {errors.slot && <p className="text-xs text-ember mt-2" data-testid="slot-error">{errors.slot}</p>}
              </div>

              <div>
                <p className="text-xs tracking-[0.25em] uppercase font-bold text-saffron mb-3">Guests</p>
                <div className="flex items-center justify-between border border-white/15 rounded-full px-2 py-2">
                  <button
                    type="button"
                    data-testid="guest-decrement-btn"
                    aria-label="Decrease guests"
                    onClick={() => setGuests(Math.max(1, guests - 1))}
                    className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center text-bone hover:border-flame hover:text-flame transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-display text-2xl text-bone" data-testid="guest-count">{guests}</span>
                  <button
                    type="button"
                    data-testid="guest-increment-btn"
                    aria-label="Increase guests"
                    onClick={() => setGuests(Math.min(10, guests + 1))}
                    className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center text-bone hover:border-flame hover:text-flame transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <input data-testid="name-input" value={form.name} onChange={set("name")} placeholder="Full name" className="underline-input" />
                  {errors.name && <p className="text-xs text-ember mt-1.5" data-testid="name-error">{errors.name}</p>}
                </div>
                <div>
                  <input data-testid="phone-input" value={form.phone} onChange={set("phone")} placeholder="Phone number" type="tel" className="underline-input" />
                  {errors.phone && <p className="text-xs text-ember mt-1.5" data-testid="phone-error">{errors.phone}</p>}
                </div>
                <div>
                  <input data-testid="email-input" value={form.email} onChange={set("email")} placeholder="Email address" type="email" className="underline-input" />
                  {errors.email && <p className="text-xs text-ember mt-1.5" data-testid="email-error">{errors.email}</p>}
                </div>
              </div>

              <div className="border-t border-white/10 pt-5 flex items-end justify-between">
                <div>
                  <p className="text-[10px] tracking-[0.25em] uppercase text-ash mb-1">
                    {fmt(event?.price_per_person || 0, sym)} × {guests} {guests === 1 ? "guest" : "guests"}
                  </p>
                  <p className="font-display text-5xl text-saffron leading-none" data-testid="total-price">{fmt(total, sym)}</p>
                </div>
                <p className="text-[10px] text-ash text-right leading-relaxed">incl. all<br />tastings</p>
              </div>

              <button
                data-testid="pay-button"
                onClick={pay}
                disabled={phase === "processing"}
                className="w-full py-4 rounded-full bg-flame text-white text-sm font-bold tracking-[0.2em] uppercase hover:bg-ember transition-colors disabled:opacity-80 flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(255,90,0,0.25)]"
              >
                {phase === "processing" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing…
                  </>
                ) : (
                  <>Pay {fmt(total, sym)}</>
                )}
              </button>
              <p className="text-[10px] text-ash text-center tracking-wider">Demo checkout — no real charge is made</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}

const Row = ({ label, value, testid, mono }) => (
  <div className="flex justify-between items-baseline gap-4">
    <span className="text-xs tracking-[0.2em] uppercase text-ash shrink-0">{label}</span>
    <span className={`text-sm text-bone text-right ${mono ? "font-mono tracking-widest text-saffron" : ""}`} data-testid={testid}>{value}</span>
  </div>
);
