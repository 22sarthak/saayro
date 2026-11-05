import { colorScale, layout, legacyColorAliases, motion, radius, shadows, spacing, typography } from "./raw.js";

// Tailwind's built-in `white` stays intact so `bg-white/80` style opacity utilities keep working.
const { white: _white, ...tailwindColors } = colorScale;

export const tailwindThemeExtension = {
  colors: { ...legacyColorAliases, ...tailwindColors },
  borderRadius: radius,
  spacing,
  boxShadow: shadows,
  maxWidth: layout.widths,
  fontFamily: typography.fonts,
  transitionDuration: motion.duration,
  transitionTimingFunction: motion.easing
} as const;
