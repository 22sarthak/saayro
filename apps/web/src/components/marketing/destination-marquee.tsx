import Image from "next/image";
import { Bike, Bus, CarFront, Mountain, Plane, Ship, TrainFront, type LucideIcon } from "lucide-react";
import { marqueeDestinations } from "@/lib/destinations";

const travelModes: LucideIcon[] = [Plane, TrainFront, CarFront, Ship, Bus, Mountain, Bike];

export function DestinationMarquee() {
  const items = [...marqueeDestinations, ...marqueeDestinations];

  return (
    <section aria-label="Destinations across India" className="relative overflow-hidden border-b border-sand-200 bg-sand-50 pb-10 pt-8">
      <p className="eyebrow mb-4 text-center text-ink-400">One app for every road in India</p>
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-40 bg-gradient-to-r from-sand-50 via-sand-50/80 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-40 bg-gradient-to-l from-sand-50 via-sand-50/80 to-transparent" />

      <div className="flex w-max animate-marquee items-center hover:[animation-play-state:paused]">
        {items.map((destination, index) => {
          const ModeIcon = travelModes[index % travelModes.length] ?? Plane;
          const italic = index % 2 === 1;
          return (
            <div key={`${destination.name}-${index}`} className="flex items-center">
              <div className="group/item relative flex items-start px-8">
                <span className="relative mt-2 h-16 w-0 shrink-0 overflow-hidden rounded-full opacity-0 shadow-soft ring-1 ring-black/5 transition-all duration-leisurely ease-entrance group-hover/item:mr-4 group-hover/item:w-28 group-hover/item:opacity-100">
                  <Image src={destination.image} alt="" fill sizes="112px" className="object-cover" />
                </span>
                <span
                  className={`display cursor-default text-[clamp(2.5rem,4.5vw,4.25rem)] transition-colors duration-standard group-hover/item:text-lagoon-600 ${
                    italic ? "italic text-sunset-600" : "text-ink-950"
                  }`}
                >
                  {destination.name}
                </span>
                <span className="ml-2 mt-2 font-mono text-[10px] tracking-wider text-ink-400">{destination.latitude}</span>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-sand-300 text-ink-500">
                <ModeIcon className="h-[18px] w-[18px]" strokeWidth={1.6} />
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
