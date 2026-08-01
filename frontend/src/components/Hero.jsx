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
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "14%"]);

  const scrollToBooking = () =>
    document.getElementById("booking-section")?.scrollIntoView({ behavior: "smooth" });

  return (
    <section ref={ref} className="relative overflow-hidden" data-testid="hero-section">
      <motion.div style={{ y: imgY }} className="absolute inset-0 hidden lg:block">
        <img
          src="/assets/onam-hero.png"
          alt="Family making a pookalam during Onam with King Mahabali"
          className="w-full h-[115%] object-cover"
          style={{ objectPosition: "center top" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#FFFBF2]/55 via-[#FFFBF2]/10 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#FFFBF2]/90 via-transparent to-transparent" />
      </motion.div>

      <div className="lg:hidden relative">
        <img
          src="/assets/onam-hero.png"
          alt="Family making a pookalam during Onam with King Mahabali"
          className="w-full h-auto block"
          data-testid="hero-image-mobile"
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#2B2118]/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-4 flex justify-center">
          <button
            data-testid="mobile-book-slot-btn"
            onClick={scrollToBooking}
            className="px-8 py-3.5 rounded-full bg-[#1b5812] text-[#fabd8f] text-xs font-bold tracking-[0.2em] uppercase shadow-[0_10px_30px_rgba(27,88,18,0.45)]"
          >
            Book Your Slot
          </button>
        </div>
      </div>

      <div className="relative z-10 px-6 sm:px-12 xl:px-20 pt-8 lg:pt-20 pb-14 lg:min-h-[95vh] max-w-3xl">
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
          <span className="block max-w-md text-base sm:text-lg text-ink font-medium leading-relaxed mt-6">
            King Mahabali returns to Kerala — and the Kottara tharavadu lays out its grandest sea food sadhya. Two seatings. One unforgettable afternoon.
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
            data-testid="hero-booking-details-btn"
            onClick={scrollToBooking}
            className="hidden lg:inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#1b5812] text-[#fabd8f] text-xs font-bold tracking-[0.2em] uppercase hover:bg-[#12400c] transition-colors shadow-[0_10px_30px_rgba(27,88,18,0.35)]"
          >
            Booking Details <ArrowDown className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
