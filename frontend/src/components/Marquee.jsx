const ITEMS = ["Fire & Smoke", "Exclusive Tastings", "Cultural Renaissance", "Live Embers", "Seasonal Harvest", "Riverside Nights"];

export default function Marquee() {
  const row = [...ITEMS, ...ITEMS];
  return (
    <div className="border-y border-white/10 py-7 overflow-hidden select-none" data-testid="editorial-marquee" aria-hidden="true">
      <div className="animate-marquee flex whitespace-nowrap w-max">
        {[0, 1].map((half) => (
          <div key={half} className="flex shrink-0">
            {row.map((item, i) => (
              <span key={`${half}-${i}`} className="flex items-center">
                <span className="font-serif italic text-3xl sm:text-4xl text-saffron/30 px-10">{item}</span>
                <span className="w-2 h-2 rounded-full bg-flame/40" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
