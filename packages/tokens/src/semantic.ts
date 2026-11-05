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
    base: colorScale.porcelain[100],
    canvas: colorScale.porcelain[200],
    raised: colorScale.white[100],
    muted: colorScale.white[200],
    inverse: colorScale.slate[900],
    accentSky: colorScale.sky[100],
    accentBuddy: colorScale.violet[100],
    accentConnected: colorScale.mint[100],
    accentDiscovery: colorScale.amber[100],
    accentBrand: colorScale.sky[100],
    danger: colorScale.rose[100]
  },
  text: {
    primary: colorScale.slate[900],
    secondary: colorScale.slate[700],
    muted: colorScale.slate[500],
    subtle: colorScale.slate[400],
    inverted: colorScale.white[100]
  },
  border: {
    subtle: borders.subtle,
    emphasis: borders.emphasis
  },
  brand: {
    primary: colorScale.slate[900],
    primaryPressed: colorScale.slate[800],
    soft: colorScale.slate[100]
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
