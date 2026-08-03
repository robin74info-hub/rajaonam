import { useEffect, useState } from "react";
import axios from "axios";
import { Flower2, Loader2, Download, LogOut, Users, IndianRupee, Sailboat, Fish, Salad, Baby } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const fmt = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;

export default function Admin() {
  const [token, setToken] = useState(() => localStorage.getItem("admin_token"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState(null);
  const [exporting, setExporting] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

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
    setToken(null);
    setBookings(null);
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      const res = await axios.get(`${API}/admin/bookings/export`, { headers, responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "rajaonam-bookings.csv";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" data-testid="admin-login-page">
        <form onSubmit={login} className="w-full max-w-sm rounded-2xl border border-[#D8C7A5] bg-[#F1E3C6]/90 shadow-[0_25px_60px_rgba(138,106,42,0.28)] overflow-hidden">
          <div className="flex items-center gap-3 px-7 pt-7 pb-5 bg-[#1b5812]">
            <span className="w-10 h-10 rounded-full bg-[#fabd8f]/15 border border-[#fabd8f]/40 flex items-center justify-center">
              <Flower2 className="w-5 h-5 text-[#fabd8f]" />
            </span>
            <div>
              <p className="font-serif text-xl text-[#fabd8f]">Admin Dashboard</p>
              <p className="text-[10px] tracking-[0.25em] uppercase text-[#fabd8f]/75 mt-1">Raja Onam 2026</p>
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

  const totalRevenue = (bookings || []).reduce((s, b) => s + (b.total || 0), 0);
  const totalGuests = (bookings || []).reduce((s, b) => s + (b.total_participants || 0), 0);
  const totalBoating = (bookings || []).filter((b) => b.boating).length;
  const seaCount = (bookings || []).reduce((s, b) => s + (b.adults || 0) + (b.kids_5_12 || 0) + (b.kids_below_5 || 0), 0);
  const vegCount = (bookings || []).reduce((s, b) => s + (b.veg_adults || 0) + (b.veg_kids_5_12 || 0) + (b.veg_kids_below_5 || 0), 0);
  const kidsCount = (bookings || []).reduce((s, b) => s + (b.kids_5_12 || 0) + (b.kids_below_5 || 0) + (b.veg_kids_5_12 || 0) + (b.veg_kids_below_5 || 0), 0);

  return (
    <div className="min-h-screen px-4 sm:px-10 py-8" data-testid="admin-dashboard">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-xs tracking-[0.3em] uppercase font-bold text-maroon">Raja Onam 2026</p>
          <h1 className="font-serif text-4xl text-ink tracking-tight">Bookings Dashboard</h1>
        </div>
        <div className="flex gap-3">
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat icon={Users} label="Bookings" value={bookings?.length ?? "…"} testid="stat-bookings" />
        <Stat icon={Users} label="Total Guests" value={bookings ? totalGuests : "…"} testid="stat-guests" />
        <Stat icon={Fish} label="Sea Food Sadhya" value={bookings ? seaCount : "…"} testid="stat-seafood" />
        <Stat icon={Salad} label="Veg Onam Sadhya" value={bookings ? vegCount : "…"} testid="stat-veg" />
        <Stat icon={Baby} label="Kids" value={bookings ? kidsCount : "…"} testid="stat-kids" />
        <Stat icon={IndianRupee} label="Revenue" value={bookings ? fmt(totalRevenue) : "…"} testid="stat-revenue" />
        <Stat icon={Sailboat} label="Boating" value={bookings ? totalBoating : "…"} testid="stat-boating" />
      </div>

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
                <th className="px-4 py-3.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(bookings || []).map((b) => (
                <tr key={b.reference} className="border-t border-[#E4D6BC] hover:bg-[#F5EBD8]/50" data-testid={`booking-row-${b.reference}`}>
                  <td className="px-4 py-3 font-mono text-xs text-maroon whitespace-nowrap">{b.reference}</td>
                  <td className="px-4 py-3 font-semibold text-ink whitespace-nowrap">{b.name}</td>
                  <td className="px-4 py-3 text-ash whitespace-nowrap">{b.phone}</td>
                  <td className="px-4 py-3 text-ash">{b.email}</td>
                  <td className="px-4 py-3 text-ink whitespace-nowrap">{b.adults}A · {b.kids_5_12}K · {b.kids_below_5}B5</td>
                  <td className="px-4 py-3 text-ink whitespace-nowrap">{b.veg_adults}A · {b.veg_kids_5_12}K · {b.veg_kids_below_5}B5</td>
                  <td className="px-4 py-3 text-ash max-w-[180px] truncate">{b.contests?.join(", ") || "—"}</td>
                  <td className="px-4 py-3 text-ash max-w-[180px] truncate">{b.games?.join(", ") || "—"}</td>
                  <td className="px-4 py-3 text-ash whitespace-nowrap">{b.boating ? `${b.boating_slot} · ${b.boating_persons}p` : "—"}</td>
                  <td className="px-4 py-3 text-right font-bold text-leaf whitespace-nowrap">{fmt(b.total)}</td>
                </tr>
              ))}
              {bookings && bookings.length === 0 && (
                <tr><td colSpan="10" className="px-4 py-10 text-center text-ash" data-testid="no-bookings">No bookings yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const Stat = ({ icon: Icon, label, value, testid }) => (
  <div className="rounded-xl border border-[#D8C7A5] bg-[#F1E3C6]/80 p-5" data-testid={testid}>
    <p className="text-[10px] tracking-[0.25em] uppercase text-ash mb-2 flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-leaf" /> {label}
    </p>
    <p className="font-display text-3xl text-ink">{value}</p>
  </div>
);
