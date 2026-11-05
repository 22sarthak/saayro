import {
  borders,
  colorScale,
  glass,
  gradients,
  layout,
  motion,
  radius,
  shadows,
  spacing,
  typography,
  zIndex
} from "./raw.js";

export const semanticTokens = {
  surface: {
    base: colorScale.sand[50],
    canvas: colorScale.sand[100],
    raised: colorScale.white[100],
    muted: colorScale.white[200],
    inverse: colorScale.ink[950],
    accentSky: colorScale.lagoon[100],
    accentBuddy: colorScale.dusk[100],
    accentConnected: colorScale.palm[100],
    accentDiscovery: colorScale.marigold[100],
    accentBrand: colorScale.sunset[100],
    danger: colorScale.rose[100]
  },
  text: {
    primary: colorScale.ink[950],
    secondary: colorScale.ink[800],
    muted: colorScale.ink[600],
    subtle: colorScale.ink[400],
    inverted: colorScale.white[100]
  },
  border: {
    subtle: borders.subtle,
    emphasis: borders.emphasis
  },
  brand: {
    primary: colorScale.sunset[500],
    primaryPressed: colorScale.sunset[600],
    soft: colorScale.sunset[100]
  },
  accent: {
    maps: colorScale.lagoon[500],
    buddy: colorScale.dusk[500],
    connected: colorScale.palm[500],
    discovery: colorScale.marigold[500]
  },
  status: {
    info: colorScale.lagoon[500],
    success: colorScale.palm[500],
    warning: colorScale.marigold[500],
    danger: colorScale.rose[500]
  },
  gradients,
  glass,
  typography,
  spacing,
  radius,
  shadows,
  motion,
  zIndex,
  layout
} as const;

export type SemanticTokens = typeof semanticTokens;
