import { useEffect, useRef, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import axios from "axios";
import { Html5Qrcode } from "html5-qrcode";
import { QrCode, Check, AlertTriangle, XCircle, Loader2, ArrowLeft, Keyboard, Square, CheckSquare } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATS = [
  ["adults", "Sea Food Adult"],
  ["kids_5_12", "Sea Food Kid (5–12)"],
  ["kids_below_5", "Sea Food Kid (Below 5)"],
  ["veg_adults", "Veg Adult"],
  ["veg_kids_5_12", "Veg Kid (5–12)"],
  ["veg_kids_below_5", "Veg Kid (Below 5)"],
];

const extractRef = (text) => {
  if (text.includes("|")) {
    const parts = text.split("|");
    if (parts[0].startsWith("RAJAONAM") && parts[1]) return parts[1].trim();
  }
  const m = text.match(/EO-[A-Z0-9]{6}/);
  return m ? m[0] : null;
};

const checkedCounts = (b) => {
  if (b.checked_in_counts) return b.checked_in_counts;
  if (b.checked_in) return Object.fromEntries(CATS.map(([k]) => [k, b[k] || 0]));
  return {};
};

const guestsChecked = (b) => Object.values(checkedCounts(b)).reduce((s, n) => s + n, 0);

export default function Scanner() {
  const token = localStorage.getItem("admin_token");
  const [stage, setStage] = useState("scan");
  const [booking, setBooking] = useState(null);
  const [ticks, setTicks] = useState({});
  const [result, setResult] = useState(null);
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const scannerRef = useRef(null);
  const runningRef = useRef(false);

  const headers = { Authorization: `Bearer ${token}` };

  const stopScanner = async () => {
    if (scannerRef.current && runningRef.current) {
      runningRef.current = false;
      try { await scannerRef.current.stop(); } catch {}
    }
  };

  const startScanner = async () => {
    setCameraError("");
    try {
      if (!scannerRef.current) scannerRef.current = new Html5Qrcode("qr-reader");
      runningRef.current = true;
      await scannerRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (text) => {
          const ref = extractRef(text);
          if (ref) {
            stopScanner();
            fetchBooking(ref);
          }
        },
        () => {}
      );
    } catch (e) {
      runningRef.current = false;
      setCameraError("Camera unavailable — use manual Booking ID entry below.");
    }
  };

  useEffect(() => {
    if (token) startScanner();
    return () => { stopScanner(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchBooking = async (ref) => {
    setBusy(true);
    setResult(null);
    try {
      const { data } = await axios.get(`${API}/bookings/${ref}`);
      setBooking(data);
      setTicks({});
      setStage("select");
    } catch (e) {
      setResult({ type: e.response?.status === 404 ? "notfound" : "error", ref });
      setStage("done");
    } finally {
      setBusy(false);
    }
  };

  const toggle = (key) => {
    const already = checkedCounts(booking)[key] || 0;
    const booked = booking[key] || 0;
    setTicks((t) => {
      const current = t[key] || 0;
      const next = current > 0 ? 0 : Math.min(1, booked - already);
      return { ...t, [key]: next };
    });
  };

  const toggleItem = (key, idx) => {
    const already = checkedCounts(booking)[key] || 0;
    if (idx < already) return;
    setTicks((t) => {
      const selected = t[key] || 0;
      const isTicked = idx < already + selected;
      return { ...t, [key]: isTicked ? idx - already : idx - already + 1 };
    });
  };

  const selectedTotal = Object.values(ticks).reduce((s, n) => s + n, 0);

  const submitCheckin = async () => {
    if (selectedTotal < 1 || busy) return;
    setBusy(true);
    try {
      const { data } = await axios.post(`${API}/checkin/${booking.reference}`, ticks, { headers });
      setResult({ type: "ok", booking: data.booking });
      setStage("done");
    } catch (e) {
      const d = e.response?.data?.detail;
      setResult({ type: "error", message: typeof d === "string" ? d : "Check-in failed — try again" });
      setStage("done");
    } finally {
      setBusy(false);
    }
  };

  const scanNext = () => {
    setResult(null);
    setBooking(null);
    setTicks({});
    setManual("");
    setStage("scan");
    startScanner();
  };

  if (!token) return <Navigate to="/admin" replace />;

  return (
    <div className="min-h-screen px-4 sm:px-10 py-8 flex flex-col items-center" data-testid="scanner-page">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs tracking-[0.3em] uppercase font-bold text-maroon">RAJAONAM 2026</p>
            <h1 className="font-serif text-3xl text-ink tracking-tight">Gate Scanner</h1>
          </div>
          <Link
            to="/admin"
            data-testid="back-to-admin-link"
            className="flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-ash hover:text-leaf transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
        </div>

        {stage === "scan" && (
          <div className="rounded-2xl border border-[#D8C7A5] bg-[#F1E3C6]/90 overflow-hidden shadow-[0_25px_60px_rgba(138,106,42,0.28)]">
            <div className="flex items-center gap-3 px-6 py-4 bg-[#1b5812]">
              <QrCode className="w-5 h-5 text-[#fabd8f]" />
              <p className="text-[#fabd8f] text-sm font-bold tracking-[0.2em] uppercase">Scan Guest QR</p>
            </div>
            <div className="p-6">
              <div id="qr-reader" data-testid="qr-reader" className="w-full rounded-xl overflow-hidden bg-white border border-[#D8C7A5]" />
              {cameraError && <p className="text-xs text-maroon mt-3" data-testid="camera-error">{cameraError}</p>}
              {busy && (
                <p className="flex items-center gap-2 text-sm text-ash mt-4">
                  <Loader2 className="w-4 h-4 animate-spin" /> Finding booking…
                </p>
              )}
              <div className="mt-6 pt-5 border-t border-[#D8C7A5]">
                <p className="text-xs tracking-[0.25em] uppercase font-bold text-maroon mb-3 flex items-center gap-2">
                  <Keyboard className="w-3.5 h-3.5" /> Manual Entry
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const ref = extractRef(manual.trim()) || manual.trim().toUpperCase();
                    if (ref) { stopScanner(); fetchBooking(ref); }
                  }}
                  className="flex gap-2"
                >
                  <input
                    data-testid="manual-ref-input"
                    value={manual}
                    onChange={(e) => setManual(e.target.value)}
                    placeholder="Booking ID (e.g. EO-ABC123)"
                    className="flex-1 bg-white border border-[#D8C7A5] rounded-full px-4 py-2.5 text-sm text-ink placeholder:text-ash/50 focus:outline-none focus:border-leaf"
                  />
                  <button
                    data-testid="manual-checkin-btn"
                    type="submit"
                    className="px-5 py-2.5 rounded-full bg-leaf text-cream text-xs font-bold tracking-[0.15em] uppercase hover:bg-[#14523A] transition-colors"
                  >
                    Find
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {stage === "select" && booking && (
          <div className="rounded-2xl border border-[#D8C7A5] bg-[#F1E3C6]/90 overflow-hidden shadow-[0_25px_60px_rgba(138,106,42,0.28)]" data-testid="guest-select">
            <div className="px-6 py-4 bg-[#1b5812]">
              <p className="text-[#fabd8f] text-sm font-bold tracking-[0.15em] uppercase" data-testid="select-ref">{booking.reference}</p>
              <p className="text-[#fabd8f]/75 text-xs mt-0.5">{booking.name} · {booking.total_participants} guests booked · {guestsChecked(booking)} already in</p>
            </div>
            <div className="p-6 space-y-2">
              <p className="text-xs tracking-[0.25em] uppercase font-bold text-maroon mb-3">Tick the guests entering now</p>
              {CATS.map(([key, label]) => {
                const booked = booking[key] || 0;
                if (booked < 1) return null;
                const already = checkedCounts(booking)[key] || 0;
                const selected = ticks[key] || 0;
                return Array.from({ length: booked }, (_, i) => {
                  const isIn = i < already;
                  const isTicked = !isIn && i < already + selected;
                  return (
                    <button
                      key={`${key}-${i}`}
                      type="button"
                      disabled={isIn}
                      onClick={() => toggleItem(key, i)}
                      data-testid={`checkin-item-${key}-${i}`}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                        isIn
                          ? "border-leaf/40 bg-leaf/10 text-ash cursor-default"
                          : isTicked
                            ? "border-leaf bg-leaf text-cream"
                            : "border-[#D8C7A5] bg-[#FFFBF2]/70 text-ink hover:border-leaf"
                      }`}
                    >
                      {isIn || isTicked ? <CheckSquare className="w-5 h-5 shrink-0" /> : <Square className="w-5 h-5 shrink-0" />}
                      <span className="text-sm font-semibold">{label} {i + 1}</span>
                      {isIn && <span className="ml-auto text-[10px] tracking-[0.2em] uppercase text-leaf font-bold">Already in</span>}
                    </button>
                  );
                });
              })}
              <div className="pt-4 flex gap-3">
                <button
                  data-testid="confirm-checkin-btn"
                  onClick={submitCheckin}
                  disabled={selectedTotal < 1 || busy}
                  className="flex-1 py-3.5 rounded-full bg-[#1b5812] text-[#fabd8f] text-xs font-bold tracking-[0.2em] uppercase hover:bg-[#12400c] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Check In {selectedTotal > 0 ? `${selectedTotal} Guest${selectedTotal > 1 ? "s" : ""}` : "Selected"}</>}
                </button>
                <button
                  data-testid="cancel-select-btn"
                  onClick={scanNext}
                  className="px-5 py-3.5 rounded-full border border-[#D8C7A5] text-ash text-xs font-bold tracking-[0.15em] uppercase hover:text-maroon hover:border-maroon transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {stage === "done" && result && (
          <div
            data-testid="scan-result"
            className={`rounded-2xl border overflow-hidden shadow-[0_25px_60px_rgba(138,106,42,0.28)] ${
              result.type === "ok" ? "border-leaf bg-leaf/10" : "border-maroon bg-maroon/10"
            }`}
          >
            <div className="p-8 flex flex-col items-center text-center gap-4">
              <span className={`w-16 h-16 rounded-full flex items-center justify-center ${
                result.type === "ok" ? "bg-leaf/15 border border-leaf/40" : "bg-maroon/15 border border-maroon/40"
              }`}>
                {result.type === "ok" ? <Check className="w-8 h-8 text-leaf" /> : result.type === "notfound" ? <XCircle className="w-8 h-8 text-maroon" /> : <AlertTriangle className="w-8 h-8 text-maroon" />}
              </span>
              {result.type === "ok" && (() => {
                const b = result.booking;
                const inNow = guestsChecked(b);
                const pending = (b.total_participants || 0) - inNow;
                return (
                  <>
                    <p className="font-serif text-3xl text-ink" data-testid="result-title">
                      {pending === 0 ? `Welcome, ${b.name.split(" ")[0]}!` : "Partial Check-In Done"}
                    </p>
                    <p className="text-sm text-ash" data-testid="result-detail">
                      {b.reference} · {b.name}
                    </p>
                    <p className={`text-xs tracking-[0.25em] uppercase font-bold ${pending === 0 ? "text-leaf" : "text-gold"}`} data-testid="result-status">
                      {inNow}/{b.total_participants} checked in{pending > 0 ? ` · ${pending} pending` : " · all in"}
                    </p>
                    {pending > 0 && (
                      <p className="text-xs text-ash">Remaining guests can check in later with the same QR code.</p>
                    )}
                  </>
                );
              })()}
              {result.type === "notfound" && (
                <>
                  <p className="font-serif text-3xl text-ink" data-testid="result-title">Invalid Ticket</p>
                  <p className="text-sm text-ash" data-testid="result-detail">No booking found for {result.ref}</p>
                </>
              )}
              {result.type === "error" && (
                <>
                  <p className="font-serif text-3xl text-ink" data-testid="result-title">Something Went Wrong</p>
                  <p className="text-sm text-ash" data-testid="result-detail">{result.message || "Try scanning again"}</p>
                </>
              )}
              <button
                data-testid="scan-next-btn"
                onClick={scanNext}
                className="mt-2 px-8 py-3 rounded-full bg-[#1b5812] text-[#fabd8f] text-xs font-bold tracking-[0.2em] uppercase hover:bg-[#12400c] transition-colors"
              >
                Scan Next Guest
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
