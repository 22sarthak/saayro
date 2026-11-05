import { goaTripMap, type GoaTripPlace } from "./goa-trip-route";

export type TripChapterArtifact = "arrival" | "check-ins" | "place" | "rain-swap" | "settled";

export type TripChapter = {
  id: string;
  day: string;
  date: string;
  title: string;
  emphasis: string;
  body: string;
  /** Index into goaTripMap.legs. */
  leg: number;
  /** Places pinned once this chapter is reached. */
  pins: GoaTripPlace[];
  artifact: TripChapterArtifact;
};

export const goaTripChapters: TripChapter[] = [
  {
    id: "arrive",
    day: "Day 1",
    date: "Sun 27 Dec",
    title: "Wheels down",
    emphasis: "at Dabolim.",
    body: "Your boarding pass was on the lock screen at 4:50 am. By the time the bags are out, the cab is split six ways and the villa's gate code is pinned in the group.",
    leg: 0,
    pins: ["dabolim", "assagao"],
    artifact: "arrival"
  },
  {
    id: "north",
    day: "Day 2",
    date: "Mon 28 Dec",
    title: "Three beaches,",
    emphasis: "one sunset.",
    body: "Anjuna for breakfast, Vagator after lunch, Chapora Fort before the light goes. Saayro checks each place off as you arrive, no one has to remember.",
    leg: 1,
    pins: ["anjuna", "vagator", "chapora"],
    artifact: "check-ins"
  },
  {
    id: "aguada",
    day: "Day 3",
    date: "Tue 29 Dec",
    title: "The fort,",
    emphasis: "then the table.",
    body: "Fort Aguada at four, before it closes. The Thalassa table Buddy held three weeks ago is waiting at 7:30.",
    leg: 2,
    pins: ["aguada"],
    artifact: "place"
  },
  {
    id: "rain",
    day: "Day 4",
    date: "Wed 30 Dec",
    title: "Rain?",
    emphasis: "Plan B was ready.",
    body: "Buddy saw the forecast on Monday and offered a swap: the old Latin quarter in Panjim instead of a wet beach. Five thumbs up, one plan changed.",
    leg: 3,
    pins: ["fontainhas"],
    artifact: "rain-swap"
  },
  {
    id: "home",
    day: "Day 6",
    date: "Fri 1 Jan",
    title: "Home,",
    emphasis: "square and sorted.",
    body: "Everyone is settled before boarding. The map, the photos and the places you never got to stay with the trip, ready for the next one.",
    leg: 4,
    pins: [],
    artifact: "settled"
  }
];

export type MapBounds = { minX: number; minY: number; maxX: number; maxY: number };

/** Bounding box of a leg's route path, in map pixels. */
export function legBounds(legIndex: number): MapBounds {
  const leg = goaTripMap.legs[legIndex];
  const bounds: MapBounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  if (!leg) return { minX: 0, minY: 0, maxX: goaTripMap.width, maxY: goaTripMap.height };
  for (const point of leg.path.slice(1).split(" L")) {
    const [x = 0, y = 0] = point.split(" ").map(Number);
    bounds.minX = Math.min(bounds.minX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.maxY = Math.max(bounds.maxY, y);
  }
  return bounds;
}
