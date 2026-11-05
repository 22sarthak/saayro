/**
 * Per-trip theming: every trip takes its accent from a seed colour
 * (usually sampled from the cover photo), so Goa feels like Goa and Ladakh like Ladakh.
 */
export type TripTheme = {
  accent: string;
  accentStrong: string;
  accentSoft: string;
  accentInk: string;
  onAccent: string;
  gradient: readonly [string, string, string];
  glow: string;
};

type Hsl = { h: number; s: number; l: number };

function hexToHsl(hex: string): Hsl {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  const r = Number.parseInt(full.slice(0, 2), 16) / 255;
  const g = Number.parseInt(full.slice(2, 4), 16) / 255;
  const b = Number.parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h * 60, s: s * 100, l: l * 100 };
}

function hslToHex({ h, s, l }: Hsl): string {
  const sat = Math.min(100, Math.max(0, s)) / 100;
  const light = Math.min(100, Math.max(0, l)) / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const channel = (n: number) => {
    const color = light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(color * 255).toString(16).padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function createTripTheme(seedHex: string, secondaryHex?: string): TripTheme {
  const seed = hexToHsl(seedHex);
  const saturation = Math.max(55, Math.min(seed.s, 88));
  const accent = hslToHex({ h: seed.h, s: saturation, l: 54 });
  const secondary = secondaryHex ?? hslToHex({ h: (seed.h + 40) % 360, s: saturation - 6, l: 62 });

  return {
    accent,
    accentStrong: hslToHex({ h: seed.h, s: saturation, l: 42 }),
    accentSoft: hslToHex({ h: seed.h, s: Math.min(saturation, 80), l: 94 }),
    accentInk: hslToHex({ h: seed.h, s: 45, l: 18 }),
    onAccent: "#ffffff",
    gradient: [hslToHex({ h: seed.h + 12, s: saturation, l: 70 }), accent, secondary] as const,
    glow: withAlpha(accent, 0.5)
  };
}
