import { useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, Flower2, Check, Loader2, Ticket, RotateCcw } from "lucide-react";

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
    if (!slotId) e.slot = "Choose a sadhya slot";
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
      className="w-full lg:sticky lg:top-8 rounded-2xl border border-[#D8C7A5] bg-[#F1E3C6]/90 backdrop-blur-xl shadow-[0_25px_60px_rgba(138,106,42,0.28)] overflow-hidden"
    >
      <div className="flex items-center gap-3 px-7 pt-7 pb-5 border-b border-[#D8C7A5] bg-[#E7D3AC]/70">
        <span className="w-10 h-10 rounded-full bg-leaf/10 border border-leaf/25 flex items-center justify-center">
          <Flower2 className="w-5 h-5 text-leaf animate-bloom" />
        </span>
        <div>
          <p className="font-serif text-xl leading-none text-ink" data-testid="panel-event-name">
            {event?.name || "RajaoNam"}
          </p>
          <p className="text-[10px] tracking-[0.25em] uppercase text-maroon mt-1">{event?.edition || "Grand Onam Celebration"}</p>
        </div>
      </div>

      <div className="px-7 py-7">
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
              <span className="w-14 h-14 rounded-full bg-leaf/10 border border-leaf/30 flex items-center justify-center">
                <Check className="w-6 h-6 text-leaf" />
              </span>
              <div>
                <p className="text-xs tracking-[0.25em] uppercase text-maroon mb-2">Payment Successful</p>
                <h3 className="font-serif text-3xl text-ink leading-tight">Your banana leaf is reserved.</h3>
              </div>
              <div className="w-full border border-[#D8C7A5] rounded-xl p-5 space-y-3 bg-[#FFFBF2]/80">
                <Row label="Booking Ref" value={booking.reference} testid="confirmation-reference" mono />
                <Row label="Name" value={booking.name} testid="confirmation-name" />
                <Row label="Slot" value={`${booking.slot_label} · ${booking.slot_time}`} testid="confirmation-slot" />
                <Row label="Guests" value={String(booking.guests)} testid="confirmation-guests" />
                <div className="border-t border-[#E4D6BC] pt-3 flex justify-between items-baseline">
                  <span className="text-xs tracking-[0.2em] uppercase text-ash">Paid</span>
                  <span className="font-display text-2xl text-leaf" data-testid="confirmation-total">
                    {fmt(booking.total, booking.currency_symbol)}
                  </span>
                </div>
              </div>
              <p className="text-sm text-ash leading-relaxed">
                A confirmation has been sent to <span className="text-ink font-semibold">{booking.email}</span>. Show your booking reference at the tharavadu gate.
              </p>
              <button
                data-testid="book-another-btn"
                onClick={reset}
                className="flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-ash hover:text-leaf transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Make another booking
              </button>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -16 }} className="space-y-7">
              <div>
                <p className="text-xs tracking-[0.25em] uppercase font-bold text-maroon mb-4 flex items-center gap-2">
                  <Ticket className="w-3.5 h-3.5" /> Reserve Your Seating Time
                </p>
                <div className="space-y-2.5" role="radiogroup" aria-label="Sadhya slots" data-testid="slot-group">
                  {event?.slots?.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      role="radio"
                      aria-selected={slotId === s.id}
                      data-testid={`slot-pill-${s.id}`}
                      onClick={() => { setSlotId(s.id); setErrors({ ...errors, slot: undefined }); }}
                      className={`w-full flex items-center justify-between border rounded-full px-5 py-3.5 transition-colors cursor-pointer ${
                        slotId === s.id
                          ? "bg-leaf border-leaf text-cream"
                          : "border-[#D8C7A5] text-ink hover:border-leaf bg-[#FFFBF2]/70"
                      }`}
                    >
                      <span className="text-sm font-semibold">{s.label}</span>
                      <span className={`text-xs ${slotId === s.id ? "text-cream/80" : "text-ash"}`}>{s.time}</span>
                    </button>
                  ))}
                </div>
                {errors.slot && <p className="text-xs text-maroon mt-2" data-testid="slot-error">{errors.slot}</p>}
              </div>

              <div>
                <p className="text-xs tracking-[0.25em] uppercase font-bold text-maroon mb-3">Number of People</p>
                <div className="flex items-center justify-between border border-[#D8C7A5] rounded-full px-2 py-2 bg-[#FFFBF2]/70">
                  <button
                    type="button"
                    data-testid="guest-decrement-btn"
                    aria-label="Decrease guests"
                    onClick={() => setGuests(Math.max(1, guests - 1))}
                    className="w-9 h-9 rounded-full border border-[#D8C7A5] flex items-center justify-center text-ink hover:border-leaf hover:text-leaf transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-display text-2xl text-ink" data-testid="guest-count">{guests}</span>
                  <button
                    type="button"
                    data-testid="guest-increment-btn"
                    aria-label="Increase guests"
                    onClick={() => setGuests(Math.min(10, guests + 1))}
                    className="w-9 h-9 rounded-full border border-[#D8C7A5] flex items-center justify-center text-ink hover:border-leaf hover:text-leaf transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <input data-testid="name-input" value={form.name} onChange={set("name")} placeholder="Full name" className="underline-input" />
                  {errors.name && <p className="text-xs text-maroon mt-1.5" data-testid="name-error">{errors.name}</p>}
                </div>
                <div>
                  <input data-testid="phone-input" value={form.phone} onChange={set("phone")} placeholder="Phone number" type="tel" className="underline-input" />
                  {errors.phone && <p className="text-xs text-maroon mt-1.5" data-testid="phone-error">{errors.phone}</p>}
                </div>
                <div>
                  <input data-testid="email-input" value={form.email} onChange={set("email")} placeholder="Email address" type="email" className="underline-input" />
                  {errors.email && <p className="text-xs text-maroon mt-1.5" data-testid="email-error">{errors.email}</p>}
                </div>
              </div>

              <div className="border-t border-[#E4D6BC] pt-5 flex items-end justify-between">
                <div>
                  <p className="text-[10px] tracking-[0.25em] uppercase text-ash mb-1">
                    {fmt(event?.price_per_person || 0, sym)} × {guests} {guests === 1 ? "guest" : "guests"}
                  </p>
                  <p className="font-display text-5xl text-leaf leading-none" data-testid="total-price">{fmt(total, sym)}</p>
                </div>
                <p className="text-[10px] text-ash text-right leading-relaxed">full sadhya<br />included</p>
              </div>

              <button
                data-testid="pay-button"
                onClick={pay}
                disabled={phase === "processing"}
                className="w-full py-4 rounded-full bg-leaf text-cream text-sm font-bold tracking-[0.2em] uppercase hover:bg-[#14523A] transition-colors disabled:opacity-80 flex items-center justify-center gap-3 shadow-[0_15px_35px_rgba(30,107,74,0.3)]"
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
    <span className={`text-sm text-ink text-right ${mono ? "font-mono tracking-widest text-maroon" : ""}`} data-testid={testid}>{value}</span>
  </div>
);
