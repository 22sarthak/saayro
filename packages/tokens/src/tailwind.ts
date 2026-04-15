import { colorScale, layout, motion, radius, shadows, spacing, typography } from "./raw.js";

export const tailwindThemeExtension = {
  colors: colorScale,
  borderRadius: radius,
  spacing,
  boxShadow: shadows,
  maxWidth: layout.widths,
  fontFamily: typography.fonts,
  transitionDuration: motion.duration,
  transitionTimingFunction: motion.easing
} as const;

