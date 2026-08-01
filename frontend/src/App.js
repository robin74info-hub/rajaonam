import { useEffect, useState } from "react";
import Lenis from "lenis";
import axios from "axios";
import "@/App.css";
import BookingPanel from "@/components/BookingPanel";
import Hero from "@/components/Hero";
import Manifesto from "@/components/Manifesto";
import Marquee from "@/components/Marquee";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function App() {
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
    <div className="App" data-testid="app-root">
      <div className="grain-overlay" aria-hidden="true" />
      <div className="flex flex-col lg:flex-row">
        <BookingPanel event={event} onBooked={fetchEvent} />
        <main className="w-full lg:w-[65%] lg:ml-[35%]" data-testid="event-content">
          <Hero event={event} />
          <Marquee />
          <Manifesto />
          <footer className="border-t border-white/10 px-8 sm:px-14 py-10 flex flex-col sm:flex-row justify-between gap-4">
            <p className="font-serif text-2xl text-bone">Ember <span className="text-flame">&</span> Oak</p>
            <p className="text-xs tracking-[0.2em] uppercase text-ash" data-testid="footer-note">
              14 – 16 August 2026 · Riverside District
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default App;
