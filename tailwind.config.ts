import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        lucasSky: "#C3EBFA",
        lucasSkyLight: "#EDF9FD",
        lucasPurple: "#CFCEFF",
        lucasPurpleLight: "#F1F0FF",
        lucasYellow: "#FAE27C",
        lucasYellowLight: "#FEFCE8",
        // Dải lạnh→nóng cho badge số lượng (1→5, >5) — xem EventCalendar.tsx.
        lucasGreen: "#C3FAD1",
        lucasOrange: "#FAC38A",
        lucasRed: "#FAB0B0",
        lucasRedDark: "#F2726A",
      },
    },
  },
  plugins: [],
};
export default config;
