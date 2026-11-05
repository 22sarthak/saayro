/**
 * Golden Hour — Saayro v2 design language.
 * Warm sand base, deep dusk ink, sunset brand, and meaningful accent hues:
 * lagoon = maps/movement, dusk = Buddy/intelligence, palm = success, marigold = discovery/food/culture.
 */
export const colorScale = {
  sand: {
    50: "#fffbf5",
    100: "#fbf4ea",
    200: "#f3e7d6",
    300: "#e8d5bc",
    400: "#d6bc9a",
    500: "#b89a74"
  },
  white: {
    100: "#ffffff",
    200: "#fffdf9"
  },
  ink: {
    50: "#f6f5f9",
    100: "#eceaf2",
    200: "#d8d4e3",
    300: "#b7b1c9",
    400: "#8e87a6",
    500: "#6a6385",
    600: "#514a6b",
    700: "#3c3654",
    800: "#2a253f",
    900: "#1e1a30",
    950: "#131021"
  },
  sunset: {
    50: "#fff4ee",
    100: "#ffe6da",
    200: "#ffc9b0",
    300: "#ffa47f",
    400: "#ff7e54",
    500: "#f25f3a",
    600: "#d4452a",
    700: "#a93421",
    800: "#7e2719"
  },
  marigold: {
    100: "#fff3d6",
    200: "#ffe3a3",
    300: "#ffce66",
    400: "#f7b32b",
    500: "#e39a0e",
    600: "#b97a08",
    700: "#8a5a06"
  },
  lagoon: {
    100: "#e2f6f5",
    200: "#b8ebe7",
    300: "#7fd8d2",
    400: "#3fbfb8",
    500: "#169e99",
    600: "#0e7f7c",
    700: "#0b615f"
  },
  dusk: {
    100: "#f1edff",
    200: "#dfd6ff",
    300: "#c2b1ff",
    400: "#9f86fa",
    500: "#7e62ec",
    600: "#6347cc",
    700: "#4a35a0"
  },
  palm: {
    100: "#e5f6ec",
    200: "#c3ebd3",
    300: "#8fd6ae",
    400: "#57bd85",
    500: "#2e9e64",
    600: "#22804f",
    700: "#1c6b43"
  },
  rose: {
    100: "#ffecee",
    200: "#fccdd3",
    300: "#f6a3ae",
    400: "#ea7183",
    500: "#d9445a",
    600: "#b93248",
    700: "#9e2a3c"
  }
} as const;

/**
 * Temporary bridge: v1 colour names resolve to Golden Hour scales so unmigrated
 * screens keep rendering during the v2 rebuild. Remove once every screen is rebuilt.
 */
export const legacyColorAliases = {
  ivory: colorScale.sand,
  slate: colorScale.ink,
  sky: colorScale.lagoon,
  violet: colorScale.dusk,
  mint: colorScale.palm,
  amber: colorScale.marigold,
  error: colorScale.rose
} as const;

export const gradients = {
  goldenHour: ["#ffb37a", "#ff7e8a", "#9f86fa"],
  dawn: ["#fff4ee", "#ffe6da", "#f1edff"],
  buddy: ["#9f86fa", "#c2b1ff", "#ffa47f"],
  lagoon: ["#3fbfb8", "#169e99", "#0b615f"],
  scrim: ["rgba(19,16,33,0)", "rgba(19,16,33,0.35)", "rgba(19,16,33,0.82)"]
} as const;

export const glass = {
  light: {
    background: "rgba(255, 251, 245, 0.62)",
    border: "rgba(255, 255, 255, 0.6)",
    blur: 24
  },
  dark: {
    background: "rgba(19, 16, 33, 0.42)",
    border: "rgba(255, 255, 255, 0.16)",
    blur: 28
  }
} as const;

export const spacing = {
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
  20: "5rem",
  24: "6rem"
} as const;

export const radius = {
  sm: "12px",
  md: "20px",
  lg: "28px",
  xl: "36px",
  pill: "999px"
} as const;

export const shadows = {
  soft: "0 1px 2px rgba(42, 26, 20, 0.05), 0 12px 32px -10px rgba(42, 26, 20, 0.14)",
  elevated: "0 2px 6px rgba(42, 26, 20, 0.06), 0 28px 64px -18px rgba(42, 26, 20, 0.28)",
  glow: "0 18px 48px -14px rgba(242, 95, 58, 0.55)",
  buddyGlow: "0 18px 48px -14px rgba(126, 98, 236, 0.5)",
  inset: "inset 0 1px 0 rgba(255, 255, 255, 0.72)"
} as const;

export const borders = {
  subtle: `1px solid ${colorScale.sand[200]}`,
  emphasis: `1px solid ${colorScale.sand[300]}`
} as const;

export const motion = {
  duration: {
    instant: "120ms",
    quick: "180ms",
    standard: "260ms",
    leisurely: "420ms",
    cinematic: "900ms"
  },
  easing: {
    standard: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    entrance: "cubic-bezier(0.16, 1, 0.3, 1)",
    exit: "cubic-bezier(0.4, 0, 1, 1)"
  },
  spring: {
    gentle: { damping: 20, stiffness: 160, mass: 1 },
    snappy: { damping: 16, stiffness: 260, mass: 0.8 },
    bouncy: { damping: 11, stiffness: 220, mass: 0.9 }
  }
} as const;

export const zIndex = {
  base: 0,
  overlay: 20,
  modal: 40,
  toast: 60
} as const;

export const layout = {
  widths: {
    reading: "72rem",
    planner: "88rem",
    mobileSheet: "32rem"
  }
} as const;

export const typography = {
  families: {
    display: "Fraunces",
    body: "Plus Jakarta Sans",
    mono: "JetBrains Mono"
  },
  fonts: {
    display: "var(--font-display), Fraunces, Georgia, serif",
    body: "var(--font-body), \"Plus Jakarta Sans\", \"Segoe UI\", sans-serif",
    mono: "var(--font-mono), \"JetBrains Mono\", Consolas, monospace"
  },
  size: {
    hero: "5.5rem",
    display: "3.5rem",
    title: "2.25rem",
    section: "1.5rem",
    body: "1rem",
    label: "0.875rem",
    caption: "0.75rem"
  },
  lineHeight: {
    compact: 1.04,
    cozy: 1.3,
    relaxed: 1.6
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    heavy: 800
  }
} as const;
