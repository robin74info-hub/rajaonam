import { motion } from "framer-motion";
import { Download } from "lucide-react";

export default function BrochureButton() {
  return (
    <motion.a
      href="/assets/raja-onam-brochure.pdf"
      download="Raja-Onam-2026-Event-Brochure.pdf"
      data-testid="brochure-download-btn"
      initial={{ x: 80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 1.6, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-3 bg-[#1b5812] text-[#fabd8f] px-2.5 py-5 rounded-l-xl shadow-[0_10px_35px_rgba(27,88,18,0.4)] hover:bg-[#12400c] transition-colors"
      aria-label="Download Raja Onam event brochure"
    >
      <Download className="w-4 h-4" />
      <span
        className="text-[11px] font-bold tracking-[0.25em] uppercase"
        style={{ writingMode: "vertical-rl" }}
      >
        Raja Onam Event Download
      </span>
    </motion.a>
  );
}
