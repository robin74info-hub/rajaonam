import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Html5Qrcode } from "html5-qrcode";
import { QrCode, Check, AlertTriangle, XCircle, Loader2, Keyboard, Square, CheckSquare, Store, LogOut } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const extractRef = (text) => {
  if (text.includes("|")) {
    const parts = text.split("|");
    if (parts[0].startsWith("RAJAONAM") && parts[1]) return parts[1].trim();
  }
  const m = text.match(/EO-[A-Z0-9]{6}/);
  return m ? m[0] : null;
};

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function Sponsor() {
  const [token, setToken] = useState(localStorage.getItem("sponsor_token"));
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
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

  const login = async (e) => {
    e.preventDefault();
    setLoginBusy(true);
    setLoginError("");
    try {
      const { data } = await axios.post(`${API}/auth/login`, loginForm);
      if (data.role !== "sponsor" && data.role !== "admin") {
        setLoginError("This login is not a sponsor account");
        return;
      }
      localStorage.setItem("sponsor_token", data.token);
      setToken(data.token);
    } catch {
      setLoginError("Invalid sponsor credentials");
    } finally {
      setLoginBusy(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("sponsor_token");
    setToken(null);
  };

  const stopScanner = async () => {
    if (scannerRef.current && runningRef.current) {
      runningRef.current = false;
      try { await scannerRef.current.stop(); } catch {}
    }
  };

  const startScanner = async () => {
    setCameraError("");
    try {
      if (!scannerRef.current) scannerRef.current = new Html5Qrcode("sponsor-qr-reader");
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
      const { data } = await axios.get(`${API}/sponsor/booking/${ref}`, { headers });
      setBooking(data);
      setTicks({});
      setStage("select");
    } catch (e) {
      const status = e.response?.status;
      const detail = e.response?.data?.detail;
      setResult({ type: status === 404 ? "notfound" : "error", ref, message: typeof detail === "string" ? detail : null });
      setStage("done");
    } finally {
      setBusy(false);
    }
  };

  const toggleItem = (key, idx) => {
    const item = booking.items.find((i) => i.key === key);
    if (!item || idx < item.redeemed) return;
    setTicks((t) => {
      const selected = t[key] || 0;
      const isTicked = idx < item.redeemed + selected;
      return { ...t, [key]: isTicked ? idx - item.redeemed : idx - item.redeemed + 1 };
    });
  };

  const selectedTotal = Object.values(ticks).reduce((s, n) => s + n, 0);

  const submitRedeem = async () => {
    if (selectedTotal < 1 || busy) return;
    setBusy(true);
    try {
      const { data } = await axios.post(`${API}/sponsor/redeem`, { reference: booking.reference, items: ticks }, { headers });
      setResult({ type: "ok", items: data.items, name: booking.name, ref: booking.reference });
      setStage("done");
    } catch (e) {
      const d = e.response?.data?.detail;
      setResult({ type: "error", message: typeof d === "string" ? d : "Redemption failed — try again" });
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

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" data-testid="sponsor-login">
        <form onSubmit={login} className="w-full max-w-sm rounded-2xl border border-[#D8C7A5] bg-[#F1E3C6]/90 p-8 shadow-[0_25px_60px_rgba(138,106,42,0.28)]">
          <div className="flex items-center gap-3 mb-6">
            <Store className="w-6 h-6 text-leaf" />
            <div>
              <p className="text-xs tracking-[0.3em] uppercase font-bold text-maroon">RAJAONAM 2026</p>
              <h1 className="font-serif text-2xl text-ink">Sponsor Login</h1>
            </div>
          </div>
          <input
            data-testid="sponsor-email"
            type="email"
            required
            placeholder="Email"
            value={loginForm.email}
            onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
            className="w-full mb-3 bg-white border border-[#D8C7A5] rounded-full px-4 py-2.5 text-sm text-ink placeholder:text-ash/50 focus:outline-none focus:border-leaf"
          />
          <input
            data-testid="sponsor-password"
            type="password"
            required
            placeholder="Password"
            value={loginForm.password}
            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
            className="w-full mb-4 bg-white border border-[#D8C7A5] rounded-full px-4 py-2.5 text-sm text-ink placeholder:text-ash/50 focus:outline-none focus:border-leaf"
          />
          {loginError && <p className="text-xs text-maroon mb-3" data-testid="sponsor-login-error">{loginError}</p>}
          <button
            data-testid="sponsor-login-btn"
            type="submit"
            disabled={loginBusy}
            className="w-full py-3 rounded-full bg-[#1b5812] text-[#fabd8f] text-xs font-bold tracking-[0.2em] uppercase hover:bg-[#12400c] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loginBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 sm:px-10 py-8 flex flex-col items-center" data-testid="sponsor-page">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs tracking-[0.3em] uppercase font-bold text-maroon">RAJAONAM 2026</p>
            <h1 className="font-serif text-3xl text-ink tracking-tight">Sponsor Scanner</h1>
          </div>
          <button
            data-testid="sponsor-logout-btn"
            onClick={logout}
            className="flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-ash hover:text-maroon transition-colors"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>

        {stage === "scan" && (
          <div className="rounded-2xl border border-[#D8C7A5] bg-[#F1E3C6]/90 overflow-hidden shadow-[0_25px_60px_rgba(138,106,42,0.28)]">
            <div className="flex items-center gap-3 px-6 py-4 bg-[#1b5812]">
              <QrCode className="w-5 h-5 text-[#fabd8f]" />
              <p className="text-[#fabd8f] text-sm font-bold tracking-[0.2em] uppercase">Scan Customer Ticket QR</p>
            </div>
            <div className="p-6">
              <div id="sponsor-qr-reader" data-testid="sponsor-qr-reader" className="w-full rounded-xl overflow-hidden bg-white border border-[#D8C7A5]" />
              {cameraError && <p className="text-xs text-maroon mt-3" data-testid="sponsor-camera-error">{cameraError}</p>}
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
                    data-testid="sponsor-manual-ref"
                    value={manual}
                    onChange={(e) => setManual(e.target.value)}
                    placeholder="Booking ID (e.g. EO-ABC123)"
                    className="flex-1 bg-white border border-[#D8C7A5] rounded-full px-4 py-2.5 text-sm text-ink placeholder:text-ash/50 focus:outline-none focus:border-leaf"
                  />
                  <button
                    data-testid="sponsor-manual-find-btn"
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
          <div className="rounded-2xl border border-[#D8C7A5] bg-[#F1E3C6]/90 overflow-hidden shadow-[0_25px_60px_rgba(138,106,42,0.28)]" data-testid="sponsor-select">
            <div className="px-6 py-4 bg-[#1b5812]">
              <p className="text-[#fabd8f] text-sm font-bold tracking-[0.15em] uppercase" data-testid="sponsor-select-ref">{booking.reference}</p>
              <p className="text-[#fabd8f]/75 text-xs mt-0.5">{booking.name} · {booking.phone}</p>
            </div>
            <div className="p-6 space-y-2">
              <p className="text-xs tracking-[0.25em] uppercase font-bold text-maroon mb-3">Tick the items the customer is purchasing</p>
              {booking.items.length === 0 && (
                <p className="text-sm text-ash">No purchasable items on this ticket.</p>
              )}
              {booking.items.map((item) =>
                Array.from({ length: item.qty }, (_, i) => {
                  const isRedeemed = i < item.redeemed;
                  const isTicked = !isRedeemed && i < item.redeemed + (ticks[item.key] || 0);
                  return (
                    <button
                      key={`${item.key}-${i}`}
                      type="button"
                      disabled={isRedeemed}
                      onClick={() => toggleItem(item.key, i)}
                      data-testid={`redeem-item-${item.key}-${i}`}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                        isRedeemed
                          ? "border-leaf/40 bg-leaf/10 text-ash cursor-default"
                          : isTicked
                            ? "border-leaf bg-leaf text-cream"
                            : "border-[#D8C7A5] bg-[#FFFBF2]/70 text-ink hover:border-leaf"
                      }`}
                    >
                      {isRedeemed || isTicked ? <CheckSquare className="w-5 h-5 shrink-0" /> : <Square className="w-5 h-5 shrink-0" />}
                      <span className="text-sm font-semibold">{item.label} {i + 1}</span>
                      <span className="text-xs opacity-75">{fmt(item.price)}</span>
                      {isRedeemed && <span className="ml-auto text-[10px] tracking-[0.2em] uppercase text-leaf font-bold">Redeemed</span>}
                    </button>
                  );
                })
              )}
              <div className="pt-4 flex gap-3">
                <button
                  data-testid="confirm-redeem-btn"
                  onClick={submitRedeem}
                  disabled={selectedTotal < 1 || busy}
                  className="flex-1 py-3.5 rounded-full bg-[#1b5812] text-[#fabd8f] text-xs font-bold tracking-[0.2em] uppercase hover:bg-[#12400c] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Confirm Purchase {selectedTotal > 0 ? `(${selectedTotal})` : ""}</>}
                </button>
                <button
                  data-testid="cancel-redeem-btn"
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
            data-testid="sponsor-result"
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
              {result.type === "ok" && (
                <>
                  <p className="font-serif text-3xl text-ink" data-testid="sponsor-result-title">Purchase Confirmed</p>
                  <p className="text-sm text-ash" data-testid="sponsor-result-detail">{result.ref} · {result.name}</p>
                  <p className="text-xs tracking-[0.2em] uppercase font-bold text-leaf">Discount items marked as redeemed</p>
                </>
              )}
              {result.type === "notfound" && (
                <>
                  <p className="font-serif text-3xl text-ink" data-testid="sponsor-result-title">Invalid Ticket</p>
                  <p className="text-sm text-ash" data-testid="sponsor-result-detail">No booking found for {result.ref}</p>
                </>
              )}
              {result.type === "error" && (
                <>
                  <p className="font-serif text-3xl text-ink" data-testid="sponsor-result-title">Something Went Wrong</p>
                  <p className="text-sm text-ash" data-testid="sponsor-result-detail">{result.message || "Try scanning again"}</p>
                </>
              )}
              <button
                data-testid="sponsor-scan-next-btn"
                onClick={scanNext}
                className="mt-2 px-8 py-3 rounded-full bg-[#1b5812] text-[#fabd8f] text-xs font-bold tracking-[0.2em] uppercase hover:bg-[#12400c] transition-colors"
              >
                Scan Next Customer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
