import { useEffect, useRef, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import axios from "axios";
import { Html5Qrcode } from "html5-qrcode";
import { QrCode, Check, AlertTriangle, XCircle, Loader2, ArrowLeft, Keyboard } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const extractRef = (text) => {
  if (text.includes("|")) {
    const parts = text.split("|");
    if (parts[0].startsWith("RAJAONAM") && parts[1]) return parts[1].trim();
  }
  const m = text.match(/EO-[A-Z0-9]{6}/);
  return m ? m[0] : null;
};

export default function Scanner() {
  const token = localStorage.getItem("admin_token");
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
            checkin(ref);
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

  const checkin = async (ref) => {
    setBusy(true);
    setResult(null);
    try {
      const { data } = await axios.post(`${API}/checkin/${ref}`, {}, { headers });
      setResult({ type: data.status === "ok" ? "ok" : "already", booking: data.booking, ref });
    } catch (e) {
      setResult({ type: e.response?.status === 404 ? "notfound" : "error", ref });
    } finally {
      setBusy(false);
    }
  };

  const scanNext = () => {
    setResult(null);
    setManual("");
    startScanner();
  };

  if (!token) return <Navigate to="/admin" replace />;

  const b = result?.booking;

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

        {!result && (
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
                  <Loader2 className="w-4 h-4 animate-spin" /> Checking booking…
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
                    if (ref) { stopScanner(); checkin(ref); }
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
                    Check In
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div
            data-testid="scan-result"
            className={`rounded-2xl border overflow-hidden shadow-[0_25px_60px_rgba(138,106,42,0.28)] ${
              result.type === "ok" ? "border-leaf bg-leaf/10" : result.type === "already" ? "border-gold bg-gold/10" : "border-maroon bg-maroon/10"
            }`}
          >
            <div className="p-8 flex flex-col items-center text-center gap-4">
              <span className={`w-16 h-16 rounded-full flex items-center justify-center ${
                result.type === "ok" ? "bg-leaf/15 border border-leaf/40" : result.type === "already" ? "bg-gold/15 border border-gold/40" : "bg-maroon/15 border border-maroon/40"
              }`}>
                {result.type === "ok" && <Check className="w-8 h-8 text-leaf" />}
                {result.type === "already" && <AlertTriangle className="w-8 h-8 text-gold" />}
                {(result.type === "notfound" || result.type === "error") && <XCircle className="w-8 h-8 text-maroon" />}
              </span>
              {result.type === "ok" && (
                <>
                  <p className="font-serif text-3xl text-ink" data-testid="result-title">Welcome, {b.name.split(" ")[0]}!</p>
                  <p className="text-sm text-ash" data-testid="result-detail">
                    {b.reference} · {b.total_participants} guests
                    {(b.adults + b.kids_5_12 + b.kids_below_5) > 0 && ` · Sea Food ${b.adults + b.kids_5_12 + b.kids_below_5}`}
                    {(b.veg_adults + b.veg_kids_5_12 + b.veg_kids_below_5) > 0 && ` · Veg ${b.veg_adults + b.veg_kids_5_12 + b.veg_kids_below_5}`}
                    {b.boating && ` · Boating ${b.boating_slot}`}
                  </p>
                  <p className="text-xs tracking-[0.25em] uppercase font-bold text-leaf">Checked In</p>
                </>
              )}
              {result.type === "already" && (
                <>
                  <p className="font-serif text-3xl text-ink" data-testid="result-title">Already Checked In</p>
                  <p className="text-sm text-ash" data-testid="result-detail">{b.reference} · {b.name} · {b.total_participants} guests</p>
                  <p className="text-xs tracking-[0.25em] uppercase font-bold text-gold">Duplicate Scan</p>
                </>
              )}
              {result.type === "notfound" && (
                <>
                  <p className="font-serif text-3xl text-ink" data-testid="result-title">Invalid Ticket</p>
                  <p className="text-sm text-ash" data-testid="result-detail">No booking found for {result.ref}</p>
                </>
              )}
              {result.type === "error" && (
                <>
                  <p className="font-serif text-3xl text-ink" data-testid="result-title">Something Went Wrong</p>
                  <p className="text-sm text-ash" data-testid="result-detail">Try scanning again</p>
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
