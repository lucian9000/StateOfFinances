import type { Config } from "tailwindcss";

// Design tokens wired from the StateOfFinances Design System (CSS vars in
// globals.css). Additive over the previous config — existing utilities keep
// working; this exposes the full radius/shadow/gradient/semantic set so
// components (incl. the Grocery tab) can use the system directly.
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-raised": "var(--surface-raised)",
        violet: "var(--violet)",
        magenta: "var(--magenta)",
        cyan: "var(--cyan)",
        amber: "var(--amber)",
        text: "var(--text)",
        "text-muted": "var(--text-muted)",
        // Semantic aliases
        primary: "var(--color-primary)",
        income: "var(--color-income)",
        spend: "var(--color-spend)",
        savings: "var(--color-savings)",
        goals: "var(--color-goals)",
        // Category palette (stable by index)
        "category-0": "var(--category-0)",
        "category-1": "var(--category-1)",
        "category-2": "var(--category-2)",
        "category-3": "var(--category-3)",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        card: "var(--radius-card)",
        full: "var(--radius-full)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "glow-violet": "var(--shadow-glow-violet)",
        "glow-cyan": "var(--shadow-glow-cyan)",
        "glow-magenta": "var(--shadow-glow-magenta)",
      },
      backgroundImage: {
        hero: "var(--gradient-hero)",
        "gradient-violet": "var(--gradient-violet)",
      },
      transitionTimingFunction: {
        ds: "ease",
      },
    },
  },
  plugins: [],
};
export default config;
