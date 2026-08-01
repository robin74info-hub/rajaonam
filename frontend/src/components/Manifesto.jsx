import { motion } from "framer-motion";
import { Clock } from "lucide-react";

const CHAPTERS = [
  {
    num: "01",
    title: "The Craft",
    body: "Twelve master fire-cooks. No gas, no shortcuts — only oak embers, cast iron and recipes passed down five generations. Watch whole harvests transform over open flame, inches from your table.",
    img: "https://images.pexels.com/photos/17326174/pexels-photo-17326174.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    alt: "Chef mastering open flame",
  },
  {
    num: "02",
    title: "The Atmosphere",
    body: "Lantern-lit long tables along the river. Folk ensembles, ember dancers and the low hum of a thousand conversations. The festival grounds glow until the last coal fades.",
    img: "https://images.unsplash.com/photo-1535898331935-2d274aff0fbc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2MzR8MHwxfHNlYXJjaHwxfHxuaWdodCUyMGZvb2QlMjBmZXN0aXZhbCUyMGxpZ2h0c3xlbnwwfHx8fDE3ODU1NjIxMjJ8MA&ixlib=rb-4.1.0&q=85",
    alt: "Night food festival lights",
  },
  {
    num: "03",
    title: "The Seatings",
    body: "Three seatings each night, each a complete journey — welcome broth, seven fire courses, and a closing sweet smoked over embers. Choose your hour; the fire does the rest.",
    img: "https://images.unsplash.com/photo-1640607760189-dbca1b6b3291?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzV8MHwxfHNlYXJjaHwyfHxlbWJlciUyMHNwYXJrcyUyMGRhcmslMjBiYWNrZ3JvdW5kfGVufDB8fHx8MTc4NTU2MjEyMnww&ixlib=rb-4.1.0&q=85",
    alt: "Ember sparks in the dark",
    slots: [
      { label: "Golden Hour Feast", time: "5:00 PM – 7:00 PM" },
      { label: "The Ember Service", time: "7:30 PM – 9:30 PM" },
      { label: "Midnight Tasting", time: "10:00 PM – 12:00 AM" },
    ],
  },
];

const reveal = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.8, ease: "easeOut" },
};

export default function Manifesto() {
  return (
    <section className="px-8 sm:px-14 py-24 sm:py-32 space-y-32" data-testid="manifesto-sections">
      {CHAPTERS.map((c, idx) => (
        <motion.article key={c.num} {...reveal} className="relative" data-testid={`chapter-${c.num}`}>
          <span aria-hidden="true" className="absolute -top-16 -left-4 font-serif text-[10rem] sm:text-[14rem] leading-none text-white/[0.04] select-none pointer-events-none">
            {c.num}
          </span>
          <div className={`relative grid gap-10 lg:gap-16 items-center ${idx % 2 === 1 ? "lg:grid-cols-[1.1fr_1fr]" : "lg:grid-cols-[1fr_1.1fr]"}`}>
            <div className={idx % 2 === 1 ? "lg:order-2" : ""}>
              <p className="text-xs tracking-[0.3em] uppercase font-bold text-saffron mb-4">Chapter {c.num}</p>
              <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-bone leading-none tracking-tight mb-6">{c.title}</h2>
              <p className="text-base sm:text-lg text-ash leading-relaxed max-w-lg">{c.body}</p>
              {c.slots && (
                <ul className="mt-8 space-y-3" data-testid="chapter-slots">
                  {c.slots.map((s) => (
                    <li key={s.label} className="flex items-center gap-4 border-b border-white/10 pb-3">
                      <Clock className="w-4 h-4 text-flame shrink-0" />
                      <span className="text-bone text-sm font-semibold">{s.label}</span>
                      <span className="text-ash text-sm ml-auto">{s.time}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <motion.div
              initial={{ clipPath: "inset(8% 8% 8% 8%)", opacity: 0.6 }}
              whileInView={{ clipPath: "inset(0% 0% 0% 0%)", opacity: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              className={`overflow-hidden rounded-sm shadow-[0_0_60px_rgba(255,90,0,0.12)] ${idx % 2 === 1 ? "lg:order-1" : ""}`}
            >
              <img src={c.img} alt={c.alt} loading="lazy" className="w-full h-[320px] sm:h-[420px] object-cover hover:scale-105 transition-transform duration-700" />
            </motion.div>
          </div>
        </motion.article>
      ))}
    </section>
  );
}
