import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { MapPin, CalendarDays, ArrowDown } from "lucide-react";

const Line = ({ children, delay = 0, className = "" }) => (
  <span className={`block overflow-hidden ${className}`}>
    <motion.span
      className="block"
      initial={{ y: "110%" }}
      animate={{ y: 0 }}
      transition={{ duration: 1.1, delay, ease: [0.76, 0, 0.24, 1] }}
    >
      {children}
    </motion.span>
  </span>
);

export default function Hero({ event }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);

  const scrollToBooking = () =>
    document.querySelector('[data-testid="booking-panel"]')?.scrollIntoView({ behavior: "smooth" });

  return (
    <section ref={ref} className="relative h-[78vh] sm:h-[88vh] overflow-hidden" data-testid="hero-section">
      <motion.div style={{ y: imgY }} className="absolute inset-0">
        <img
          src="/assets/onam-hero.png"
          alt="Family making a pookalam during Onam with King Mahabali"
          className="w-full h-[115%] object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#FFFBF2] via-[#FFFBF2]/25 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#FFFBF2]/70 via-transparent to-transparent" />
      </motion.div>

      <div className="relative z-10 h-full flex flex-col justify-end px-6 sm:px-12 xl:px-20 pb-14">
        <Line delay={0.15}>
          <span className="text-xs tracking-[0.35em] uppercase font-bold text-maroon" data-testid="hero-tagline">
            {event?.tagline || "Oru Kottara Sadhya 2026"}
          </span>
        </Line>
        <h1 className="font-serif font-light text-ink leading-[0.9] tracking-tighter text-6xl sm:text-8xl xl:text-[7.5rem] mt-5" data-testid="hero-title">
          <Line delay={0.3}>RAJAO</Line>
          <Line delay={0.42}>
            <span className="italic text-leaf">NAM</span>
          </Line>
        </h1>
        <Line delay={0.6}>
          <span className="block max-w-md text-base sm:text-lg text-ash leading-relaxed mt-6">
            King Mahabali returns to Kerala — and the Kottara tharavadu lays out its grandest banana-leaf sadhya. Two seatings. One unforgettable afternoon.
          </span>
        </Line>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="flex flex-wrap items-center gap-x-8 gap-y-4 mt-8"
        >
          <span className="flex items-center gap-2.5 text-sm font-semibold text-ink" data-testid="hero-date">
            <CalendarDays className="w-4 h-4 text-leaf" /> {event?.date || "Wednesday, 26 August 2026"}
          </span>
          <span className="flex items-center gap-2.5 text-sm font-semibold text-ink" data-testid="hero-venue">
            <MapPin className="w-4 h-4 text-leaf" /> {event?.venue || "The Kottara Tharavadu Lawns, Kochi"}
          </span>
          <button
            data-testid="hero-reserve-btn"
            onClick={scrollToBooking}
            className="px-7 py-3 rounded-full bg-leaf text-cream text-xs font-bold tracking-[0.2em] uppercase hover:bg-[#14523A] transition-colors shadow-[0_10px_30px_rgba(30,107,74,0.3)]"
          >
            Reserve Your Sadhya
          </button>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="absolute bottom-6 right-8 sm:right-14 z-10 flex items-center gap-3 text-ash"
      >
        <span className="text-[10px] tracking-[0.3em] uppercase">Scroll</span>
        <ArrowDown className="w-4 h-4 animate-bounce" />
      </motion.div>
    </section>
  );
}
