"use client";

import { useEffect, useRef, useState } from "react";
import { HERO_CLIP_SECONDS, heroClips } from "@/lib/hero-reel";

type HeroReelProps = {
  index: number;
  onAdvance: () => void;
};

type NetworkInformation = { saveData?: boolean };

function prefersStill(): boolean {
  if (typeof window === "undefined") return true;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  return reducedMotion || Boolean(connection?.saveData);
}

/** Crossfading destination reel. Falls back to posters for reduced motion or data saver. */
export function HeroReel({ index, onAdvance }: HeroReelProps) {
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const [resolution, setResolution] = useState<"1080" | "720">("1080");
  const [still, setStill] = useState(true);

  useEffect(() => {
    setStill(prefersStill());
    setResolution(window.matchMedia("(max-width: 768px)").matches ? "720" : "1080");
  }, []);

  useEffect(() => {
    if (still) return;
    const active = videos.current[index];
    if (active) {
      active.currentTime = 0;
      void active.play().catch(() => undefined);
    }
    const timer = window.setTimeout(onAdvance, HERO_CLIP_SECONDS * 1000);
    return () => window.clearTimeout(timer);
  }, [index, still, onAdvance]);

  useEffect(() => {
    if (!still) return;
    const timer = window.setTimeout(onAdvance, HERO_CLIP_SECONDS * 1600);
    return () => window.clearTimeout(timer);
  }, [index, still, onAdvance]);

  const nextIndex = (index + 1) % heroClips.length;

  return (
    <div className="absolute inset-0 overflow-hidden bg-slate-950">
      {heroClips.map((clip, clipIndex) => {
        const isActive = clipIndex === index;
        const shouldLoad = isActive || clipIndex === nextIndex;
        const poster = `/hero/${clip.slug}-poster.jpg`;
        return (
          <div
            key={clip.slug}
            className={`absolute inset-0 transition-opacity duration-[1400ms] ease-standard ${isActive ? "opacity-100" : "opacity-0"}`}
            aria-hidden={!isActive}
          >
            {still ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={poster} alt="" className={`h-full w-full object-cover ${isActive ? "animate-ken-burns" : ""}`} />
            ) : (
              <video
                ref={(element) => {
                  videos.current[clipIndex] = element;
                }}
                className={`h-full w-full object-cover ${isActive ? "animate-ken-burns" : ""}`}
                src={`/hero/${clip.slug}-${resolution}.mp4`}
                poster={poster}
                muted
                playsInline
                preload={shouldLoad ? "auto" : "none"}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function HeroReelCaption({ index, onSelect }: { index: number; onSelect: (index: number) => void }) {
  const clip = heroClips[index] ?? heroClips[0];
  if (!clip) return null;

  return (
    <div className="w-[260px] rounded-[18px] bg-[radial-gradient(ellipse_at_center,rgba(15,23,42,0.35),transparent_75%)] p-3">
      <div className="flex gap-1.5">
        {heroClips.map((item, clipIndex) => (
          <button
            key={item.slug}
            type="button"
            aria-label={`Show ${item.place}`}
            onClick={() => onSelect(clipIndex)}
            className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25"
          >
            <span
              key={clipIndex === index ? `active-${index}` : item.slug}
              className={`block h-full rounded-full ${
                clipIndex < index ? "w-full bg-white/80" : clipIndex === index ? "animate-reel-progress" : "w-0"
              }`}
              style={clipIndex === index ? { animationDuration: `${HERO_CLIP_SECONDS}s`, background: "linear-gradient(90deg, var(--hue-a), var(--hue-b))" } : undefined}
            />
          </button>
        ))}
      </div>
      <div key={clip.slug} className="mt-3 animate-rise-in [text-shadow:0_1px_14px_rgba(0,0,0,0.7)]">
        <p className="text-sm font-semibold text-white">{clip.place}</p>
        <p className="font-mono text-[11px] tracking-wide text-white/65">{clip.detail}</p>
      </div>
    </div>
  );
}
