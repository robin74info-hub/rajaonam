import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { MapPin, CalendarDays } from "lucide-react";
import BookingPanel from "@/components/BookingPanel";

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

export default function Hero({ event, onBooked }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "14%"]);

  return (
    <section ref={ref} className="relative overflow-hidden" data-testid="hero-section">
      <motion.div style={{ y: imgY }} className="absolute inset-0">
        <img
          src="/assets/onam-hero.png"
          alt="Family making a pookalam during Onam with King Mahabali"
          className="w-full h-[115%] object-cover"
          style={{ objectPosition: "center top" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#FFFBF2]/85 via-[#FFFBF2]/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#FFFBF2] via-transparent to-transparent" />
      </motion.div>

      <div className="relative z-10 px-6 sm:px-12 xl:px-20 py-14 grid gap-12 lg:grid-cols-[1fr_400px] items-center min-h-[95vh]">
        <div>
          <Line delay={0.15}>
            <span className="text-xs tracking-[0.35em] uppercase font-bold text-maroon" data-testid="hero-tagline">
              {event?.tagline || "Oru Kottara Sadhya 2026"}
            </span>
          </Line>

          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1.1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6"
          >
            <img
              src="/assets/logo.webp"
              alt="RajaoNam — Oru Kottara Sadhya 2026"
              className="w-full max-w-md xl:max-w-lg drop-shadow-[0_20px_45px_rgba(201,162,39,0.35)]"
              data-testid="hero-logo"
            />
          </motion.div>

          <Line delay={0.6}>
            <span className="block max-w-md text-base sm:text-lg text-ink/70 leading-relaxed mt-6">
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
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <BookingPanel event={event} onBooked={onBooked} />
        </motion.div>
      </div>
    </section>
  );
}
