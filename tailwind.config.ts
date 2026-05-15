import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1a1a1a",
        parchment: "#faf7f2",
        accent: "#7a5b3a",
        ontrack: "#3a7a5b",
        behind: "#b8662e",
      },
      fontFamily: {
        serif: ["Iowan Old Style", "Apple Garamond", "Baskerville", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
