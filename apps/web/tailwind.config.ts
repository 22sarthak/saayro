import type { Config } from "tailwindcss";
import preset from "@saayro/config/tailwind-preset";

const config: Config = {
  presets: [preset],
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
    "../../packages/mock-data/src/**/*.ts"
  ],
  theme: {
    extend: {
      backgroundImage: {
        "atlas-grid":
          "linear-gradient(rgba(130,147,164,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(130,147,164,0.08) 1px, transparent 1px)",
        "hero-wash":
          "radial-gradient(circle at top left, rgba(71,166,243,0.18), transparent 35%), radial-gradient(circle at top right, rgba(140,104,216,0.16), transparent 30%), radial-gradient(circle at bottom right, rgba(210,137,44,0.16), transparent 28%)"
      },
      gridTemplateColumns: {
        shell: "17rem minmax(0,1fr)"
      }
    }
  }
};

export default config;

