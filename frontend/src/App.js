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

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function Home() {
  const [event, setEvent] = useState(null);

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
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return (
    <>
      <BrochureButton />
      <Hero event={event} />
      <section id="booking-section" className="px-4 sm:px-12 xl:px-20 py-16 sm:py-24" data-testid="booking-section">
        <div className="w-full">
          <BookingPanel event={event} onBooked={fetchEvent} />
        </div>
      </section>
      <Marquee />
      <main className="px-6 sm:px-12 xl:px-20 py-16 sm:py-24 max-w-6xl mx-auto" data-testid="event-content">
        <Manifesto />
      </main>
      <Organiser />
      <footer className="border-t border-[#E4D6BC] px-8 sm:px-14 py-10 bg-[#F5EBD8]/60">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <p className="font-serif text-2xl text-ink">Rajy<span className="text-leaf">Onam</span></p>
          <p className="text-xs tracking-[0.2em] uppercase text-ash" data-testid="footer-note">
            26 August 2026 · 11 AM – 5 PM · Bolgatty Palace, Kochi
          </p>
        </div>
        <p className="text-[11px] tracking-[0.15em] uppercase text-ash text-center mt-8 pt-6 border-t border-[#E4D6BC]" data-testid="footer-copyright">
          Copyright 2026 RajaOnam · Powered by Berrysys Media Global LLC
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
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
