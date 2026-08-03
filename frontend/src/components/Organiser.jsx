import { motion } from "framer-motion";
import { Phone, Mail, MapPin } from "lucide-react";

export default function Organiser() {
  return (
    <section className="px-6 sm:px-12 xl:px-20 pb-24" data-testid="organiser-section">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="rounded-2xl border border-[#E4D6BC] bg-gradient-to-br from-white to-[#F5EBD8] p-8 sm:p-12 grid gap-10 lg:grid-cols-[1fr_1.2fr] items-center shadow-[0_25px_60px_rgba(201,162,39,0.12)]"
      >
        <div>
          <p className="text-xs tracking-[0.3em] uppercase font-bold text-maroon mb-4">Presented By</p>
          <img
            src="/assets/prime-logo.jpg"
            alt="Prime Time Events logo"
            className="h-14 sm:h-16 w-auto mb-5 mix-blend-multiply"
            data-testid="prime-logo"
          />
          <p className="text-base text-ash leading-relaxed mb-8 max-w-md">
            The Kochi-based event house behind RajaOnam 2026 — crafting large-scale cultural celebrations that bring Kerala's traditions alive, from the royal welcome to the grand sadhya at Bolgatty Palace.
          </p>
          <ul className="space-y-3">
            <li className="flex items-center gap-3 text-sm text-ink" data-testid="organiser-phone">
              <Phone className="w-4 h-4 text-leaf shrink-0" /> +91 98470 00000
            </li>
            <li className="flex items-center gap-3 text-sm text-ink" data-testid="organiser-email">
              <Mail className="w-4 h-4 text-leaf shrink-0" /> hello@rajaonam.in
            </li>
            <li className="flex items-center gap-3 text-sm text-ink" data-testid="organiser-venue">
              <MapPin className="w-4 h-4 text-leaf shrink-0" /> Bolgatty Palace, Kochi, Kerala
            </li>
          </ul>
        </div>
        <div className="flex items-center justify-center">
          <img
            src="/assets/logo.webp"
            alt="RajaoNam — Oru Kottara Sadhya 2026 official logo"
            className="w-full max-w-lg drop-shadow-[0_20px_40px_rgba(201,162,39,0.25)]"
            data-testid="organiser-logo"
          />
        </div>
      </motion.div>
    </section>
  );
}
