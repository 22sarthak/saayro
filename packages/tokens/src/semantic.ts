import { borders, colorScale, layout, motion, radius, shadows, spacing, typography, zIndex } from "./raw.js";

export const semanticTokens = {
  surface: {
    base: colorScale.ivory[50],
    canvas: colorScale.ivory[100],
    raised: colorScale.white[100],
    muted: colorScale.white[200],
    accentSky: colorScale.sky[100],
    accentBuddy: colorScale.violet[100],
    accentConnected: colorScale.mint[100],
    accentDiscovery: colorScale.amber[100],
    danger: colorScale.error[100]
  },
  text: {
    primary: colorScale.slate[950],
    secondary: colorScale.slate[800],
    muted: colorScale.slate[600],
    subtle: colorScale.slate[400],
    inverted: colorScale.white[100]
  },
  border: {
    subtle: borders.subtle,
    emphasis: borders.emphasis
  },
  accent: {
    maps: colorScale.sky[500],
    buddy: colorScale.violet[500],
    connected: colorScale.mint[500],
    discovery: colorScale.amber[500]
  },
  status: {
    info: colorScale.sky[500],
    success: colorScale.mint[500],
    warning: colorScale.amber[500],
    danger: colorScale.error[500]
  },
  typography,
  spacing,
  radius,
  shadows,
  motion,
  zIndex,
  layout
} as const;

export type SemanticTokens = typeof semanticTokens;

