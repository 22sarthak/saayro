export type HeroClip = {
  slug: string;
  place: string;
  detail: string;
  /** Light hue stops drawn from the footage; the headline and glow shift to them while the clip plays. */
  hues: [string, string, string];
};

/** Order is the journey: coast, desert fort, mountain rail, high valley, capital, a night finale. */
export const heroClips: HeroClip[] = [
  { slug: "goa-coast", place: "Goa", detail: "Konkan coast · 15.3° N", hues: ["#7fd0f2", "#8fe6c4", "#ffe08a"] },
  { slug: "jaipur-amber", place: "Amber Fort, Jaipur", detail: "Rajasthan · 26.9° N", hues: ["#ffb0c8", "#f2a6ec", "#ffd98a"] },
  { slug: "shimla-rail", place: "Kalka–Shimla Railway", detail: "Himachal Pradesh · 31.1° N", hues: ["#a9dcff", "#c8bfff", "#f2f6ff"] },
  { slug: "himalaya-valley", place: "The Himalaya", detail: "Snowline to valley floor", hues: ["#93cdff", "#b7a5ff", "#9ff0d0"] },
  { slug: "delhi-safdarjung", place: "Safdarjung Tomb, Delhi", detail: "Delhi · 28.6° N", hues: ["#ffe0a3", "#f7b4cb", "#c7b6ff"] },
  { slug: "amritsar-night", place: "Golden Temple, Amritsar", detail: "Punjab · 31.6° N", hues: ["#ffe28a", "#ffc970", "#fff1c9"] }
];

export const HERO_CLIP_SECONDS = 5;
