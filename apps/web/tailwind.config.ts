import type { Config } from "tailwindcss";
import { tailwindThemeExtension } from "@saayro/tokens";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
    "../../packages/mock-data/src/**/*.ts"
  ],
  theme: {
    extend: {
      ...tailwindThemeExtension,
      colors: { ...tailwindThemeExtension.colors },
      fontFamily: {
        display: [tailwindThemeExtension.fontFamily.display],
        body: [tailwindThemeExtension.fontFamily.body],
        mono: [tailwindThemeExtension.fontFamily.mono]
      },
      boxShadow: { ...tailwindThemeExtension.boxShadow, float: tailwindThemeExtension.boxShadow.elevated },
      backgroundImage: {
        aurora: "linear-gradient(135deg, #8cc7ee 0%, #b3a2f6 55%, #8fdcbd 100%)",
        "photo-scrim": "linear-gradient(180deg, rgba(15,23,42,0) 30%, rgba(15,23,42,0.35) 60%, rgba(15,23,42,0.85) 100%)"
      },
      gridTemplateColumns: {
        shell: "17rem minmax(0,1fr)"
      },
      keyframes: {
        "aurora-drift": {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(4%, -3%, 0) scale(1.08)" }
        },
        "rise-in": {
          from: { opacity: "0", transform: "translateY(18px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" }
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" }
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" }
        },
        dash: {
          to: { strokeDashoffset: "-64" }
        },
        "ken-burns": {
          from: { transform: "scale(1.12)" },
          to: { transform: "scale(1.02)" }
        },
        "reel-progress": {
          from: { width: "0%" },
          to: { width: "100%" }
        }
      },
      animation: {
        "ken-burns": "ken-burns 7s ease-out both",
        "reel-progress": "reel-progress 5s linear both",
        marquee: "marquee 48s linear infinite",
        dash: "dash 1.6s linear infinite",
        "aurora-drift": "aurora-drift 18s ease-in-out infinite",
        "rise-in": "rise-in 900ms cubic-bezier(0.16, 1, 0.3, 1) both",
        shimmer: "shimmer 2.4s linear infinite",
        float: "float 6s ease-in-out infinite"
      }
    }
  }
};

export default config;
