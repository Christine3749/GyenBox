import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      boxShadow: { xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)" },
      backdropBlur: { xs: "2px" },
    },
  },
  plugins: [],
}

export default config
