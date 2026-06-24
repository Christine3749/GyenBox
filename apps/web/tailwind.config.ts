import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        popover: "hsl(var(--popover))",
        "popover-foreground": "hsl(var(--popover-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        destructive: "hsl(var(--destructive))",
        "destructive-foreground": "hsl(var(--destructive-foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        "page-bg": "#07070E",
        surface: "#0F0F1A",
        "card-bg": "#13131F",
        "card-hover": "#171724",
        overlay: "#1F1F2E",
        "border-subtle": "#1E1E2E",
        "border-default": "#2A2A3D",
        "border-strong": "#3D3D5C",
        "accent-dim": "#5B4FD4",
        "accent-text": "#A99FF8",
        "text-primary": "#EEEEF8",
        "text-secondary": "#8A8AA8",
        "text-muted": "#4A4A6A",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px hsl(var(--primary) / 0.25), 0 18px 54px hsl(var(--primary) / 0.13)",
      },
      ringWidth: {
        3: "3px",
      },
      spacing: {
        "8.5": "2.125rem",
        18: "4.5rem",
      },
      zIndex: {
        90: "90",
        100: "100",
        150: "150",
        200: "200",
        500: "500",
        1000: "1000",
      },
    },
  },
  plugins: [],
}

export default config
