const ITEMS = ["Onam Sadhya", "Contest", "Games", "Boating"];

export default function Marquee() {
  const row = [...ITEMS, ...ITEMS];
  return (
    <div className="border-y border-[#E4D6BC] bg-[#F5EBD8]/70 py-6 overflow-hidden select-none" data-testid="editorial-marquee" aria-hidden="true">
      <div className="animate-marquee flex whitespace-nowrap w-max">
        {[0, 1].map((half) => (
          <div key={half} className="flex shrink-0">
            {row.map((item, i) => (
              <span key={`${half}-${i}`} className="flex items-center">
                <span className="font-serif italic text-3xl sm:text-4xl text-gold/60 px-10">{item}</span>
                <span className="w-2 h-2 rounded-full bg-maroon/40" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
