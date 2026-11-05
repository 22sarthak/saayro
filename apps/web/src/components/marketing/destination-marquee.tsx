"use client";

import Image from "next/image";
import { Bike, Bus, CarFront, Mountain, Plane, Ship, TrainFront, type LucideIcon } from "lucide-react";
import { useEffect, useRef, type CSSProperties } from "react";
import { marqueeDestinations } from "@/lib/destinations";

const travelModes: LucideIcon[] = [Plane, TrainFront, CarFront, Ship, Bus, Mountain, Bike];

/** Hue pairs for the accented names, cycling sky, violet, mint, amber and rose. */
const accentHues: [string, string][] = [
  ["#1f84d0", "#7a5cf0"],
  ["#7a5cf0", "#d9529a"],
  ["#179a6e", "#1f84d0"],
  ["#d9890f", "#db4f8e"],
  ["#11999b", "#7a5cf0"]
];

/** Cruising speed in px/s, and how quickly speed eases toward its target (higher = snappier). */
const CRUISE_SPEED = 110;
const EASING = 3.2;

export function DestinationMarquee() {
  const trackRef = useRef<HTMLDivElement>(null);
  const targetSpeed = useRef(CRUISE_SPEED);
  const items = [...marqueeDestinations, ...marqueeDestinations];

  useEffect(() => {
    const track = trackRef.current;
    if (!track || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let offset = 0;
    let speed = CRUISE_SPEED;
    let loopWidth = track.scrollWidth / 2;
    let last = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const dt = Math.min(now - last, 64) / 1000;
      last = now;
      speed += (targetSpeed.current - speed) * (1 - Math.exp(-dt * EASING));
      offset -= speed * dt;
      if (offset <= -loopWidth) offset += loopWidth;
      track.style.transform = `translate3d(${offset}px, 0, 0)`;
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      cancelAnimationFrame(frame);
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };

    const resize = new ResizeObserver(() => {
      loopWidth = track.scrollWidth / 2;
    });
    resize.observe(track);

    // Only animate while on screen.
    const io = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) start();
      else cancelAnimationFrame(frame);
    });
    io.observe(track);

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <section
      aria-label="Destinations across India"
      className="relative overflow-hidden border-b border-porcelain-300 bg-white/70 pb-10 pt-8"
      onPointerEnter={() => (targetSpeed.current = 0)}
      onPointerLeave={() => (targetSpeed.current = CRUISE_SPEED)}
    >
      <p className="eyebrow mb-4 text-center text-slate-400">One app for every road in India</p>
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-40 bg-gradient-to-r from-white via-white/80 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-40 bg-gradient-to-l from-white via-white/80 to-transparent" />

      <div ref={trackRef} className="flex w-max items-center will-change-transform">
        {items.map((destination, index) => {
          const ModeIcon = travelModes[index % travelModes.length] ?? Plane;
          const accent = index % 2 === 1 ? accentHues[Math.floor(index / 2) % accentHues.length] : undefined;
          const accentStyle = accent ? ({ "--hue-a": accent[0], "--hue-b": accent[1], "--hue-c": accent[1] } as CSSProperties) : undefined;
          return (
            <div key={`${destination.name}-${index}`} className="flex items-center">
              <div className="group/item relative flex items-start px-8">
                <span className="relative mt-2 h-16 w-0 shrink-0 overflow-hidden rounded-full opacity-0 shadow-soft ring-1 ring-black/5 transition-all duration-leisurely ease-entrance group-hover/item:mr-4 group-hover/item:w-28 group-hover/item:opacity-100">
                  <Image src={destination.image} alt="" fill sizes="112px" className="object-cover" />
                </span>
                <span
                  style={accentStyle}
                  className={`display cursor-default pb-1 text-[clamp(2.5rem,4.5vw,4.25rem)] ${accent ? "text-hue" : "text-slate-900"}`}
                >
                  {destination.name}
                </span>
                <span className="ml-2 mt-2 font-mono text-[10px] tracking-wider text-slate-400">{destination.latitude}</span>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-porcelain-300 bg-white text-slate-500">
                <ModeIcon className="h-[18px] w-[18px]" strokeWidth={1.6} />
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
