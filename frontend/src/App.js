import { useEffect, useState } from "react";
import Lenis from "lenis";
import axios from "axios";
import "@/App.css";
import Hero from "@/components/Hero";
import Manifesto from "@/components/Manifesto";
import Marquee from "@/components/Marquee";
import Organiser from "@/components/Organiser";

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
      <Hero event={event} onBooked={fetchEvent} />
      <Marquee />
      <main className="px-6 sm:px-12 xl:px-20 py-16 sm:py-24 max-w-6xl mx-auto" data-testid="event-content">
        <Manifesto />
      </main>
      <Organiser />
      <footer className="border-t border-[#E4D6BC] px-8 sm:px-14 py-10 flex flex-col sm:flex-row justify-between gap-4 bg-[#F5EBD8]/60">
        <p className="font-serif text-2xl text-ink">Rajao<span className="text-leaf">Nam</span></p>
        <p className="text-xs tracking-[0.2em] uppercase text-ash" data-testid="footer-note">
          26 August 2026 · Kottara Tharavadu Lawns, Kochi
        </p>
      </footer>
    </div>
  );
}

export default App;
