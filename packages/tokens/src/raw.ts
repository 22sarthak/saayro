export const colorScale = {
  ivory: {
    50: "#fffdfa",
    100: "#fdf8ef",
    200: "#f6ead8",
    300: "#ebdac0"
  },
  white: {
    100: "#ffffff",
    200: "#fdfdfc"
  },
  slate: {
    50: "#f7f9fb",
    100: "#edf1f5",
    200: "#dae2eb",
    300: "#bcc7d4",
    400: "#8d9aab",
    500: "#657487",
    600: "#4b5a6c",
    700: "#354252",
    800: "#23303f",
    900: "#172230",
    950: "#0c1620"
  },
  sky: {
    100: "#eef7ff",
    200: "#d2ebff",
    300: "#a4d5ff",
    400: "#6cbbfb",
    500: "#429fe8",
    600: "#2f83c8",
    700: "#2168a5"
  },
  violet: {
    100: "#f6f1ff",
    200: "#e7d9ff",
    300: "#cfb4ff",
    400: "#af87f0",
    500: "#8c68d8",
    600: "#6e4fb3",
    700: "#563d89"
  },
  mint: {
    100: "#ebfbf4",
    200: "#c9f0dd",
    300: "#93ddb8",
    400: "#5dbf93",
    500: "#2f9d74",
    600: "#227f5d",
    700: "#185f47"
  },
  amber: {
    100: "#fff7ec",
    200: "#f8dfb8",
    300: "#efbf7c",
    400: "#e09f46",
    500: "#c98321",
    600: "#a66a1a",
    700: "#7f5114"
  },
  error: {
    100: "#fff1ef",
    200: "#f7d1ca",
    300: "#eca096",
    400: "#de7569",
    500: "#c45548",
    600: "#9c3d34",
    700: "#7b2c27"
  }
} as const;

export const spacing = {
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  6: "1.5rem",
  8: "2rem",
  12: "3rem",
  16: "4rem"
} as const;

export const radius = {
  sm: "10px",
  md: "16px",
  lg: "24px",
  pill: "999px"
} as const;

export const shadows = {
  soft: "0 18px 45px rgba(17, 28, 40, 0.08)",
  elevated: "0 24px 60px rgba(17, 28, 40, 0.12)",
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
    standard: "240ms",
    leisurely: "320ms"
  },
  easing: {
    standard: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    entrance: "cubic-bezier(0.12, 0.9, 0.24, 1)",
    exit: "cubic-bezier(0.4, 0, 1, 1)"
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
  fonts: {
    display: "\"Iowan Old Style\", \"Palatino Linotype\", \"Book Antiqua\", Georgia, serif",
    body: "\"Avenir Next\", \"Segoe UI\", \"Helvetica Neue\", sans-serif",
    mono: "\"SFMono-Regular\", Consolas, \"Liberation Mono\", Menlo, monospace"
  },
  size: {
    hero: "4rem",
    display: "3rem",
    title: "2rem",
    section: "1.5rem",
    body: "1rem",
    label: "0.875rem",
    caption: "0.75rem"
  },
  lineHeight: {
    compact: 1.1,
    cozy: 1.35,
    relaxed: 1.6
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700
  }
} as const;

