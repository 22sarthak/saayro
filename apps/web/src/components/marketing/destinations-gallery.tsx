import Image from "next/image";
import { Reveal } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { destinationShowcase } from "@/lib/destinations";

export function DestinationsGallery() {
  return (
    <section id="destinations" className="pb-28 lg:pb-36">
      <div className="mx-auto max-w-[1400px] px-5 lg:px-8">
        <Reveal className="mb-12 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="eyebrow text-violet-600">Pan-India</p>
            <h2 className="display mt-4 text-balance text-5xl text-slate-950 lg:text-7xl">Every trip gets its own colour.</h2>
          </div>
          <p className="max-w-sm text-base leading-7 text-slate-600">
            Saayro themes each trip from its place, so Goa feels like sea glass and Jaipur glows pink.
          </p>
        </Reveal>
      </div>

      <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-6 [scrollbar-width:none] lg:px-[max(2rem,calc((100vw-1400px)/2+2rem))]">
        {destinationShowcase.map((destination, index) => (
          <Reveal key={destination.slug} delay={index * 0.08} className="shrink-0 snap-start">
            <TiltCard className="rounded-[32px]" cursorLabel={`Plan ${destination.name}`}>
            <article className="group relative h-[480px] w-[320px] overflow-hidden rounded-[32px] shadow-elevated lg:w-[360px]">
              <Image
                src={destination.image}
                alt={`${destination.name}, ${destination.region}`}
                fill
                sizes="360px"
                className="object-cover transition duration-[1400ms] ease-entrance group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-photo-scrim" />
              <div
                className="absolute inset-x-0 bottom-0 h-1/2 opacity-0 mix-blend-soft-light transition duration-leisurely group-hover:opacity-100"
                style={{ background: `linear-gradient(0deg, ${destination.theme.accent}, transparent)` }}
              />
              <div className="absolute left-5 top-5 flex gap-1.5">
                {destination.theme.gradient.map((color) => (
                  <span key={color} className="h-3 w-3 rounded-full ring-2 ring-white/70" style={{ background: color }} />
                ))}
              </div>
              <div className="absolute inset-x-6 bottom-6 text-white">
                <p className="text-xs uppercase tracking-[0.2em] text-white/70">{destination.region}</p>
                <h3 className="display mt-2 text-5xl">{destination.name}</h3>
                <p className="mt-2 text-sm text-white/80">{destination.mood}</p>
              </div>
            </article>
            </TiltCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
