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
        "golden-hour": "linear-gradient(135deg, #ffb37a 0%, #ff7e8a 48%, #9f86fa 100%)",
        "buddy-sheen": "linear-gradient(135deg, #9f86fa 0%, #c2b1ff 55%, #ffa47f 100%)",
        "photo-scrim": "linear-gradient(180deg, rgba(19,16,33,0) 30%, rgba(19,16,33,0.35) 60%, rgba(19,16,33,0.85) 100%)",
        "hero-wash":
          "radial-gradient(circle at 15% 10%, rgba(255,164,127,0.35), transparent 40%), radial-gradient(circle at 85% 0%, rgba(159,134,250,0.28), transparent 38%), radial-gradient(circle at 70% 90%, rgba(63,191,184,0.22), transparent 40%)"
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
        }
      },
      animation: {
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
