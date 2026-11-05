/**
 * Ivory Atlas, porcelain edition — Saayro v2 design language.
 * Cool porcelain base, slate text, and subtle hues that each mean something:
 * sky = maps/movement/flights, violet = Buddy/intelligence, mint = success/connected, amber = discovery/food/culture.
 */
export const colorScale = {
  porcelain: {
    50: "#fcfdfe",
    100: "#f7f8fa",
    200: "#eef1f5",
    300: "#e3e8ef",
    400: "#cfd7e2",
    500: "#9aa6b6"
  },
  white: {
    100: "#ffffff",
    200: "#fbfcfd"
  },
  slate: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
    950: "#0b1120"
  },
  sky: {
    50: "#f2f8fd",
    100: "#e3f0fa",
    200: "#c4e1f5",
    300: "#95cbee",
    400: "#5aafe2",
    500: "#2f93d0",
    600: "#2277b0",
    700: "#1d5f8e",
    800: "#1b4f74",
    900: "#173f5c"
  },
  violet: {
    50: "#f7f5ff",
    100: "#efeafe",
    200: "#ddd4fd",
    300: "#c3b3fa",
    400: "#a28bf4",
    500: "#8466e8",
    600: "#6c4fd0",
    700: "#5840a8",
    800: "#463587",
    900: "#382b6b"
  },
  mint: {
    50: "#effbf6",
    100: "#d9f5e8",
    200: "#b2ead2",
    300: "#7fd8b5",
    400: "#47be93",
    500: "#22a378",
    600: "#168461",
    700: "#136a4f",
    800: "#125541",
    900: "#0f4535"
  },
  amber: {
    50: "#fff9eb",
    100: "#fef0c9",
    200: "#fde08e",
    300: "#fbcb54",
    400: "#f5b02e",
    500: "#e09312",
    600: "#b8730c",
    700: "#8f580e",
    800: "#744711",
    900: "#5e3a12"
  },
  rose: {
    50: "#fff5f6",
    100: "#ffecee",
    200: "#fccdd3",
    300: "#f6a3ae",
    400: "#ea7183",
    500: "#d9445a",
    600: "#b93248",
    700: "#9e2a3c",
    800: "#7f2433",
    900: "#64202c"
  }
} as const;

/** v1 colour names that are not part of the palette above. Remove once every screen is rebuilt. */
export const legacyColorAliases = {
  ivory: colorScale.porcelain,
  error: colorScale.rose
} as const;

export const gradients = {
  aurora: ["#8cc7ee", "#b3a2f6", "#8fdcbd"],
  buddy: ["#a28bf4", "#c3b3fa", "#95cbee"],
  sky: ["#5aafe2", "#2f93d0", "#1d5f8e"],
  scrim: ["rgba(15,23,42,0)", "rgba(15,23,42,0.35)", "rgba(15,23,42,0.82)"]
} as const;

export const glass = {
  light: {
    background: "rgba(255, 255, 255, 0.66)",
    border: "rgba(255, 255, 255, 0.6)",
    blur: 24
  },
  dark: {
    background: "rgba(15, 23, 42, 0.42)",
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
  soft: "0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 32px -12px rgba(15, 23, 42, 0.12)",
  elevated: "0 2px 6px rgba(15, 23, 42, 0.05), 0 28px 64px -20px rgba(15, 23, 42, 0.22)",
  glow: "0 18px 48px -14px rgba(47, 147, 208, 0.45)",
  buddyGlow: "0 18px 48px -14px rgba(132, 102, 232, 0.45)",
  inset: "inset 0 1px 0 rgba(255, 255, 255, 0.72)"
} as const;

export const borders = {
  subtle: `1px solid ${colorScale.slate[200]}`,
  emphasis: `1px solid ${colorScale.slate[300]}`
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
    display: "Bricolage Grotesque",
    body: "Plus Jakarta Sans",
    mono: "JetBrains Mono"
  },
  fonts: {
    display: "var(--font-display), \"Bricolage Grotesque\", \"Segoe UI\", sans-serif",
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
