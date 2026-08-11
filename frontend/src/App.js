import { useEffect, useState } from "react";
import Lenis from "lenis";
import axios from "axios";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "@/App.css";
import Hero from "@/components/Hero";
import BookingPanel from "@/components/BookingPanel";
import Manifesto from "@/components/Manifesto";
import Marquee from "@/components/Marquee";
import Organiser from "@/components/Organiser";
import BrochureButton from "@/components/BrochureButton";
import Admin from "@/components/Admin";
import Scanner from "@/components/Scanner";
import Sponsor from "@/components/Sponsor";
import PayPage from "@/components/PayPage";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function Home() {
  const [event, setEvent] = useState(null);
  const [bannerVisible, setBannerVisible] = useState(true);

  const fetchEvent = () =>
    axios.get(`${API}/event`).then((r) => setEvent(r.data)).catch(console.error);

  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    let frame;
    const raf = (time) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);
    fetchEvent();
    const onScroll = () => setBannerVisible(window.scrollY < window.innerHeight * 0.7);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <>
      <BrochureButton />
      <img
        src="/assets/jingalala.webp"
        alt="Jingalala! Redeem 50% of your RajaOnam ticket value on Gold, Platinum & Silver Jewellery at Chungath Jewellery — valid till 30 Sept 2026"
        data-testid="jingalala-banner"
        className={`fixed top-3 right-3 z-50 w-36 sm:w-52 drop-shadow-[0_10px_25px_rgba(107,26,15,0.4)] pointer-events-none select-none transition-opacity duration-500 ${bannerVisible ? "opacity-100" : "opacity-0"}`}
      />
      <Hero event={event} />
      <section id="booking-section" className="px-4 sm:px-12 xl:px-20 py-16 sm:py-24" data-testid="booking-section">
        <div className="w-full">
          <BookingPanel event={event} onBooked={fetchEvent} />
        </div>
      </section>
      <div className="flex justify-center px-4 pb-4" data-testid="jingalala-static">
        <img
          src="/assets/jingalala.webp"
          alt="Jingalala! Redeem 50% of your RajaOnam ticket value on Gold, Platinum & Silver Jewellery at Chungath Jewellery — valid till 30 Sept 2026"
          className="w-64 sm:w-96 drop-shadow-[0_15px_35px_rgba(107,26,15,0.35)]"
        />
      </div>
      <Marquee />
      <main className="px-6 sm:px-12 xl:px-20 py-16 sm:py-24 max-w-6xl mx-auto" data-testid="event-content">
        <Manifesto />
      </main>
      <Organiser />
      <footer className="px-8 sm:px-14 py-10 bg-[#1b5812]">
        <p className="text-[11px] tracking-[0.15em] uppercase text-center font-bold" data-testid="footer-copyright">
          <span className="text-[#FFD700]">Copyright 2026 RajaOnam · Powered by <a href="https://berrysysglobal.com/" target="_blank" rel="noreferrer" className="underline decoration-[#FFD700]/60 underline-offset-2 hover:text-white transition-colors" data-testid="berrysys-link">Berrysys Media Global LLC</a></span>
        </p>
      </footer>
    </>
  );
}

function App() {
  return (
    <div className="App" data-testid="app-root">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/entry" element={<Scanner />} />
          <Route path="/sponsors" element={<Sponsor />} />
          <Route path="/pay/:reference" element={<PayPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
