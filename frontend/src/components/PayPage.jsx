import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { Check, Loader2, AlertTriangle } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function PayPage() {
  const { reference } = useParams();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    axios
      .get(`${API}/bookings/${reference}/public`)
      .then((r) => setBooking(r.data))
      .catch((e) => setError(e.response?.data?.detail || "Booking not found"));
  }, [reference]);

  const pay = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const sdkReady = await loadRazorpay();
      if (!sdkReady) throw new Error("Payment SDK failed to load");
      const { data: order } = await axios.post(`${API}/payments/resume/${reference}`);
      const rzp = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "RAJAONAM 2026",
        description: `Booking ${order.reference}`,
        order_id: order.order_id,
        prefill: { name: order.name, email: order.email, contact: order.phone },
        theme: { color: "#1b5812" },
        handler: async (resp) => {
          try {
            await axios.post(`${API}/payments/verify`, resp);
            setPaid(true);
          } catch {
            setError("Payment verification failed — contact the organiser with your Booking ID");
          }
        },
      });
      rzp.on("payment.failed", () => setError("Payment failed or cancelled — you can try again"));
      rzp.open();
    } catch (e) {
      setError(e.response?.data?.detail || e.message || "Could not start payment");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" data-testid="pay-page">
      <div className="w-full max-w-md rounded-2xl border border-[#D8C7A5] bg-[#F1E3C6]/90 overflow-hidden shadow-[0_25px_60px_rgba(138,106,42,0.28)]">
        <div className="px-7 py-5 bg-[#1b5812]">
          <p className="font-serif text-lg text-[#fabd8f]" data-testid="pay-title">RAJAONAM 2026 — Complete Your Payment</p>
          <p className="text-[10px] tracking-[0.25em] uppercase text-[#fabd8f]/75 mt-1">Booking {reference}</p>
        </div>
        <div className="px-7 py-8">
          {paid ? (
            <div className="text-center" data-testid="pay-success">
              <span className="w-14 h-14 rounded-full bg-leaf/15 border border-leaf/40 flex items-center justify-center mx-auto mb-4">
                <Check className="w-7 h-7 text-leaf" />
              </span>
              <p className="font-serif text-2xl text-ink mb-2">Payment Confirmed!</p>
              <p className="text-sm text-ash">Your ticket is on its way to your email and WhatsApp. Show the QR at the gate.</p>
            </div>
          ) : error && !booking ? (
            <div className="text-center" data-testid="pay-error">
              <AlertTriangle className="w-8 h-8 text-maroon mx-auto mb-3" />
              <p className="font-serif text-2xl text-ink mb-2">Booking Not Found</p>
              <p className="text-sm text-ash mb-5">{error}</p>
              <Link to="/" data-testid="pay-home-link" className="inline-block px-7 py-3 rounded-full bg-[#1b5812] text-[#fabd8f] text-xs font-bold tracking-[0.2em] uppercase">Book Fresh Ticket</Link>
            </div>
          ) : booking ? (
            <div data-testid="pay-summary">
              <div className="bg-white rounded-xl border border-[#E4D6BC] p-4 mb-5 text-sm">
                <div className="flex justify-between py-1"><span className="text-ash">Guest</span><span className="font-semibold text-ink">{booking.name}</span></div>
                <div className="flex justify-between py-1"><span className="text-ash">Status</span><span className="font-semibold text-maroon">Payment Pending</span></div>
                <div className="flex justify-between py-1 border-t border-[#F1E3C6] mt-1 pt-2"><span className="text-ash">Amount</span><span className="font-bold text-leaf text-base" data-testid="pay-amount">{fmt(booking.total)}</span></div>
              </div>
              {error && <p className="text-xs text-maroon mb-3" data-testid="pay-inline-error">{error}</p>}
              <button
                data-testid="pay-now-btn"
                onClick={pay}
                disabled={busy}
                className="w-full py-3.5 rounded-full bg-[#1b5812] text-[#fabd8f] text-xs font-bold tracking-[0.2em] uppercase hover:bg-[#12400c] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : `Pay ${fmt(booking.total)} Securely`}
              </button>
              <p className="text-[11px] text-ash text-center mt-3">Same Booking ID {booking.reference} — no need to book again.</p>
            </div>
          ) : (
            <p className="text-sm text-ash flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading booking…</p>
          )}
        </div>
      </div>
    </div>
  );
}
