export type HeroClip = {
  slug: string;
  place: string;
  detail: string;
};

/** Order is the journey: coast, desert fort, mountain rail, high valley, capital, a night finale. */
export const heroClips: HeroClip[] = [
  { slug: "goa-coast", place: "Goa", detail: "Konkan coast · 15.3° N" },
  { slug: "jaipur-amber", place: "Amber Fort, Jaipur", detail: "Rajasthan · 26.9° N" },
  { slug: "shimla-rail", place: "Kalka–Shimla Railway", detail: "Himachal Pradesh · 31.1° N" },
  { slug: "himalaya-valley", place: "The Himalaya", detail: "Snowline to valley floor" },
  { slug: "delhi-safdarjung", place: "Safdarjung Tomb, Delhi", detail: "Delhi · 28.6° N" },
  { slug: "amritsar-night", place: "Golden Temple, Amritsar", detail: "Punjab · 31.6° N" }
];

export const HERO_CLIP_SECONDS = 5;
