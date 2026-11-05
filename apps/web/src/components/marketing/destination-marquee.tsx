import { marqueeDestinations } from "@/lib/destinations";

export function DestinationMarquee() {
  const items = [...marqueeDestinations, ...marqueeDestinations];
  return (
    <div className="relative overflow-hidden border-y border-sand-200 bg-sand-50/80 py-5">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-sand-50 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-sand-50 to-transparent" />
      <div className="flex w-max animate-marquee gap-10">
        {items.map((name, index) => (
          <span key={`${name}-${index}`} className="display flex items-center gap-10 text-3xl text-ink-800">
            {name}
            <span className="text-base text-sunset-400">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
