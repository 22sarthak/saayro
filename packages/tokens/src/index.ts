export { colorScale, spacing, radius, shadows, borders, motion, zIndex, layout, typography } from "./raw.js";
export { semanticTokens } from "./semantic.js";
export { tailwindThemeExtension } from "./tailwind.js";

export type ColorScale = typeof import("./raw.js").colorScale;
export type SpaceScale = keyof typeof import("./raw.js").spacing;
export type RadiusScale = keyof typeof import("./raw.js").radius;
export type SemanticTokens = typeof import("./semantic.js").semanticTokens;

