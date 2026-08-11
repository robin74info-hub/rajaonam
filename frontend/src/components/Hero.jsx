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

      <div className="relative z-10 pl-[15px] sm:pl-[70px] lg:pl-[130px] pr-6 sm:pr-12 pt-8 lg:pt-16 pb-14 lg:min-h-[95vh]">
        <div className="max-w-xl rounded-2xl bg-[#FFFBF2]/85 backdrop-blur-md border border-white/70 shadow-[0_25px_70px_rgba(43,33,24,0.18)] p-5 sm:p-8">
        <h1 className="sr-only" data-testid="hero-h1">Raja Onam 2026 – A Royal Onam Celebration at Bolgatty Palace</h1>

        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="-mt-4"
        >
          <img
            src="/assets/rajaonam-chungath.png"
            alt="RajaOnam 2026 — Oru Kottara Sadhya · Chungath Jewellery"
            className="w-full max-w-md xl:max-w-lg drop-shadow-[0_20px_45px_rgba(201,162,39,0.35)]"
            data-testid="hero-logo"
          />
        </motion.div>

        <Line delay={0.6}>
          <span className="block font-display text-2xl sm:text-3xl text-maroon tracking-wide mt-6" data-testid="hero-heading">
            RAJA ONAM 2026
          </span>
        </Line>
        <Line delay={0.75}>
          <span className="block max-w-md text-base sm:text-lg text-ink font-medium leading-relaxed mt-3" data-testid="hero-description">
            Mahabali returns to Kerala for a grand celebration of Onam, bringing together tradition, culture, food, music, games and unforgettable family moments.
          </span>
        </Line>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="flex flex-wrap items-center gap-x-8 gap-y-4 mt-8"
        >
          <span className="flex items-center gap-2.5 text-sm font-semibold text-ink" data-testid="hero-date">
            <CalendarDays className="w-4 h-4 text-leaf" /> {event?.date || "26 August 2026"} · {event?.time || "11:00 AM – 5:00 PM"}
          </span>
          <span className="flex items-center gap-2.5 text-sm font-semibold text-ink" data-testid="hero-venue">
            <MapPin className="w-4 h-4 text-leaf" /> {event?.venue || "Bolgatty Palace & Island Resort, Kochi"}
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
      </div>
    </section>
  );
}
