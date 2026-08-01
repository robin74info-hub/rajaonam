import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { MapPin, CalendarDays, ArrowDown } from "lucide-react";

const HERO_IMG = "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDR8MHwxfHNlYXJjaHwxfHxkYXJrJTIwbW9vZHklMjBjaGVmJTIwY29va2luZyUyMGZpcmV8ZW58MHx8fHwxNzg1NTYyMTIyfDA&ixlib=rb-4.1.0&q=85";

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
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "45%"]);

  return (
    <section ref={ref} className="relative min-h-screen flex flex-col justify-end overflow-hidden" data-testid="hero-section">
      <motion.div style={{ y: imgY }} className="absolute inset-0">
        <img
          src={HERO_IMG}
          alt="Chef working over open flame"
          className="w-full h-[120%] object-cover object-center opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/30 to-[#0A0A0A]/60" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A]/50 to-transparent" />
      </motion.div>

      <motion.div style={{ y: textY }} className="relative z-10 px-8 sm:px-14 pb-16 pt-40">
        <Line delay={0.15}>
          <span className="text-xs tracking-[0.35em] uppercase font-bold text-saffron" data-testid="hero-tagline">
            {event?.tagline || "A Fire-Lit Food & Culture Festival"}
          </span>
        </Line>
        <h1 className="font-serif font-light text-bone leading-[0.9] tracking-tighter text-6xl sm:text-8xl xl:text-[8.5rem] mt-6" data-testid="hero-title">
          <Line delay={0.3}>EMBER</Line>
          <Line delay={0.42}>
            <span className="italic text-flame">&</span> OAK
          </Line>
        </h1>
        <Line delay={0.6}>
          <span className="block max-w-md text-base sm:text-lg text-ash leading-relaxed mt-8">
            Three nights of open flame, heirloom recipes and riverside revelry — where the region's finest fire-cooks gather once a year.
          </span>
        </Line>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="flex flex-wrap gap-x-10 gap-y-4 mt-10"
        >
          <span className="flex items-center gap-2.5 text-sm text-bone" data-testid="hero-date">
            <CalendarDays className="w-4 h-4 text-flame" /> {event?.date || "14 – 16 August 2026"}
          </span>
          <span className="flex items-center gap-2.5 text-sm text-bone" data-testid="hero-venue">
            <MapPin className="w-4 h-4 text-flame" /> {event?.venue || "The Old Ironworks Grounds"}
          </span>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="absolute bottom-8 right-8 sm:right-14 z-10 flex items-center gap-3 text-ash"
      >
        <span className="text-[10px] tracking-[0.3em] uppercase">Scroll</span>
        <ArrowDown className="w-4 h-4 animate-bounce" />
      </motion.div>
    </section>
  );
}
