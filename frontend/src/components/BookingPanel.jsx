import { useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, Flower2, Check, Loader2, RotateCcw, Sailboat, Trophy, Users, Fish, Salad, Gamepad2 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const fmt = (n, sym) => `${sym}${n.toLocaleString("en-IN")}`;
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

const SectionTitle = ({ n, label }) => (
  <p className="text-xs tracking-[0.25em] uppercase font-bold text-maroon mb-4">
    <span className="text-gold mr-2">{n}</span>{label}
  </p>
);

const Stepper = ({ label, value, onChange, min = 0, id }) => (
  <div className="flex items-center justify-between border border-[#D8C7A5] rounded-full px-2 py-2 bg-[#FFFBF2]/70">
    <span className="text-sm font-semibold text-ink pl-3">{label}</span>
    <div className="flex items-center gap-3">
      <button
        type="button"
        data-testid={`${id}-decrement-btn`}
        aria-label={`Decrease ${label}`}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-8 h-8 rounded-full border border-[#D8C7A5] flex items-center justify-center text-ink hover:border-leaf hover:text-leaf transition-colors"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <span className="font-display text-xl text-ink w-6 text-center" data-testid={`${id}-count`}>{value}</span>
      <button
        type="button"
        data-testid={`${id}-increment-btn`}
        aria-label={`Increase ${label}`}
        onClick={() => onChange(Math.min(30, value + 1))}
        className="w-8 h-8 rounded-full border border-[#D8C7A5] flex items-center justify-center text-ink hover:border-leaf hover:text-leaf transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);

const YesNo = ({ value, onChange, id }) => (
  <div className="flex gap-2.5" role="radiogroup" data-testid={`${id}-group`}>
    {[["Yes", true], ["No", false]].map(([label, v]) => (
      <button
        key={label}
        type="button"
        role="radio"
        aria-selected={value === v}
        data-testid={`${id}-${label.toLowerCase()}-btn`}
        onClick={() => onChange(v)}
        className={`px-7 py-2 rounded-full border text-sm font-semibold transition-colors ${
          value === v ? "bg-leaf border-leaf text-cream" : "border-[#D8C7A5] text-ink hover:border-leaf bg-[#FFFBF2]/70"
        }`}
      >
        {label}
      </button>
    ))}
  </div>
);

const PillSelect = ({ options, selected, onToggle, id }) => (
  <div className="flex flex-wrap gap-2 mt-4" data-testid={`${id}-options`}>
    {options.map((o) => {
      const on = selected.includes(o);
      return (
        <button
          key={o}
          type="button"
          aria-pressed={on}
          data-testid={`${id}-option-${slug(o)}`}
          onClick={() => onToggle(o)}
          className={`px-4 py-2 rounded-full border text-xs font-semibold transition-colors ${
            on ? "bg-leaf border-leaf text-cream" : "border-[#D8C7A5] text-ink hover:border-leaf bg-[#FFFBF2]/70"
          }`}
        >
          {o}
        </button>
      );
    })}
  </div>
);

export default function BookingPanel({ event, onBooked }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [adults, setAdults] = useState(2);
  const [kids512, setKids512] = useState(0);
  const [kidsU5, setKidsU5] = useState(0);
  const [vegAdults, setVegAdults] = useState(0);
  const [vegKids512, setVegKids512] = useState(0);
  const [vegKidsU5, setVegKidsU5] = useState(0);
  const [joinContests, setJoinContests] = useState(null);
  const [contests, setContests] = useState([]);
  const [joinGames, setJoinGames] = useState(null);
  const [games, setGames] = useState([]);
  const [boating, setBoating] = useState(null);
  const [boatSlot, setBoatSlot] = useState(null);
  const [boatPersons, setBoatPersons] = useState(1);
  const [errors, setErrors] = useState({});
  const [phase, setPhase] = useState("idle");
  const [booking, setBooking] = useState(null);

  const sym = event?.currency_symbol || "₹";
  const seaA = event?.sea_price_adult ?? 2999;
  const seaK = event?.sea_price_kid ?? 1399;
  const vegA = event?.veg_price_adult ?? 2699;
  const vegK = event?.veg_price_kid ?? 1199;
  const totalParticipants = adults + kids512 + kidsU5 + vegAdults + vegKids512 + vegKidsU5;
  const total = adults * seaA + kids512 * seaK + vegAdults * vegA + vegKids512 * vegK;

  const toggle = (list, setList) => (item) =>
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = "Enter your full name";
    if (!/^[+\d][\d\s-]{6,14}$/.test(form.phone.trim())) e.phone = "Enter a valid WhatsApp number";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Enter a valid email";
    if (adults + vegAdults < 1) e.adults = "At least 1 adult required";
    if (boating === true && !boatSlot) e.boating = "Choose a boating time slot";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildPayload = (paymentMode) => ({
    name: form.name.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    adults,
    kids_5_12: kids512,
    kids_below_5: kidsU5,
    veg_adults: vegAdults,
    veg_kids_5_12: vegKids512,
    veg_kids_below_5: vegKidsU5,
    contests: joinContests ? contests : [],
    games: joinGames ? games : [],
    boating: boating === true,
    boating_slot: boating === true ? boatSlot : null,
    boating_persons: boating === true ? boatPersons : 0,
    payment_mode: paymentMode,
  });

  const pay = async () => {
    if (!validate() || phase !== "idle") return;
    setPhase("processing");
    try {
      const [res] = await Promise.all([
        axios.post(`${API}/bookings`, buildPayload("Pay at Venue")),
        new Promise((r) => setTimeout(r, 1600)),
      ]);
      setBooking(res.data);
      setPhase("done");
      onBooked?.();
    } catch (err) {
      setPhase("idle");
      const detail = err.response?.data?.detail;
      setErrors({ form: typeof detail === "string" ? detail : "Booking failed — try again" });
    }
  };

  const payOnline = async () => {
    if (!validate() || phase !== "idle") return;
    setPhase("processing");
    try {
      const sdkReady = await loadRazorpay();
      if (!sdkReady) throw new Error("sdk");
      const { data: order } = await axios.post(`${API}/payments/order`, buildPayload("Online (Razorpay)"));
      const rzp = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "RAJAONAM 2026",
        description: "Oru Kottara Sadhya · Bolgatty Palace",
        order_id: order.order_id,
        prefill: { name: form.name.trim(), email: form.email.trim(), contact: form.phone.trim() },
        theme: { color: "#1b5812" },
        handler: async (resp) => {
          try {
            const { data: booking } = await axios.post(`${API}/payments/verify`, resp);
            setBooking(booking);
            setPhase("done");
            onBooked?.();
          } catch (e) {
            setPhase("idle");
            setErrors({ form: "Payment verification failed — contact us with your payment ID" });
          }
        },
        modal: { ondismiss: () => setPhase("idle") },
      });
      rzp.on("payment.failed", () => {
        setPhase("idle");
        setErrors({ form: "Payment failed — try again" });
      });
      rzp.open();
    } catch (err) {
      setPhase("idle");
      const detail = err.response?.data?.detail;
      setErrors({ form: typeof detail === "string" ? detail : "Could not start payment — try again" });
    }
  };

  const reset = () => {
    setBooking(null);
    setPhase("idle");
    setForm({ name: "", phone: "", email: "" });
    setAdults(2);
    setKids512(0);
    setKidsU5(0);
    setVegAdults(0);
    setVegKids512(0);
    setVegKidsU5(0);
    setJoinContests(null);
    setContests([]);
    setJoinGames(null);
    setGames([]);
    setBoating(null);
    setBoatSlot(null);
    setBoatPersons(1);
    setErrors({});
  };

  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    setErrors({ ...errors, [k]: undefined });
  };

  return (
    <aside
      data-testid="booking-panel"
      className="w-full rounded-2xl border border-[#D8C7A5] bg-[#F1E3C6]/90 backdrop-blur-xl shadow-[0_25px_60px_rgba(138,106,42,0.28)] overflow-hidden"
    >
      <div className="flex items-center gap-3 px-7 pt-7 pb-5 border-b border-[#D8C7A5] bg-[#1b5812]">
        <span className="w-10 h-10 rounded-full bg-[#fabd8f]/15 border border-[#fabd8f]/40 flex items-center justify-center">
          <Flower2 className="w-5 h-5 text-[#fabd8f] animate-bloom" />
        </span>
        <div>
          <p className="font-serif text-lg leading-snug text-[#fabd8f]" data-testid="panel-event-name">
            RAJAONAM 2026 - GRAND ONAM CELEBRATION
          </p>
          <p className="text-[10px] tracking-[0.25em] uppercase text-[#fabd8f]/75 mt-1">Book Your Tickets</p>
        </div>
      </div>

      <div className="px-7 py-8">
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
                <p className="text-xs tracking-[0.25em] uppercase text-maroon mb-2">Booking Confirmed</p>
                <h3 className="font-serif text-3xl text-ink leading-tight">Your banana leaf is reserved.</h3>
              </div>
              <div className="w-full border border-[#D8C7A5] rounded-xl p-5 space-y-3 bg-[#FFFBF2]/80">
                <Row label="Booking ID" value={booking.reference} testid="confirmation-reference" mono />
                <Row label="Name" value={booking.name} testid="confirmation-name" />
                <Row label="Sea Food" value={`${booking.adults} Adults · ${booking.kids_5_12} Kids (5–12) · ${booking.kids_below_5} Below 5`} testid="confirmation-seafood" />
                <Row label="Veg" value={`${booking.veg_adults} Adults · ${booking.veg_kids_5_12} Kids (5–12) · ${booking.veg_kids_below_5} Below 5`} testid="confirmation-veg" />
                {booking.contests?.length > 0 && <Row label="Contests" value={booking.contests.join(", ")} testid="confirmation-contests" />}
                {booking.games?.length > 0 && <Row label="Games" value={booking.games.join(", ")} testid="confirmation-games" />}
                {booking.boating && <Row label="Boating" value={`${booking.boating_slot} · ${booking.boating_persons} persons`} testid="confirmation-boating" />}
                <Row label="Payment" value={booking.payment_mode || "Pay at Venue"} testid="confirmation-payment" />
                <div className="border-t border-[#D8C7A5] pt-3 flex justify-between items-baseline">
                  <span className="text-xs tracking-[0.2em] uppercase text-ash">Total Amount</span>
                  <span className="font-display text-2xl text-leaf" data-testid="confirmation-total">
                    {fmt(booking.total, booking.currency_symbol)}
                  </span>
                </div>
              </div>
              <div className="w-full flex flex-col items-center gap-3 border border-[#D8C7A5] rounded-xl p-6 bg-white" data-testid="confirmation-qr-block">
                <img
                  src={`${API}/bookings/${booking.reference}/qr`}
                  alt="Booking QR code"
                  className="w-44 h-44"
                  data-testid="confirmation-qr"
                />
                <p className="text-[10px] tracking-[0.25em] uppercase text-ash">Show this QR at the gate</p>
                <a
                  href={`${API}/bookings/${booking.reference}/ticket.pdf`}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="download-ticket-btn"
                  className="mt-1 px-6 py-2.5 rounded-full bg-[#1b5812] text-[#fabd8f] text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-[#12400c] transition-colors"
                >
                  Download Ticket (PDF)
                </a>
              </div>
              <p className="text-sm text-ash leading-relaxed">
                A confirmation email and a WhatsApp message with your QR ticket have been sent to <span className="text-ink font-semibold">{booking.email}</span> and <span className="text-ink font-semibold">{booking.phone}</span>.
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
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -16 }} className="space-y-9">
              <section>
                <SectionTitle n="01" label="Your Details" />
                <div className="space-y-5">
                  <div>
                    <input data-testid="name-input" value={form.name} onChange={set("name")} placeholder="Full name" className="underline-input" />
                    {errors.name && <p className="text-xs text-maroon mt-1.5" data-testid="name-error">{errors.name}</p>}
                  </div>
                  <div>
                    <input data-testid="phone-input" value={form.phone} onChange={set("phone")} placeholder="Mobile / WhatsApp number" type="tel" className="underline-input" />
                    {errors.phone && <p className="text-xs text-maroon mt-1.5" data-testid="phone-error">{errors.phone}</p>}
                  </div>
                  <div>
                    <input data-testid="email-input" value={form.email} onChange={set("email")} placeholder="Email address" type="email" className="underline-input" />
                    {errors.email && <p className="text-xs text-maroon mt-1.5" data-testid="email-error">{errors.email}</p>}
                  </div>
                </div>
              </section>

              <section>
                <SectionTitle n="02" label="Sadhya — Participants" />
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="border border-[#D8C7A5] rounded-xl p-4 bg-[#FFFBF2]/50">
                    <p className="text-sm font-bold text-ink mb-1 flex items-center gap-2" data-testid="seafood-title">
                      <Fish className="w-4 h-4 text-leaf" /> Sea Food Sadhya
                    </p>
                    <p className="text-[9px] tracking-wider uppercase text-ash mb-2.5">(package rates)</p>
                    <div className="space-y-2.5">
                      <Stepper label={`Adults · ${fmt(seaA, sym)}`} value={adults} onChange={setAdults} id="adults" />
                      <Stepper label={`Kids (5–12) · ${fmt(seaK, sym)}`} value={kids512} onChange={setKids512} id="kids-5-12" />
                      <Stepper label="Kids (Below 5) · Free" value={kidsU5} onChange={setKidsU5} id="kids-below-5" />
                    </div>
                  </div>
                  <div className="border border-[#D8C7A5] rounded-xl p-4 bg-[#FFFBF2]/50">
                    <p className="text-sm font-bold text-ink mb-1 flex items-center gap-2" data-testid="veg-title">
                      <Salad className="w-4 h-4 text-leaf" /> Veg Onam Sadhya
                    </p>
                    <p className="text-[9px] tracking-wider uppercase text-ash mb-2.5">(package rates)</p>
                    <div className="space-y-2.5">
                      <Stepper label={`Adults · ${fmt(vegA, sym)}`} value={vegAdults} onChange={setVegAdults} id="veg-adults" />
                      <Stepper label={`Kids (5–12) · ${fmt(vegK, sym)}`} value={vegKids512} onChange={setVegKids512} id="veg-kids-5-12" />
                      <Stepper label="Kids (Below 5) · Free" value={vegKidsU5} onChange={setVegKidsU5} id="veg-kids-below-5" />
                    </div>
                  </div>
                </div>
                {errors.adults && <p className="text-xs text-maroon mt-2" data-testid="adults-error">{errors.adults}</p>}
                <p className="text-xs text-ash mt-3 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-leaf" />
                  Total participants: <span className="font-bold text-ink" data-testid="participants-total">{totalParticipants}</span>
                </p>
              </section>

              <section>
                <SectionTitle n="03" label="Contest Participation" />
                <p className="text-sm text-ash mb-3 flex items-center gap-2"><Trophy className="w-4 h-4 text-gold" /> Would you like to participate in the contests?</p>
                <YesNo value={joinContests} onChange={(v) => { setJoinContests(v); if (!v) setContests([]); }} id="contests" />
                {joinContests && <PillSelect options={event?.contests || []} selected={contests} onToggle={toggle(contests, setContests)} id="contest" />}
              </section>

              <section>
                <SectionTitle n="04" label="Traditional Games" />
                <p className="text-sm text-ash mb-3 flex items-center gap-2"><Gamepad2 className="w-4 h-4 text-leaf" /> Would you like to participate in the traditional games?</p>
                <YesNo value={joinGames} onChange={(v) => { setJoinGames(v); if (!v) setGames([]); }} id="games" />
                {joinGames && <PillSelect options={event?.games || []} selected={games} onToggle={toggle(games, setGames)} id="game" />}
              </section>

              <section>
                <SectionTitle n="05" label="Boating Experience" />
                <p className="text-sm text-ash mb-3 flex items-center gap-2"><Sailboat className="w-4 h-4 text-leaf" /> Would you like to enjoy the boating experience?</p>
                <YesNo value={boating} onChange={(v) => { setBoating(v); if (!v) { setBoatSlot(null); } }} id="boating" />
                {boating && (
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-2" role="radiogroup" data-testid="boating-slots">
                      {(event?.boating_slots || []).map((t, i) => (
                        <button
                          key={t}
                          type="button"
                          role="radio"
                          aria-selected={boatSlot === t}
                          data-testid={`boating-slot-${i}`}
                          onClick={() => { setBoatSlot(t); setErrors({ ...errors, boating: undefined }); }}
                          className={`px-3 py-2.5 rounded-full border text-xs font-semibold transition-colors ${
                            boatSlot === t ? "bg-leaf border-leaf text-cream" : "border-[#D8C7A5] text-ink hover:border-leaf bg-[#FFFBF2]/70"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    {errors.boating && <p className="text-xs text-maroon" data-testid="boating-error">{errors.boating}</p>}
                    <Stepper label="Number of persons" value={boatPersons} onChange={setBoatPersons} min={1} id="boating-persons" />
                  </div>
                )}
              </section>

              <section className="border border-[#D8C7A5] rounded-xl p-5 bg-[#FFFBF2]/80 space-y-2.5" data-testid="booking-summary">
                <p className="text-xs tracking-[0.25em] uppercase font-bold text-maroon mb-3">Booking Summary</p>
                <Row label="Sea Food Sadhya" value={`${adults}A · ${kids512}K · ${kidsU5} below 5`} testid="summary-seafood" />
                <Row label="Veg Onam Sadhya" value={`${vegAdults}A · ${vegKids512}K · ${vegKidsU5} below 5`} testid="summary-veg" />
                <Row label="Total Participants" value={String(totalParticipants)} testid="summary-total-participants" />
                <Row label="Contests" value={joinContests && contests.length ? contests.join(", ") : "—"} testid="summary-contests" />
                <Row label="Games" value={joinGames && games.length ? games.join(", ") : "—"} testid="summary-games" />
                <Row label="Boating" value={boating && boatSlot ? `${boatSlot} · ${boatPersons} persons` : "—"} testid="summary-boating" />
                <div className="border-t border-[#D8C7A5] pt-3 flex items-end justify-between">
                  <p className="text-[10px] tracking-[0.25em] uppercase text-ash">Total Ticket Amount</p>
                  <div className="text-right">
                    <p className="font-display text-4xl text-leaf leading-none" data-testid="total-price">{fmt(total, sym)}</p>
                    <p className="text-[9px] tracking-wider uppercase text-ash mt-1">(package rates)</p>
                  </div>
                </div>
              </section>

              <button
                data-testid="pay-online-btn"
                onClick={payOnline}
                disabled={phase === "processing"}
                className="w-full py-4 rounded-full bg-leaf text-cream text-sm font-bold tracking-[0.2em] uppercase hover:bg-[#14523A] transition-colors disabled:opacity-80 flex items-center justify-center gap-3 shadow-[0_15px_35px_rgba(30,107,74,0.3)]"
              >
                {phase === "processing" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing…
                  </>
                ) : (
                  <>Pay Online {fmt(total, sym)}</>
                )}
              </button>
              <p className="text-[10px] text-ash text-center tracking-wider">Secure online payment via Razorpay · UPI, cards, net banking & wallets</p>
              {errors.form && <p className="text-xs text-maroon text-center" data-testid="form-error">{errors.form}</p>}
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
