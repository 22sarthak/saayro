const ivoryAtlasColors = {
  ivory: {
    50: "#fffdf8",
    100: "#fcf7ee",
    200: "#f5ead8",
    300: "#ead7bd"
  },
  slate: {
    50: "#f8f9fb",
    100: "#edf1f5",
    200: "#dbe3ec",
    300: "#b6c3d1",
    400: "#8493a4",
    500: "#617284",
    600: "#48586a",
    700: "#374454",
    800: "#253241",
    900: "#162230",
    950: "#0d1722"
  },
  sky: {
    100: "#eef7ff",
    300: "#9fd4ff",
    500: "#47a6f3",
    700: "#1f6db5"
  },
  violet: {
    100: "#f5f0ff",
    300: "#d0b7ff",
    500: "#8c68d8",
    700: "#5d42a8"
  },
  mint: {
    100: "#ebfbf4",
    300: "#8bd7b1",
    500: "#2f9d74",
    700: "#1f7358"
  },
  amber: {
    100: "#fff6e9",
    300: "#f2c07b",
    500: "#d2892c",
    700: "#9b5d16"
  },
  rose: {
    100: "#fff0ef",
    300: "#f3b0a7",
    500: "#d66b5e",
    700: "#a4473e"
  }
};

module.exports = {
  theme: {
    extend: {
      colors: ivoryAtlasColors,
      boxShadow: {
        soft: "0 18px 45px rgba(20, 32, 48, 0.08)",
        float: "0 24px 60px rgba(20, 32, 48, 0.12)"
      },
      borderRadius: {
        sm: "10px",
        md: "16px",
        lg: "24px",
        pill: "999px"
      },
      spacing: {
        1: "0.25rem",
        2: "0.5rem",
        3: "0.75rem",
        4: "1rem",
        6: "1.5rem",
        8: "2rem",
        12: "3rem",
        16: "4rem"
      },
      maxWidth: {
        editorial: "72rem",
        planner: "88rem"
      }
    }
  }
};

