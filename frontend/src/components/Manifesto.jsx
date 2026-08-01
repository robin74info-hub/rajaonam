import { motion } from "framer-motion";
import { Clock, Leaf, Utensils, Flower2 } from "lucide-react";

const CHAPTERS = [
  {
    num: "01",
    icon: Flower2,
    title: "The Legend of Mahabali",
    body: "Onam celebrates the homecoming of King Mahabali, the beloved ruler whose reign was Kerala's golden age. For one day each year, he returns to find his people joyful, equal and well-fed — and we make sure he does.",
    position: "78% 25%",
    alt: "King Mahabali with his ceremonial umbrella",
  },
  {
    num: "02",
    icon: Utensils,
    title: "The Grand Sadhya",
    body: "Over twenty-six dishes served on fresh banana leaf — avial, olan, thoran, erissery, pachadi, inji puli, and not one but three payasams. Eaten seated together, with the hand, in the old way. Every recipe from the Kottara family kitchen.",
    position: "50% 92%",
    alt: "A vibrant pookalam floral carpet",
  },
  {
    num: "03",
    icon: Leaf,
    title: "The Festivities",
    body: "Pookalam competitions at dawn, thiruvathirakali in the courtyard, pulikali through the streets and the snake boats thundering on the backwaters. The sadhya is the heart of it — the feast everything else gathers around.",
    position: "12% 35%",
    alt: "The traditional Kottara tharavadu homestead",
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
    <div className="space-y-24" data-testid="manifesto-sections">
      <motion.div {...reveal}>
        <p className="text-xs tracking-[0.3em] uppercase font-bold text-maroon mb-4">The Invitation</p>
        <h2 className="font-serif text-4xl sm:text-5xl text-ink leading-tight tracking-tight max-w-xl">
          One leaf. Twenty-six dishes. A king's welcome.
        </h2>
        <p className="text-base sm:text-lg text-ash leading-relaxed max-w-xl mt-5">
          RajaoNam's Oru Kottara Sadhya is a single grand seating of Kerala's greatest feast, served in the courtyard of a two-hundred-year-old tharavadu. Choose your hour below — the leaf, the feast and the festivities await.
        </p>
      </motion.div>

      {CHAPTERS.map((c, idx) => (
        <motion.article key={c.num} {...reveal} className="relative" data-testid={`chapter-${c.num}`}>
          <span aria-hidden="true" className="absolute -top-14 -left-2 font-serif text-[8rem] sm:text-[11rem] leading-none text-gold/10 select-none pointer-events-none">
            {c.num}
          </span>
          <div className={`relative grid gap-8 lg:gap-12 items-center lg:grid-cols-2`}>
            <div className={idx % 2 === 1 ? "lg:order-2" : ""}>
              <p className="text-xs tracking-[0.3em] uppercase font-bold text-leaf mb-3 flex items-center gap-2">
                <c.icon className="w-4 h-4" /> Chapter {c.num}
              </p>
              <h3 className="font-serif text-3xl sm:text-4xl text-ink leading-tight tracking-tight mb-4">{c.title}</h3>
              <p className="text-base text-ash leading-relaxed">{c.body}</p>
            </div>
            <motion.div
              initial={{ clipPath: "inset(8% 8% 8% 8%)", opacity: 0.6 }}
              whileInView={{ clipPath: "inset(0% 0% 0% 0%)", opacity: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              className={`overflow-hidden rounded-xl border border-[#E4D6BC] shadow-[0_20px_50px_rgba(201,162,39,0.15)] ${idx % 2 === 1 ? "lg:order-1" : ""}`}
            >
              <img
                src="/assets/onam-hero.png"
                alt={c.alt}
                loading="lazy"
                className="w-full h-[260px] sm:h-[320px] object-cover hover:scale-105 transition-transform duration-700"
                style={{ objectPosition: c.position }}
              />
            </motion.div>
          </div>
        </motion.article>
      ))}

      <motion.div {...reveal} className="rounded-xl border border-[#E4D6BC] bg-white/70 backdrop-blur p-7" data-testid="chapter-slots">
        <p className="text-xs tracking-[0.3em] uppercase font-bold text-maroon mb-5 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Sadhya Seatings
        </p>
        <ul className="space-y-3">
          <li className="flex items-center justify-between border-b border-[#E4D6BC] pb-3">
            <span className="text-ink text-sm font-semibold">Onam Sadhya Slot 1</span>
            <span className="text-ash text-sm">12:00 PM – 1:00 PM</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-ink text-sm font-semibold">Onam Sadhya Slot 2</span>
            <span className="text-ash text-sm">1:30 PM – 2:30 PM</span>
          </li>
        </ul>
      </motion.div>
    </div>
  );
}
