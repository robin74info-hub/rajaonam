import { motion } from "framer-motion";
import { Crown, Sparkles, Camera, Sailboat, Gamepad2, Trophy, Store, Coffee, Music, UtensilsCrossed } from "lucide-react";

const CHAPTERS = [
  {
    num: "01",
    icon: Crown,
    title: "The Legend: Mahabali",
    body: "Every Onam, Kerala welcomes home its most beloved ruler — King Mahabali, whose reign is remembered as a golden age of peace, equality and plenty. Tradition says he returns each year to see how his people are faring. This year, we will make sure he visits Bolgatty Palace.",
    img: "/assets/onam-hero.png",
    position: "78% 25%",
    alt: "King Mahabali with his ceremonial umbrella",
  },
  {
    num: "02",
    icon: Sparkles,
    title: "The Royal Welcome",
    body: "Guests are received the way a king himself would be welcomed — by Thalapolli girls, thunderous Chenda Melam beats and vibrant Pulikali dancers. A Mahabali welcome follows, complete with red tilak and a royal paper crown, with Badanmaar, attentive bouncers and a charismatic female MC setting the tone for the evening.",
    img: "/assets/chapter2.webp",
    position: "50% 45%",
    alt: "Thalapolli girls and royal guards welcoming guests",
  },
  {
    num: "03",
    icon: Camera,
    title: "Capture the Royalty",
    body: "Elegant photo booths, dressed in Onam's royal splendour, are set up within the palace and along its scenic outdoor grounds. For a regal touch, an AI-powered photo booth lets guests transform themselves into a Thamburan or Thamburatti, reimagined in full royal grandeur.",
    img: "/assets/chapter3.webp",
    position: "50% 45%",
    alt: "Royal AI photo booth with a Thamburan portrait",
  },
  {
    num: "04",
    icon: Sailboat,
    title: "Activities & Leisure",
    body: "The festivities extend beyond the feast — guests can enjoy the classic ring throw, balloon shooting and playful face painting, set sail on a serene boating excursion along the tranquil waters surrounding Bolgatty Palace, and a lot more surprise elements.",
    img: "/assets/boat.jpg",
    position: "50% 45%",
    alt: "Cruise boat carrying guests on the Bolgatty backwaters",
  },
  {
    num: "05",
    icon: Gamepad2,
    title: "Traditional Onam Games",
    body: "No Onam celebration is complete without its beloved traditional games. Relive childhood joy with the bun eating race, Sundarikku Pottu Thodal, the sack race, lemon & spoon race, a spirited Vadam Vali (tug of war), Uriyadi — the traditional pot-breaking game — and a lot more, making for moments of joy, nostalgia and playful rivalry throughout the evening.",
    img: "/assets/chapter5.jpg",
    position: "50% 45%",
    alt: "Guests playing the ring throw game on the palace lawns",
  },
  {
    num: "06",
    icon: Trophy,
    title: "Onam Contests",
    body: "The celebrations take on a regal flair with a lineup of traditional contests befitting the grandeur of Onam. Malayali Manga and Malayali Sreeman crown Kerala's quintessential son and daughter, while Best Couple Dress and Best Kids Dress honour the finest traditional finery on display.",
    img: "/assets/chapter6.jpg",
    position: "50% 40%",
    alt: "Guests racing in the sack race during the Onam contests",
  },
  {
    num: "07",
    icon: Store,
    title: "Onam Chandha: The Traditional Bazaar",
    body: "A charming Onam Chandha is set up, recreating the vintage vibes of Kerala's traditional marketplaces. Wander through quaint stalls offering Onam-inspired clothing, bangles and traditional trinkets — each piece steeped in nostalgia, bringing a slice of old-world Kerala charm to the celebrations.",
    img: "/assets/onamchanda.jpg",
    position: "50% 45%",
    alt: "Onam Chandha traditional bazaar stalls decorated with marigold garlands",
  },
  {
    num: "08",
    icon: Coffee,
    title: "LIVE Purchase-on-spot Treats",
    body: "Enjoy live counters featuring spirited beverages, freshly made banana chips, live achappam making, and a vintage-style tea shop serving piping hot tea with old-world Kerala charm.",
    img: "/assets/chapter7.jpg",
    position: "50% 50%",
    alt: "Live paid counters — beer and wine, tea shop, banana chips, peanut candy, cotton candy, popsicles, achappam and unniyappam",
  },
  {
    num: "09",
    icon: Music,
    title: "Nadan Vibes with Unarth",
    body: "The evening comes alive with soulful performances by Unarth, a folk band that brings the raw, rustic charm of Nadan Paattu to the celebrations — filling the air with rhythms rooted deep in Kerala's rural traditions.",
    img: "/assets/unarth-band.jpg",
    position: "50% 35%",
    alt: "Unarth Folk Band with main singer Saranya",
  },
  {
    num: "10",
    icon: UtensilsCrossed,
    title: "The Grand Sadhya",
    body: "A royal Kerala Sadhya served on the traditional banana leaf. Choose between an indulgent Seafood Sadhya or a classic Sadhya — each a celebration of authentic flavours and time-honoured recipes passed down through generations.",
    img: "/assets/sadhya.png",
    position: "50% 45%",
    alt: "King Mahabali serving the grand Onam sadhya on banana leaves",
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
          One leaf. Twenty-six dishes. A royal welcome.
        </h2>
        <p className="text-base sm:text-lg text-ash leading-relaxed max-w-xl mt-5">
          RajaOnam 2026 Oru Kottara Sadhya — an exclusive one-time seating celebrating Kerala's grandest feast, set against the timeless charm of Bolgatty Palace riverside lawns. Explore the experiences below and celebrate the grandeur of RajaOnam.
        </p>
      </motion.div>

      {CHAPTERS.map((c, idx) => (
        <motion.article key={c.num} {...reveal} className="relative" data-testid={`chapter-${c.num}`}>
          <span aria-hidden="true" className="absolute -top-14 -left-2 font-serif text-[8rem] sm:text-[11rem] leading-none text-gold/10 select-none pointer-events-none">
            {c.num}
          </span>
          <div className="relative grid gap-8 lg:gap-12 items-center lg:grid-cols-2">
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
                src={c.img}
                alt={c.alt}
                loading="lazy"
                className="w-full h-[260px] sm:h-[320px] object-cover hover:scale-105 transition-transform duration-700"
                style={{ objectPosition: c.position }}
              />
            </motion.div>
          </div>
        </motion.article>
      ))}
    </div>
  );
}
