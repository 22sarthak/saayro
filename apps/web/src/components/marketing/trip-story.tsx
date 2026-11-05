"use client";

import { Home, Plane } from "lucide-react";
import {
  motion,
  transform,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue
} from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Reveal } from "@/components/motion/reveal";
import { goaTripMap, type GoaTripPlace } from "@/lib/goa-trip-route";
import { goaTripChapters, legBounds } from "@/lib/goa-trip-story";
import { TripStoryCard } from "./trip-story-cards";

const CHAPTERS = goaTripChapters.length;
/** Within a chapter's scroll range: the route draws between these marks... */
const DRAW_FROM = 0.1;
const DRAW_TO = 0.75;
/** ...and the camera holds still between these, moving only across chapter boundaries. */
const HOLD_FROM = 0.15;
const HOLD_TO = 0.85;
const camSpring = { stiffness: 120, damping: 30, mass: 0.6 };

type Camera = { x: number; y: number; scale: number };
type Size = { width: number; height: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function cameraFor(legIndex: number, size: Size): Camera {
  const { width, height } = size;
  const bounds = legBounds(legIndex);
  const boxWidth = Math.max(bounds.maxX - bounds.minX, 260);
  const boxHeight = Math.max(bounds.maxY - bounds.minY, 260);
  const cover = Math.max(width / goaTripMap.width, height / goaTripMap.height);
  const scale = clamp(Math.min(width / (boxWidth * 1.5), height / (boxHeight * 1.5)), cover, 1.1);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  return {
    scale,
    x: clamp(width / 2 - centerX * scale, width - goaTripMap.width * scale, 0),
    y: clamp(height / 2 - centerY * scale, height - goaTripMap.height * scale, 0)
  };
}

/** First chapter in which each place gets pinned. */
const pinChapter = new Map<GoaTripPlace, number>();
goaTripChapters.forEach((chapter, index) => chapter.pins.forEach((place) => pinChapter.set(place, index)));

function legStart(index: number) {
  return (index + DRAW_FROM) / CHAPTERS;
}

function legEnd(index: number) {
  return (index + DRAW_TO) / CHAPTERS;
}

const holdStops = goaTripChapters.flatMap((_, index) => [(index + HOLD_FROM) / CHAPTERS, (index + HOLD_TO) / CHAPTERS]);

type RouteLegProps = {
  index: number;
  progress: MotionValue<number>;
  strokeScale: number;
  registerPath: (index: number, element: SVGPathElement | null) => void;
};

function RouteLeg({ index, progress, strokeScale, registerPath }: RouteLegProps) {
  const leg = goaTripMap.legs[index];
  const pathLength = useTransform(progress, [legStart(index), legEnd(index)], [0, 1]);
  const opacity = useTransform(progress, [legEnd(index), (index + 1) / CHAPTERS], [1, 0.45]);
  if (!leg) return null;
  const width = 5 / strokeScale;

  return (
    <motion.g style={{ opacity }}>
      <motion.path
        d={leg.path}
        fill="none"
        stroke="#ffffff"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ pathLength, strokeWidth: width * 2.2, transition: "stroke-width 600ms ease" }}
      />
      <motion.path
        ref={(element) => registerPath(index, element)}
        d={leg.path}
        fill="none"
        stroke={index === goaTripMap.legs.length - 1 ? "#8466e8" : "#2277b0"}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ pathLength, strokeWidth: width, transition: "stroke-width 600ms ease" }}
      />
    </motion.g>
  );
}

type ScreenPointProps = {
  mapX: number | MotionValue<number>;
  mapY: number | MotionValue<number>;
  camera: { x: MotionValue<number>; y: MotionValue<number>; scale: MotionValue<number> };
  className?: string;
  children: React.ReactNode;
};

/** Positions HTML at a map coordinate so pins keep a constant on-screen size while the map zooms. */
function ScreenPoint({ mapX, mapY, camera, className, children }: ScreenPointProps) {
  const sourceX = useMotionValue(typeof mapX === "number" ? mapX : 0);
  const sourceY = useMotionValue(typeof mapY === "number" ? mapY : 0);
  const pointX = typeof mapX === "number" ? sourceX : mapX;
  const pointY = typeof mapY === "number" ? sourceY : mapY;
  const left = useTransform([camera.x, camera.scale, pointX], (values: number[]) => (values[0] ?? 0) + (values[2] ?? 0) * (values[1] ?? 1));
  const top = useTransform([camera.y, camera.scale, pointY], (values: number[]) => (values[0] ?? 0) + (values[2] ?? 0) * (values[1] ?? 1));

  return (
    <motion.div className={`pointer-events-none absolute left-0 top-0 ${className ?? ""}`} style={{ x: left, y: top }}>
      {children}
    </motion.div>
  );
}

export function TripStory() {
  const chaptersRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const paths = useRef<(SVGPathElement | null)[]>([]);
  const [size, setSize] = useState<Size>({ width: 640, height: 800 });
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({ target: chaptersRef, offset: ["start 0.62", "end 0.62"] });

  const cameraX = useMotionValue(0);
  const cameraY = useMotionValue(0);
  const cameraScale = useMotionValue(0.4);
  const camera = {
    x: useSpring(cameraX, camSpring),
    y: useSpring(cameraY, camSpring),
    scale: useSpring(cameraScale, camSpring)
  };
  const travellerX = useMotionValue<number>(goaTripMap.places.dabolim.x);
  const travellerY = useMotionValue<number>(goaTripMap.places.dabolim.y);

  const keyframes = useMemo(() => goaTripChapters.map((chapter) => cameraFor(chapter.leg, size)), [size]);

  const registerPath = useCallback((index: number, element: SVGPathElement | null) => {
    paths.current[index] = element;
  }, []);

  const update = useCallback(
    (progress: number) => {
      const held = (pick: (frame: Camera) => number) => transform(progress, holdStops, keyframes.flatMap((frame) => [pick(frame), pick(frame)]));
      cameraX.set(held((frame) => frame.x));
      cameraY.set(held((frame) => frame.y));
      cameraScale.set(held((frame) => frame.scale));

      const chapter = clamp(Math.floor(progress * CHAPTERS), 0, CHAPTERS - 1);
      setActive((current) => (current === chapter ? current : chapter));

      const path = paths.current[chapter];
      if (path) {
        const share = clamp((progress - legStart(chapter)) / (legEnd(chapter) - legStart(chapter)), 0, 1);
        const point = path.getPointAtLength(share * path.getTotalLength());
        travellerX.set(point.x);
        travellerY.set(point.y);
      }
    },
    [keyframes, cameraX, cameraY, cameraScale, travellerX, travellerY]
  );

  useMotionValueEvent(scrollYProgress, "change", update);

  useEffect(() => {
    update(scrollYProgress.get());
    camera.x.jump(cameraX.get());
    camera.y.jump(cameraY.get());
    camera.scale.jump(cameraScale.get());
    // Snap the springs only when the frame changes size, not on every scroll.
  }, [keyframes]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);

  const chapter = goaTripChapters[active] ?? goaTripChapters[0];
  const leg = goaTripMap.legs[chapter?.leg ?? 0];
  const strokeScale = keyframes[active]?.scale ?? 0.4;

  return (
    <section id="trip" aria-label="A Goa trip, day by day" className="hues-sea relative bg-porcelain-50 pt-24 lg:pt-32">
      <div className="mx-auto max-w-[1400px] px-5 lg:px-8">
        <Reveal className="max-w-3xl">
          <p className="eyebrow text-sky-600">One trip, start to finish</p>
          <h2 className="display mt-4 text-balance text-5xl text-slate-950 lg:text-7xl">
            Six days in Goa, <em>as Saayro sees it.</em>
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">Scroll the trip. Every road is real, every day is the plan a group of six actually made.</p>
        </Reveal>

        <div className="relative mt-10 grid lg:mt-4 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-14">
          <div className="sticky top-0 z-10 -mx-5 h-[48svh] bg-porcelain-50 px-3 py-3 lg:col-start-2 lg:row-start-1 lg:mx-0 lg:h-screen lg:self-start lg:px-0 lg:py-6">
            <div ref={panelRef} className="relative h-full overflow-hidden rounded-[28px] bg-[#d3e5f3] shadow-elevated ring-1 ring-black/5">
              <motion.div
                className="absolute left-0 top-0 will-change-transform"
                style={{ x: camera.x, y: camera.y, scale: camera.scale, originX: 0, originY: 0, width: goaTripMap.width, height: goaTripMap.height }}
              >
                <svg width={goaTripMap.width} height={goaTripMap.height} viewBox={`0 0 ${goaTripMap.width} ${goaTripMap.height}`} role="img" aria-label="Map of the Goa trip route">
                  <image href={goaTripMap.src} width={goaTripMap.width} height={goaTripMap.height} />
                  {goaTripMap.legs.map((_, index) => (
                    <RouteLeg key={index} index={index} progress={scrollYProgress} strokeScale={strokeScale} registerPath={registerPath} />
                  ))}
                </svg>
              </motion.div>

              {(Object.keys(goaTripMap.places) as GoaTripPlace[]).map((key) => {
                const place = goaTripMap.places[key];
                const firstChapter = pinChapter.get(key);
                if (firstChapter === undefined) return null;
                const shown = active >= firstChapter;
                const current = chapter?.pins.includes(key) ?? false;
                const Icon = key === "dabolim" ? Plane : key === "assagao" ? Home : null;
                return (
                  <ScreenPoint key={key} mapX={place.x} mapY={place.y} camera={camera}>
                    <div className={`-translate-x-1/2 -translate-y-1/2 transition-all duration-leisurely ease-entrance ${shown ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}>
                      {Icon ? (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-white ring-[3px] ring-white">
                          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                        </span>
                      ) : (
                        <span className={`block rounded-full ring-[3px] ring-white ${current ? "h-4 w-4 bg-sky-600" : "h-3 w-3 bg-slate-700"}`} />
                      )}
                      <span
                        className={`absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-slate-900 shadow-soft transition-opacity duration-standard ${
                          current || Icon ? "opacity-100" : "opacity-0"
                        }`}
                      >
                        {key === "assagao" ? "Casa Saudade" : place.name}
                      </span>
                    </div>
                  </ScreenPoint>
                );
              })}

              <ScreenPoint mapX={travellerX} mapY={travellerY} camera={camera}>
                <span className="relative -ml-3 -mt-3 flex h-6 w-6 items-center justify-center">
                  <span className="absolute inset-0 animate-ping rounded-full bg-sky-400/50" />
                  <span className="relative h-3.5 w-3.5 rounded-full bg-white shadow-elevated ring-[3px] ring-sky-600" />
                </span>
              </ScreenPoint>

              <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between lg:inset-x-5 lg:top-5">
                <div key={chapter?.id} className="glass-strong animate-rise-in rounded-2xl px-4 py-2.5">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-slate-500">{chapter?.date}</p>
                  <p className="text-sm font-semibold text-slate-900">{chapter?.day}</p>
                </div>
                <div className="glass-strong flex gap-1 rounded-full p-1.5">
                  {goaTripChapters.map((item, index) => (
                    <span key={item.id} className={`h-1.5 rounded-full transition-all duration-standard ${index === active ? "w-6 bg-sky-600" : index < active ? "w-1.5 bg-slate-700" : "w-1.5 bg-slate-200"}`} />
                  ))}
                </div>
              </div>

              <div className="pointer-events-none absolute bottom-3 left-3 lg:bottom-5 lg:left-5">
                <p key={chapter?.id} className="glass-strong animate-rise-in rounded-full px-3.5 py-1.5 text-xs font-medium text-slate-800">
                  {leg?.distanceKm} km · {leg?.durationMin} min by road
                </p>
              </div>
              <span className="absolute bottom-2 right-3 rounded bg-white/80 px-1.5 py-0.5 text-[10px] text-slate-500">© OpenStreetMap contributors</span>
            </div>
          </div>

          <div ref={chaptersRef} className="lg:col-start-1 lg:row-start-1 lg:pt-[12vh]">
            {goaTripChapters.map((item, index) => (
              <article
                key={item.id}
                className={`flex min-h-[72svh] flex-col justify-center py-12 transition-opacity duration-leisurely lg:min-h-screen ${
                  index === active ? "opacity-100" : "opacity-30"
                }`}
              >
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-400">
                  {item.day} · {item.date}
                </p>
                <h3 className="display mt-3 text-4xl text-slate-950 lg:text-6xl">
                  {item.title} <em>{item.emphasis}</em>
                </h3>
                <p className="mt-4 max-w-md text-base leading-7 text-slate-600 lg:text-lg lg:leading-8">{item.body}</p>
                <div className="mt-7">
                  <TripStoryCard artifact={item.artifact} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
