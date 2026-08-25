import { Fragment, useEffect, useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import axios from "axios";
import { Flower2, Loader2, Download, LogOut, Users, IndianRupee, Sailboat, Fish, Salad, Trophy, Gamepad2, QrCode, UserCheck, MessageCircle, RefreshCw, Ticket, Trash2, Pencil } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const fmt = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;
const fmtHalf = (n) => {
  const v = n || 0;
  return `₹${v.toLocaleString("en-IN", { minimumFractionDigits: v % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
};

export default function Admin() {
  const [token, setToken] = useState(() => localStorage.getItem("admin_token"));
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("billed");
  const emptyManual = { ticket_type: "VIP Guest", name: "", phone: "", email: "", passcode: "", adults: 1, kids_5_12: 0, kids_below_5: 0, veg_adults: 0, veg_kids_5_12: 0, veg_kids_below_5: 0 };
  const [manual, setManual] = useState(emptyManual);
  const [manualBusy, setManualBusy] = useState(false);
  const [manualDone, setManualDone] = useState(null);
  const [manualError, setManualError] = useState("");

  const setM = (k) => (e) => setManual({ ...manual, [k]: e.target.value });
  const setMNum = (k) => (e) => setManual({ ...manual, [k]: Math.max(0, Math.min(30, parseInt(e.target.value || "0", 10))) });

  const generateManual = async (e) => {
    e.preventDefault();
    setManualError("");
    setManualDone(null);
    if (manual.name.trim().length < 2) return setManualError("Enter the guest's full name");
    if (!/^[+\d][\d\s-]{6,14}$/.test(manual.phone.trim())) return setManualError("Enter a valid phone number");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manual.email.trim())) return setManualError("Enter a valid email");
    if (manual.adults + manual.veg_adults < 1) return setManualError("At least 1 adult required");
    if (!manual.passcode.trim()) return setManualError("Enter the organiser passcode");
    setManualBusy(true);
    try {
      const { data } = await axios.post(`${API}/admin/manual-booking`, {
        ...manual,
        name: manual.name.trim(),
        phone: manual.phone.trim(),
        email: manual.email.trim(),
        contests: [],
        games: [],
        boating: false,
        boating_persons: 0,
      }, { headers });
      setManualDone(data);
      setManual(emptyManual);
      loadBookings();
    } catch (err) {
      const d = err.response?.data?.detail;
      setManualError(typeof d === "string" ? d : "Failed — try again");
    } finally {
      setManualBusy(false);
    }
  };
  const [deleting, setDeleting] = useState("");

  const deleteUnbilled = async (ref) => {
    if (!window.confirm(`Delete unbilled booking ${ref}? This cannot be undone.`)) return;
    setDeleting(ref);
    try {
      await axios.delete(`${API}/admin/bookings/${ref}`, { headers, data: {} });
      loadBookings();
    } catch (err) {
      alert(err.response?.data?.detail || "Delete failed");
    } finally {
      setDeleting("");
    }
  };

  const deleteComp = async (ref) => {
    const pc = window.prompt(`Enter the organiser passcode to delete complimentary booking ${ref}:`);
    if (!pc) return;
    setDeleting(ref);
    try {
      await axios.delete(`${API}/admin/bookings/${ref}`, { headers, data: { passcode: pc } });
      loadBookings();
    } catch (err) {
      alert(err.response?.data?.detail || "Delete failed");
    } finally {
      setDeleting("");
    }
  };

  const deleteBilled = async (ref) => {
    if (!window.confirm(`Delete PAID booking ${ref}? This permanently removes billed data.`)) return;
    const pc = window.prompt(`Enter the billed-delete passcode to delete paid booking ${ref}:`);
    if (!pc) return;
    setDeleting(ref);
    try {
      await axios.delete(`${API}/admin/bookings/${ref}`, { headers, data: { passcode: pc } });
      loadBookings();
    } catch (err) {
      alert(err.response?.data?.detail || "Delete failed");
    } finally {
      setDeleting("");
    }
  };

  const clearUnbilled = async () => {
    if (!window.confirm(`Delete ALL ${unbilled.length} unbilled bookings? This cannot be undone.`)) return;
    try {
      await axios.post(`${API}/admin/bookings/clear-unbilled`, {}, { headers });
      loadBookings();
    } catch (err) {
      alert(err.response?.data?.detail || "Clear failed");
    }
  };

  const [reconciling, setReconciling] = useState("");
  const reconcileBooking = async (ref) => {
    if (!window.confirm(`Check Razorpay for payment on ${ref}?\nIf the customer paid, this will confirm the booking and resend the ticket by email and WhatsApp.`)) return;
    setReconciling(ref);
    try {
      const { data } = await axios.post(`${API}/admin/bookings/${ref}/reconcile`, {}, { headers });
      if (data.ok) {
        const emailLine = data.email_sent ? "✓ Email sent" : `✗ Email failed: ${data.email_error || "unknown"}`;
        const waLine = data.whatsapp_sent ? "✓ WhatsApp sent" : `✗ WhatsApp failed: ${data.whatsapp_error || "unknown"}`;
        alert(`${ref}: ${data.message}\nRazorpay Payment ID: ${data.razorpay_payment_id}\n\n${emailLine}\n${waLine}`);
        loadBookings();
      } else {
        const payments = (data.razorpay_payments || []).map((p) => `• ${p.id || "—"} · ${p.status} · ₹${((p.amount || 0) / 100).toFixed(2)}`).join("\n") || "No payment attempts recorded";
        alert(`${ref}: ${data.message}\n\nRazorpay payments:\n${payments}`);
      }
    } catch (err) {
      alert(err.response?.data?.detail || "Reconcile failed");
    } finally {
      setReconciling("");
    }
  };

  const [resending, setResending] = useState("");
  const resendTicket = async (ref) => {
    setResending(ref);
    try {
      const { data } = await axios.post(`${API}/admin/bookings/${ref}/resend-ticket`, {}, { headers });
      const emailLine = data.email_sent ? "✓ Email sent" : `✗ Email failed: ${data.email_error || "unknown"}`;
      const waLine = data.whatsapp_sent ? "✓ WhatsApp sent" : `✗ WhatsApp failed: ${data.whatsapp_error || "unknown"}`;
      alert(`${ref}: ${data.message}\n\n${emailLine}\n${waLine}`);
    } catch (err) {
      alert(err.response?.data?.detail || "Resend failed");
    } finally {
      setResending("");
    }
  };

  const sendToWhatsApp = (b) => {
    const digits = String(b.phone || "").replace(/\D/g, "");
    const phone = digits.length === 10 ? `91${digits}` : digits;
    const sadhyaSlot = b.sea_slot || b.veg_slot;
    const payLink = `${window.location.origin}/pay/${b.reference}`;
    const lines = b.status === "pending_payment"
      ? [
          `Payment Pending — RajaOnam 2026`,
          ``,
          `Namaste ${b.name}, your booking ${b.reference} is reserved but the payment is not completed yet.`,
          ``,
          `Guests: ${(b.adults || 0) + (b.kids_5_12 || 0) + (b.kids_below_5 || 0) + (b.veg_adults || 0) + (b.veg_kids_5_12 || 0) + (b.veg_kids_below_5 || 0)} (Sea Food: ${(b.adults || 0) + (b.kids_5_12 || 0) + (b.kids_below_5 || 0)}, Veg: ${(b.veg_adults || 0) + (b.veg_kids_5_12 || 0) + (b.veg_kids_below_5 || 0)})`,
          sadhyaSlot ? `Sadhya Time Slot: ${sadhyaSlot}` : null,
          b.boating_slot ? `Boating: ${b.boating_slot} (${b.boating_persons} pax)` : null,
          `Amount to Pay: ₹${Number(b.total || 0).toLocaleString("en-IN")}`,
          ``,
          `Complete your payment with the SAME Booking ID (${b.reference}) here:`,
          payLink,
          ``,
          `26 August 2026 · 11 AM - 5 PM · Bolgatty Palace & Island Resort, Kochi`,
        ].filter((l) => l !== null).join("\n")
      : [
          `Namaste ${b.name}! Your RajaOnam 2026 ticket is confirmed.`,
          ``,
          `Booking ID: ${b.reference}`,
          `Guests: ${(b.adults || 0) + (b.kids_5_12 || 0) + (b.kids_below_5 || 0) + (b.veg_adults || 0) + (b.veg_kids_5_12 || 0) + (b.veg_kids_below_5 || 0)} (Sea Food: ${(b.adults || 0) + (b.kids_5_12 || 0) + (b.kids_below_5 || 0)}, Veg: ${(b.veg_adults || 0) + (b.veg_kids_5_12 || 0) + (b.veg_kids_below_5 || 0)})`,
          sadhyaSlot ? `Sadhya Time Slot: ${sadhyaSlot}` : null,
          b.boating_slot ? `Boating: ${b.boating_slot} (${b.boating_persons} pax)` : null,
          `Amount: ₹${Number(b.total || 0).toLocaleString("en-IN")} (${b.payment_mode})`,
          ``,
          `Download your ticket (PDF): ${process.env.REACT_APP_BACKEND_URL}/api/bookings/${b.reference}/ticket.pdf`,
          ``,
          `26 August 2026 · 11 AM - 5 PM · Bolgatty Palace & Island Resort, Kochi`,
          `Venue directions: https://maps.app.goo.gl/q6ZminHj9X8hBhBa6`,
        ].filter((l) => l !== null).join("\n");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(lines)}`, "_blank");
  };

  const [wa, setWa] = useState(null);
  const [slotReport, setSlotReport] = useState(null);
  const [redemptions, setRedemptions] = useState(null);
  const [eventInfo, setEventInfo] = useState(null);
  const [editingRef, setEditingRef] = useState(null);
  const [editSlots, setEditSlots] = useState({ sadhya_slot: "", boating_slot: "", passcode: "" });
  const [editBusy, setEditBusy] = useState(false);

  const saveSlotEdit = async (b) => {
    if (!editSlots.passcode.trim()) return alert("Enter the edit passcode");
    const currentSadhya = b.sea_slot || b.veg_slot || "";
    const currentBoating = b.boating_slot || "";
    const payload = { passcode: editSlots.passcode };
    if (editSlots.sadhya_slot && editSlots.sadhya_slot !== currentSadhya) payload.sadhya_slot = editSlots.sadhya_slot;
    if (editSlots.boating_slot !== currentBoating) payload.boating_slot = editSlots.boating_slot;
    if (!payload.sadhya_slot && payload.boating_slot === undefined) return alert("No changes to save");
    setEditBusy(true);
    try {
      await axios.post(`${API}/admin/bookings/${b.reference}/slots`, payload, { headers });
      setEditingRef(null);
      setEditSlots({ sadhya_slot: "", boating_slot: "", passcode: "" });
      loadBookings();
    } catch (err) {
      alert(err.response?.data?.detail || "Update failed");
    } finally {
      setEditBusy(false);
    }
  };
  const [waQr, setWaQr] = useState(null);
  const [siteQr, setSiteQr] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) return;
    axios
      .get(`${API}/admin/website-qr`, { headers, responseType: "blob" })
      .then((r) => setSiteQr(URL.createObjectURL(r.data)))
      .catch(() => setSiteQr(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchSlotReport = () =>
    axios.get(`${API}/admin/slot-report`, { headers }).then((r) => setSlotReport(r.data)).catch(() => setSlotReport(null));

  const fetchRedemptions = () =>
    axios.get(`${API}/admin/sponsor-redemptions`, { headers }).then((r) => setRedemptions(r.data)).catch(() => setRedemptions(null));

  useEffect(() => {
    axios.get(`${API}/event`).then((r) => setEventInfo(r.data)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchSlotReport();
    fetchRedemptions();
    const t = setInterval(() => { fetchSlotReport(); fetchRedemptions(); }, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const downloadSiteQr = async () => {
    const res = await axios.get(`${API}/admin/website-qr`, { headers, responseType: "blob" });
    const url = URL.createObjectURL(new Blob([res.data], { type: "image/png" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "rajaonam-website-qr.png";
    a.click();
    URL.revokeObjectURL(url);
  };

  const fetchWaStatus = () =>
    axios.get(`${API}/admin/whatsapp/status`, { headers }).then((r) => setWa(r.data)).catch(() => setWa({ connected: false }));

  useEffect(() => {
    if (!token) return;
    fetchWaStatus();
    const iv = setInterval(fetchWaStatus, 15000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (wa && !wa.connected && !waQr) {
      axios
        .get(`${API}/admin/whatsapp/qr-image`, { headers, responseType: "blob" })
        .then((r) => setWaQr(URL.createObjectURL(r.data)))
        .catch(() => setWaQr(null));
    }
    if (wa?.connected && waQr) setWaQr(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wa]);

  const loadBookings = () =>
    axios.get(`${API}/admin/bookings`, { headers }).then((r) => setBookings(r.data)).catch((e) => {
      if (e.response?.status === 401) logout();
    });

  useEffect(() => {
    if (token) loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(`${API}/auth/login`, { email: email.trim(), password });
      localStorage.setItem("admin_token", data.token);
      localStorage.setItem("admin_role", data.role || "admin");
      if (data.role === "gate") {
        navigate("/entry");
        return;
      }
      setToken(data.token);
    } catch (err) {
      const d = err.response?.data?.detail;
      setError(typeof d === "string" ? d : "Login failed — try again");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_role");
    setToken(null);
    setBookings(null);
  };

  const exportExcel = () => {
    setExporting(true);
    const header = ["Booking ID","Booked On","Name","Ticket Type","Phone","Email","Sea Adults","Sea Kids 5-12","Sea Kids Below 5","Veg Adults","Veg Kids 5-12","Veg Kids Below 5","Total Participants","Contests","Games","Boating","Boating Slot","Boating Persons","Payment Mode","Guests Checked In","Total Amount (INR)","Status"];
    const lines = filtered.map((b) => [
      b.reference, (b.created_at || "").slice(0, 16).replace("T", " "),
      b.name, b.ticket_type || "Guest", b.phone, b.email,
      b.adults || 0, b.kids_5_12 || 0, b.kids_below_5 || 0,
      b.veg_adults || 0, b.veg_kids_5_12 || 0, b.veg_kids_below_5 || 0,
      b.total_participants || 0,
      (b.contests || []).join("; "), (b.games || []).join("; "),
      b.boating ? "Yes" : "No", b.boating_slot || "-", b.boating_persons || 0,
      b.payment_mode || "-",
      `${guestsChecked(b)}/${b.total_participants || 0}`,
      b.total || 0, b.status || "",
    ]);
    const csv = "\ufeff" + [header, ...lines]
      .map((cols) => cols.map((c) => `"${String(c ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `rajaonam-bookings-${view}${filter === "all" ? "" : `-${filter}`}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  };

  if (!token) {    return (
      <div className="min-h-screen flex items-center justify-center px-4" data-testid="admin-login-page">
        <form onSubmit={login} className="w-full max-w-sm rounded-2xl border border-[#D8C7A5] bg-[#F1E3C6]/90 shadow-[0_25px_60px_rgba(138,106,42,0.28)] overflow-hidden">
          <div className="flex items-center gap-3 px-7 pt-7 pb-5 bg-[#1b5812]">
            <span className="w-10 h-10 rounded-full bg-[#fabd8f]/15 border border-[#fabd8f]/40 flex items-center justify-center">
              <Flower2 className="w-5 h-5 text-[#fabd8f]" />
            </span>
            <div>
              <p className="font-serif text-xl text-[#fabd8f]">Admin Dashboard</p>
              <p className="text-[10px] tracking-[0.25em] uppercase text-[#fabd8f]/75 mt-1">RAJAONAM 2026</p>
            </div>
          </div>
          <div className="px-7 py-7 space-y-5">
            <input
              data-testid="admin-email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Admin email"
              className="underline-input"
              required
            />
            <input
              data-testid="admin-password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="underline-input"
              required
            />
            {error && <p className="text-xs text-maroon" data-testid="admin-login-error">{error}</p>}
            <button
              data-testid="admin-login-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-full bg-leaf text-cream text-sm font-bold tracking-[0.2em] uppercase hover:bg-[#14523A] transition-colors disabled:opacity-80 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (localStorage.getItem("admin_role") === "gate") return <Navigate to="/entry" replace />;

  const billed = (bookings || []).filter((b) => b.status === "confirmed" && b.payment_mode !== "COMP");
  const unbilled = (bookings || []).filter((b) => b.status === "pending_payment");
  const compList = (bookings || []).filter((b) => b.payment_mode === "COMP");
  const totalRevenue = billed.reduce((s, b) => s + (b.total || 0), 0);
  const guestCount = (b) => b.total_participants || ((b.adults || 0) + (b.kids_5_12 || 0) + (b.kids_below_5 || 0) + (b.veg_adults || 0) + (b.veg_kids_5_12 || 0) + (b.veg_kids_below_5 || 0));
  const totalGuests = billed.reduce((s, b) => s + guestCount(b), 0);
  const compGuests = compList.reduce((s, b) => s + guestCount(b), 0);
  const totalConfirmedGuests = totalGuests + compGuests;
  const confirmedAll = [...billed, ...compList];
  const seaTotal = confirmedAll.reduce((s, b) => s + (b.adults || 0) + (b.kids_5_12 || 0) + (b.kids_below_5 || 0), 0);
  const vegTotal = confirmedAll.reduce((s, b) => s + (b.veg_adults || 0) + (b.veg_kids_5_12 || 0) + (b.veg_kids_below_5 || 0), 0);
  const totalBoating = billed.filter((b) => b.boating).length;
  const seaAdults = billed.reduce((s, b) => s + (b.adults || 0), 0);
  const seaKids = billed.reduce((s, b) => s + (b.kids_5_12 || 0) + (b.kids_below_5 || 0), 0);
  const vegAdults = billed.reduce((s, b) => s + (b.veg_adults || 0), 0);
  const vegKids = billed.reduce((s, b) => s + (b.veg_kids_5_12 || 0) + (b.veg_kids_below_5 || 0), 0);
  const contestsCount = billed.filter((b) => (b.contests || []).length > 0).length;
  const gamesCount = billed.filter((b) => (b.games || []).length > 0).length;
  const guestsChecked = (b) => {
    if (b.checked_in_counts) return Object.values(b.checked_in_counts).reduce((s, n) => s + n, 0);
    return b.checked_in ? (b.total_participants || 0) : 0;
  };
  const checkedInCount = billed.reduce((s, b) => s + guestsChecked(b), 0);

  const FILTERS = {
    "sea-adults": { label: "Sea Food Adults", test: (b) => (b.adults || 0) > 0 },
    "sea-kids": { label: "Sea Food Kids", test: (b) => (b.kids_5_12 || 0) + (b.kids_below_5 || 0) > 0 },
    "veg-adults": { label: "Veg Adults", test: (b) => (b.veg_adults || 0) > 0 },
    "veg-kids": { label: "Veg Kids", test: (b) => (b.veg_kids_5_12 || 0) + (b.veg_kids_below_5 || 0) > 0 },
    contests: { label: "Contests", test: (b) => (b.contests || []).length > 0 },
    games: { label: "Games", test: (b) => (b.games || []).length > 0 },
    boating: { label: "Boating", test: (b) => !!b.boating },
  };
  const baseList = view === "billed" ? billed : view === "unbilled" ? unbilled : compList;
  const filtered = baseList.filter((b) => (filter === "all" ? true : FILTERS[filter].test(b)));
  const toggleFilter = (key) => setFilter(filter === key ? "all" : key);

  return (
    <div className="min-h-screen px-4 sm:px-10 py-8" data-testid="admin-dashboard">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-xs tracking-[0.3em] uppercase font-bold text-maroon">RAJAONAM 2026</p>
          <h1 className="font-serif text-4xl text-ink tracking-tight">Bookings Dashboard</h1>
        </div>
        <div className="flex gap-3">
          <Link
            to="/entry"
            data-testid="gate-scanner-link"
            className="flex items-center gap-2 px-6 py-3 rounded-full border border-[#1b5812] text-[#1b5812] text-xs font-bold tracking-[0.2em] uppercase hover:bg-[#1b5812] hover:text-[#fabd8f] transition-colors"
          >
            <QrCode className="w-4 h-4" /> Ticket Scanner
          </Link>
          <button
            data-testid="export-excel-btn"
            onClick={exportExcel}
            disabled={exporting}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#1b5812] text-[#fabd8f] text-xs font-bold tracking-[0.2em] uppercase hover:bg-[#12400c] transition-colors disabled:opacity-80"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export to Excel
          </button>
          <button
            data-testid="admin-logout-btn"
            onClick={logout}
            className="flex items-center gap-2 px-6 py-3 rounded-full border border-[#D8C7A5] text-ash text-xs font-bold tracking-[0.2em] uppercase hover:text-maroon hover:border-maroon transition-colors"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <Stat icon={Users} label="Billed Bookings" value={bookings ? billed.length : "…"} onClick={() => setView("billed")} active={view === "billed"} testid="stat-bookings" />
        <Stat icon={Users} label="Unbilled" value={bookings ? unbilled.length : "…"} onClick={() => setView("unbilled")} active={view === "unbilled"} testid="stat-unbilled" />
        <Stat icon={Ticket} label="Complimentary" value={bookings ? compList.length : "…"} onClick={() => setView("complimentary")} active={view === "complimentary"} testid="stat-comp" />
        <Stat icon={Users} label="Total Guests" value={bookings ? totalGuests : "…"} testid="stat-guests" />
        <Stat icon={UserCheck} label="Total Confirmed Guests" value={bookings ? totalConfirmedGuests : "…"} sub={bookings ? `Billed ${totalGuests} · Comp ${compGuests}` : undefined} testid="stat-confirmed-guests" />
        <Stat icon={Fish} label="Sea Food Total" value={bookings ? seaTotal : "…"} sub={bookings ? "Incl. complimentary" : undefined} testid="stat-sea-total" />
        <Stat icon={Salad} label="Veg Sadhya Total" value={bookings ? vegTotal : "…"} sub={bookings ? "Incl. complimentary" : undefined} testid="stat-veg-total" />
        <Stat icon={Fish} label="Sea Food Adults" value={bookings ? seaAdults : "…"} onClick={() => toggleFilter("sea-adults")} active={filter === "sea-adults"} testid="stat-sea-adults" />
        <Stat icon={Fish} label="Sea Food Kids" value={bookings ? seaKids : "…"} onClick={() => toggleFilter("sea-kids")} active={filter === "sea-kids"} testid="stat-sea-kids" />
        <Stat icon={Salad} label="Veg Adults" value={bookings ? vegAdults : "…"} onClick={() => toggleFilter("veg-adults")} active={filter === "veg-adults"} testid="stat-veg-adults" />
        <Stat icon={Salad} label="Veg Kids" value={bookings ? vegKids : "…"} onClick={() => toggleFilter("veg-kids")} active={filter === "veg-kids"} testid="stat-veg-kids" />
        <Stat icon={Trophy} label="Contests" value={bookings ? contestsCount : "…"} onClick={() => toggleFilter("contests")} active={filter === "contests"} testid="stat-contests" />
        <Stat icon={Gamepad2} label="Games" value={bookings ? gamesCount : "…"} onClick={() => toggleFilter("games")} active={filter === "games"} testid="stat-games" />
        <Stat icon={IndianRupee} label="Revenue" value={bookings ? fmt(totalRevenue) : "…"} testid="stat-revenue" />
        <Stat icon={Sailboat} label="Boating" value={bookings ? totalBoating : "…"} onClick={() => toggleFilter("boating")} active={filter === "boating"} testid="stat-boating" />
        <Stat icon={UserCheck} label="Guests Checked In" value={bookings ? checkedInCount : "…"} testid="stat-checked-in" />
      </div>

      <div className="flex gap-2.5 mb-4" data-testid="view-tabs">
        {[["billed", `Billed (${billed.length})`], ["unbilled", `Unbilled (${unbilled.length})`], ["complimentary", `Complimentary (${compList.length})`]].map(([v, label]) => (
          <button
            key={v}
            data-testid={`view-tab-${v}`}
            onClick={() => setView(v)}
            className={`px-6 py-2.5 rounded-full text-xs font-bold tracking-[0.15em] uppercase transition-colors ${
              view === v ? "bg-[#1b5812] text-[#fabd8f]" : "border border-[#D8C7A5] text-ash hover:border-leaf hover:text-leaf"
            }`}
          >
            {label}
          </button>
        ))}
        {view === "unbilled" && unbilled.length > 0 && (
          <button
            data-testid="clear-unbilled-btn"
            onClick={clearUnbilled}
            className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-full border border-maroon/40 text-maroon text-xs font-bold tracking-[0.15em] uppercase hover:bg-maroon hover:text-cream transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear All Unbilled
          </button>
        )}
      </div>

      {filter !== "all" && (
        <button
          data-testid="filter-chip"
          onClick={() => setFilter("all")}
          className="mb-4 flex items-center gap-2 px-4 py-2 rounded-full bg-leaf text-cream text-xs font-bold tracking-[0.15em] uppercase"
        >
          Showing: {FILTERS[filter].label} ({filtered.length}) ✕
        </button>
      )}

      <div className="rounded-2xl border border-[#D8C7A5] bg-white/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="bookings-table">
            <thead>
              <tr className="bg-[#1b5812] text-[#fabd8f] text-left text-[11px] tracking-[0.15em] uppercase">
                <th className="px-4 py-3.5">Booking ID</th>
                <th className="px-4 py-3.5">Name</th>
                <th className="px-4 py-3.5">Phone</th>
                <th className="px-4 py-3.5">Email</th>
                <th className="px-4 py-3.5">Sea Food</th>
                <th className="px-4 py-3.5">Veg</th>
                <th className="px-4 py-3.5">Contests</th>
                <th className="px-4 py-3.5">Games</th>
                <th className="px-4 py-3.5">Boating</th>
                <th className="px-4 py-3.5">Payment</th>
                <th className="px-4 py-3.5">Checked In</th>
                <th className="px-4 py-3.5 text-right">Total</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {(filtered || []).map((b) => (
                <Fragment key={b.reference}>
                <tr className="border-t border-[#E4D6BC] hover:bg-[#F5EBD8]/50" data-testid={`booking-row-${b.reference}`}>
                  <td className="px-4 py-3 font-mono text-xs text-maroon whitespace-nowrap">{b.reference}</td>
                  <td className="px-4 py-3 font-semibold text-ink whitespace-nowrap">
                    {b.name}
                    {b.ticket_type === "VIP Guest" && <span className="ml-2 px-2 py-0.5 rounded-full bg-gold/20 text-gold text-[10px] font-bold tracking-wider" data-testid={`vip-badge-${b.reference}`}>VIP</span>}
                  </td>
                  <td className="px-4 py-3 text-ash whitespace-nowrap">{b.phone}</td>
                  <td className="px-4 py-3 text-ash">{b.email}</td>
                  <td className="px-4 py-3 text-ink whitespace-nowrap">{b.adults}A · {b.kids_5_12}K · {b.kids_below_5}B5</td>
                  <td className="px-4 py-3 text-ink whitespace-nowrap">{b.veg_adults}A · {b.veg_kids_5_12}K · {b.veg_kids_below_5}B5</td>
                  <td className="px-4 py-3 text-ash max-w-[180px] truncate">{b.contests?.join(", ") || "—"}</td>
                  <td className="px-4 py-3 text-ash max-w-[180px] truncate">{b.games?.join(", ") || "—"}</td>
                  <td className="px-4 py-3 text-ash whitespace-nowrap">{b.boating ? `${b.boating_slot} · ${b.boating_persons}p` : "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap" data-testid={`payment-mode-${b.reference}`}>
                    {b.payment_mode === "COMP" ? (
                      <span className="px-2.5 py-1 rounded-full bg-gold/20 text-gold text-[10px] font-bold tracking-wider">COMP</span>
                    ) : b.status === "pending_payment" ? (
                      <span className="text-maroon font-semibold">Not Paid</span>
                    ) : (
                      <span className="text-ink">{b.payment_mode || "—"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap" data-testid={`checked-in-${b.reference}`}>
                    {guestsChecked(b) > 0 ? (
                      <span className={`font-bold ${guestsChecked(b) >= (b.total_participants || 0) ? "text-leaf" : "text-gold"}`}>
                        {guestsChecked(b) >= (b.total_participants || 0) ? "✓ " : ""}{guestsChecked(b)}/{b.total_participants}
                      </span>
                    ) : (
                      <span className="text-ash">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-leaf whitespace-nowrap">{fmt(b.total)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-2">
                      <a
                        href={`${API}/bookings/${b.reference}/ticket.pdf?t=${Date.now()}`}
                        data-testid={`pdf-${b.reference}`}
                        title="Download ticket PDF"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#C9A227]/60 text-[#8A6A2A] text-[10px] font-bold tracking-wider uppercase hover:bg-[#C9A227] hover:text-white transition-colors"
                      >
                        <Download className="w-3 h-3" /> PDF
                      </a>
                      <button
                        data-testid={`wa-${b.reference}`}
                        onClick={() => sendToWhatsApp(b)}
                        title="Send ticket on WhatsApp"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#25D366]/50 text-[#128C4B] text-[10px] font-bold tracking-wider uppercase hover:bg-[#25D366] hover:text-white transition-colors"
                      >
                        <MessageCircle className="w-3 h-3" /> WhatsApp
                      </button>
                      <button
                        data-testid={`edit-${b.reference}`}
                        onClick={() => {
                          setEditingRef(editingRef === b.reference ? null : b.reference);
                          setEditSlots({ sadhya_slot: b.sea_slot || b.veg_slot || "", boating_slot: b.boating_slot || "", passcode: "" });
                        }}
                        title="Edit time slots"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-leaf/50 text-leaf text-[10px] font-bold tracking-wider uppercase hover:bg-leaf hover:text-cream transition-colors"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                      {b.status === "pending_payment" && b.razorpay_order_id && (
                        <button
                          data-testid={`reconcile-${b.reference}`}
                          onClick={() => reconcileBooking(b.reference)}
                          disabled={reconciling === b.reference}
                          title="Check Razorpay for payment and confirm + resend ticket"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#8A6A2A]/60 text-[#8A6A2A] text-[10px] font-bold tracking-wider uppercase hover:bg-[#C9A227] hover:text-white transition-colors disabled:opacity-60"
                        >
                          {reconciling === b.reference ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Reconcile
                        </button>
                      )}
                      {b.status === "confirmed" && (
                        <button
                          data-testid={`resend-${b.reference}`}
                          onClick={() => resendTicket(b.reference)}
                          disabled={resending === b.reference}
                          title="Resend ticket by email and WhatsApp"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-leaf/50 text-leaf text-[10px] font-bold tracking-wider uppercase hover:bg-leaf hover:text-cream transition-colors disabled:opacity-60"
                        >
                          {resending === b.reference ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ticket className="w-3 h-3" />} Resend
                        </button>
                      )}
                      <button
                        data-testid={`delete-${b.reference}`}
                        onClick={() => (view === "unbilled" ? deleteUnbilled(b.reference) : view === "complimentary" ? deleteComp(b.reference) : deleteBilled(b.reference))}
                        disabled={deleting === b.reference}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-maroon/40 text-maroon text-[10px] font-bold tracking-wider uppercase hover:bg-maroon hover:text-cream transition-colors disabled:opacity-60"
                      >
                        {deleting === b.reference ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />} Delete
                      </button>
                    </div>
                  </td>
                </tr>
                {editingRef === b.reference && (
                  <tr className="bg-[#FFFBF2]" data-testid={`edit-row-${b.reference}`}>
                    <td colSpan="13" className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-maroon">Edit Slots — {b.reference}</span>
                        {(b.sea_slot || b.veg_slot) && (
                          <label className="flex items-center gap-2 text-xs text-ash">
                            Sadhya
                            <select
                              data-testid={`edit-sadhya-${b.reference}`}
                              value={editSlots.sadhya_slot}
                              onChange={(e) => setEditSlots({ ...editSlots, sadhya_slot: e.target.value })}
                              className="bg-white border border-[#D8C7A5] rounded-full px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-leaf"
                            >
                              {(eventInfo?.sadhya_slots || []).map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </label>
                        )}
                        {b.boating && (
                          <label className="flex items-center gap-2 text-xs text-ash">
                            Boating
                            <select
                              data-testid={`edit-boating-${b.reference}`}
                              value={editSlots.boating_slot}
                              onChange={(e) => setEditSlots({ ...editSlots, boating_slot: e.target.value })}
                              className="bg-white border border-[#D8C7A5] rounded-full px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-leaf"
                            >
                              {(eventInfo?.boating_slots?.includes(editSlots.boating_slot) || !editSlots.boating_slot
                                ? eventInfo?.boating_slots || []
                                : [editSlots.boating_slot, ...(eventInfo?.boating_slots || [])]
                              ).map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </label>
                        )}
                        <input
                          data-testid={`edit-passcode-${b.reference}`}
                          type="password"
                          placeholder="Edit passcode"
                          value={editSlots.passcode}
                          onChange={(e) => setEditSlots({ ...editSlots, passcode: e.target.value })}
                          className="bg-[#2B2118] border border-[#2B2118] rounded-full px-3 py-1.5 text-xs text-[#fabd8f] placeholder:text-[#fabd8f]/40 focus:outline-none focus:border-leaf"
                        />
                        <button
                          data-testid={`edit-save-${b.reference}`}
                          onClick={() => saveSlotEdit(b)}
                          disabled={editBusy}
                          className="px-4 py-1.5 rounded-full bg-[#1b5812] text-[#fabd8f] text-[10px] font-bold tracking-wider uppercase hover:bg-[#12400c] transition-colors disabled:opacity-60 flex items-center gap-1.5"
                        >
                          {editBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                        </button>
                        <button
                          data-testid={`edit-cancel-${b.reference}`}
                          onClick={() => setEditingRef(null)}
                          className="text-[10px] tracking-wider uppercase text-ash hover:text-maroon font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
              {bookings && filtered.length === 0 && (
                <tr><td colSpan="13" className="px-4 py-10 text-center text-ash" data-testid="no-bookings">No bookings found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-[#D8C7A5] bg-[#F1E3C6]/80 p-5 mb-8" data-testid="slot-report-card">
        <p className="text-xs tracking-[0.25em] uppercase font-bold text-maroon mb-4">Time Slot Report — Booked Counts</p>
        {slotReport ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border border-[#E4D6BC] p-4" data-testid="sadhya-slot-report">
              <p className="text-xs tracking-[0.2em] uppercase font-bold text-ink mb-3">Sadhya Time Slots (Sea Food + Veg combined · max {slotReport.capacity})</p>
              <div className="space-y-2.5">
                {Object.entries(slotReport.slots || {}).map(([slot, d]) => (
                  <div key={slot} className="flex items-center justify-between text-sm border-b border-[#F1E3C6] pb-2 last:border-0 last:pb-0" data-testid={`sadhya-slot-${slot}`}>
                    <span className="text-ash">{slot}</span>
                    <span className="text-xs text-ash mr-auto ml-4">Sea {d.sea} · Veg {d.veg}</span>
                    <span className={`font-bold ${d.total >= slotReport.capacity ? "text-maroon" : "text-leaf"}`}>
                      {d.total} / {slotReport.capacity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-[#E4D6BC] p-4" data-testid="boating-slot-report">
              <p className="text-xs tracking-[0.2em] uppercase font-bold text-ink mb-3">Boating Time Slots</p>
              <div className="space-y-2.5">
                {Object.entries(slotReport.boating || {}).map(([slot, count]) => (
                  <div key={slot} className="flex items-center justify-between text-sm border-b border-[#F1E3C6] pb-2 last:border-0 last:pb-0" data-testid={`boating-slot-${slot}`}>
                    <span className="text-ash">{slot}</span>
                    <span className="font-bold text-leaf">{count} pax</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-ash">Loading slot report…</p>
        )}
      </div>

      <div className="rounded-xl border border-[#D8C7A5] bg-[#F1E3C6]/80 p-5 mb-8" data-testid="sponsor-redemptions-card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-xs tracking-[0.25em] uppercase font-bold text-maroon">Sponsor Redemptions</p>
          {redemptions?.totals && redemptions.rows?.length > 0 && (
            <div className="flex flex-wrap gap-2 text-[11px]" data-testid="redemption-totals-chips">
              <span className="px-2.5 py-1 rounded-full bg-ink/10 text-ink font-bold">Qty · {redemptions.totals.qty}</span>
              <span className="px-2.5 py-1 rounded-full bg-leaf/15 text-leaf font-bold" data-testid="totals-ticket-value">Ticket Value · {fmt(redemptions.totals.ticket_value)}</span>
              <span className="px-2.5 py-1 rounded-full bg-[#C9A227]/20 text-[#8A6A2A] font-bold" data-testid="totals-gift-value">Gift Value · {fmtHalf(redemptions.totals.gift_value)}</span>
            </div>
          )}
        </div>
        {redemptions?.rows && redemptions.rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] tracking-[0.15em] uppercase text-ash border-b border-[#D8C7A5]">
                  <th className="px-3 py-2">Booking ID</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Price</th>
                  <th className="px-3 py-2 text-right">Ticket Value</th>
                  <th className="px-3 py-2 text-right">Gift Value</th>
                  <th className="px-3 py-2">Shop</th>
                  <th className="px-3 py-2">Redeemed At</th>
                </tr>
              </thead>
              <tbody>
                {redemptions.rows.map((r, i) => (
                  <tr key={`${r.reference}-${i}`} className="border-b border-[#F1E3C6]" data-testid={`redemption-row-${r.reference}`}>
                    <td className="px-3 py-2.5 font-bold text-ink">{r.reference}</td>
                    <td className="px-3 py-2.5 text-ink">{r.name}<span className="block text-[11px] text-ash">{r.phone}</span></td>
                    <td className="px-3 py-2.5 text-ink">{r.item}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-ink">{r.qty}</td>
                    <td className="px-3 py-2.5 text-right text-ink">{fmt(r.price)}</td>
                    <td className="px-3 py-2.5 text-right text-leaf font-bold">{fmt(r.ticket_value)}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-[#8A6A2A]" data-testid={`row-gift-value-${i}`}>{fmtHalf(r.gift_value)}</td>
                    <td className="px-3 py-2.5 text-ash text-xs">Chungath Jewellery</td>
                    <td className="px-3 py-2.5 text-ash text-xs whitespace-nowrap">{r.at ? new Date(r.at).toLocaleString("en-IN") : "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#D8C7A5] bg-[#F1E3C6]/60" data-testid="redemption-totals-row">
                  <td className="px-3 py-2.5 font-bold text-ink uppercase text-[10px] tracking-[0.15em]" colSpan={3}>Totals</td>
                  <td className="px-3 py-2.5 text-right font-bold text-ink">{redemptions.totals?.qty ?? 0}</td>
                  <td className="px-3 py-2.5"></td>
                  <td className="px-3 py-2.5 text-right font-bold text-leaf">{fmt(redemptions.totals?.ticket_value)}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-[#8A6A2A]">{fmtHalf(redemptions.totals?.gift_value)}</td>
                  <td className="px-3 py-2.5" colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="text-sm text-ash" data-testid="no-redemptions">No sponsor redemptions yet</p>
        )}
      </div>

      <div className="rounded-xl border border-[#D8C7A5] bg-[#F1E3C6]/80 p-5 mb-8" data-testid="whatsapp-card">
        <div className="flex flex-wrap items-center gap-4">
          <span className={`w-10 h-10 rounded-full flex items-center justify-center ${wa?.connected ? "bg-leaf/15 border border-leaf/40" : "bg-maroon/10 border border-maroon/30"}`}>
            <MessageCircle className={`w-5 h-5 ${wa?.connected ? "text-leaf" : "text-maroon"}`} />
          </span>
          <div className="flex-1 min-w-[200px]">
            <p className="text-xs tracking-[0.25em] uppercase font-bold text-maroon">WhatsApp Confirmations</p>
            <p className="text-sm text-ink mt-1" data-testid="whatsapp-status">
              {wa === null ? "Checking…" : wa.connected ? "Connected — guests receive their QR ticket on WhatsApp after booking" : "Not connected — pair a WhatsApp number to send tickets"}
            </p>
          </div>
          <button
            data-testid="whatsapp-refresh-btn"
            onClick={() => { setWaQr(null); fetchWaStatus(); }}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#D8C7A5] text-ash text-xs font-bold tracking-[0.15em] uppercase hover:text-leaf hover:border-leaf transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
        {wa && !wa.connected && waQr && (
          <div className="mt-5 pt-5 border-t border-[#D8C7A5] flex flex-col sm:flex-row items-center gap-5">
            <img src={waQr} alt="WhatsApp pairing QR" className="w-44 h-44 rounded-lg border border-[#D8C7A5] bg-white p-2" data-testid="whatsapp-pair-qr" />
            <div className="text-sm text-ash leading-relaxed">
              <p className="font-bold text-ink mb-2">Pair your WhatsApp (one-time):</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Open WhatsApp on the phone that should send tickets</li>
                <li>Go to <span className="text-ink font-semibold">Settings → Linked Devices</span></li>
                <li>Tap <span className="text-ink font-semibold">Link a Device</span> and scan this QR</li>
              </ol>
              <p className="mt-2 text-xs">The QR refreshes every minute — click Refresh if it expires.</p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#D8C7A5] bg-[#F1E3C6]/80 p-5 mb-8" data-testid="website-qr-card">
        <div className="flex flex-wrap items-center gap-5">
          {siteQr ? (
            <img src={siteQr} alt="Website QR code" className="w-28 h-28 rounded-lg border border-[#D8C7A5] bg-white p-1.5" data-testid="website-qr-image" />
          ) : (
            <div className="w-28 h-28 rounded-lg border border-[#D8C7A5] bg-white/60 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-ash" />
            </div>
          )}
          <div className="flex-1 min-w-[220px]">
            <p className="text-xs tracking-[0.25em] uppercase font-bold text-maroon">Website QR Code</p>
            <p className="text-sm text-ash mt-1 leading-relaxed">
              Scanning this QR opens your booking website. Download and use it on posters, flyers, WhatsApp status and social media.
            </p>
          </div>
          <button
            data-testid="download-website-qr-btn"
            onClick={downloadSiteQr}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#1b5812] text-[#fabd8f] text-xs font-bold tracking-[0.2em] uppercase hover:bg-[#12400c] transition-colors"
          >
            <Download className="w-4 h-4" /> Download QR
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[#D8C7A5] bg-[#F1E3C6]/80 p-5 mb-8" data-testid="manual-booking-card">
        <p className="text-xs tracking-[0.25em] uppercase font-bold text-maroon mb-4 flex items-center gap-2">
          <Ticket className="w-4 h-4" /> Complimentary Tickets
        </p>
        <form onSubmit={generateManual} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <select
            data-testid="manual-ticket-type"
            value={manual.ticket_type}
            onChange={setM("ticket_type")}
            className="bg-white border border-[#D8C7A5] rounded-full px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-leaf"
          >
            <option>VIP Guest</option>
          </select>
          <input data-testid="manual-name-input" value={manual.name} onChange={setM("name")} placeholder="Full name" className="bg-white border border-[#D8C7A5] rounded-full px-4 py-2.5 text-sm text-ink placeholder:text-ash/50 focus:outline-none focus:border-leaf" />
          <input data-testid="manual-phone-input" value={manual.phone} onChange={setM("phone")} placeholder="Phone / WhatsApp" type="tel" className="bg-white border border-[#D8C7A5] rounded-full px-4 py-2.5 text-sm text-ink placeholder:text-ash/50 focus:outline-none focus:border-leaf" />
          <input data-testid="manual-email-input" value={manual.email} onChange={setM("email")} placeholder="Email" type="email" className="bg-white border border-[#D8C7A5] rounded-full px-4 py-2.5 text-sm text-ink placeholder:text-ash/50 focus:outline-none focus:border-leaf" />
          {[["adults", "Sea Food Adult"], ["kids_5_12", "Sea Food Kid"], ["kids_below_5", "Sea Kids <5"], ["veg_adults", "Veg Adults"], ["veg_kids_5_12", "Veg Kids 5-12"], ["veg_kids_below_5", "Veg Kids <5"]].map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 bg-white border border-[#D8C7A5] rounded-full px-4 py-2.5">
              <span className="text-[10px] tracking-wider uppercase text-ash whitespace-nowrap">{label}</span>
              <input
                data-testid={`manual-${k.replace(/_/g, "-")}`}
                type="number"
                min="0"
                max="30"
                value={manual[k]}
                onChange={setMNum(k)}
                className="w-full text-sm text-ink font-semibold text-right focus:outline-none"
              />
            </label>
          ))}
          <input data-testid="manual-passcode-input" value={manual.passcode} onChange={setM("passcode")} placeholder="Passcode" type="password" className="col-span-2 bg-[#2B2118] border border-[#2B2118] rounded-full px-4 py-2.5 text-sm text-[#fabd8f] placeholder:text-[#fabd8f]/40 focus:outline-none focus:border-leaf" />
          <button
            data-testid="manual-generate-btn"
            type="submit"
            disabled={manualBusy}
            className="col-span-2 py-2.5 rounded-full bg-[#1b5812] text-[#fabd8f] text-xs font-bold tracking-[0.2em] uppercase hover:bg-[#12400c] transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {manualBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate"}
          </button>
        </form>
        {manualError && <p className="text-xs text-maroon mt-3" data-testid="manual-error">{manualError}</p>}
        {manualDone && (
          <div className="mt-4 pt-4 border-t border-[#D8C7A5] flex flex-wrap items-center gap-4" data-testid="manual-success">
            <img src={`${API}/bookings/${manualDone.reference}/qr`} alt="Ticket QR" className="w-20 h-20 rounded-lg border border-[#D8C7A5] bg-white p-1" data-testid="manual-qr" />
            <div className="text-sm">
              <p className="font-mono font-bold text-maroon" data-testid="manual-reference">{manualDone.reference}</p>
              <p className="text-ash">{manualDone.ticket_type} · {manualDone.total_participants} guests · COMP</p>
              <p className="text-xs text-leaf font-semibold mt-1">Ticket emailed to {manualDone.email}</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

const Stat = ({ icon: Icon, label, value, sub, testid, onClick, active }) => (
  <div
    onClick={onClick}
    role={onClick ? "button" : undefined}
    className={`rounded-xl border p-5 transition-colors ${
      active
        ? "border-leaf bg-leaf/10 ring-1 ring-leaf"
        : "border-[#D8C7A5] bg-[#F1E3C6]/80"
    } ${onClick ? "cursor-pointer hover:border-leaf" : ""}`}
    data-testid={testid}
  >
    <p className="text-[10px] tracking-[0.25em] uppercase text-ash mb-2 flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-leaf" /> {label}
    </p>
    <p className="font-display text-3xl text-ink">{value}</p>
    {sub && <p className="text-[10px] tracking-wider uppercase text-ash mt-1" data-testid={`${testid}-sub`}>{sub}</p>}
  </div>
);
