/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#1b1a18",
          deep: "#26241f",
        },
        muted: "#5f5b55",
        ground: "#f4f3f1",
        surface: "#ffffff",
        line: "#e7e5e1",
        field: "#9d978e",
        accent: {
          DEFAULT: "#c2410c",
          strong: "#9a3412",
          soft: "#fff7ed",
        },
        danger: {
          DEFAULT: "#dc2626",
          strong: "#b91c1c",
          soft: "#fef2f1",
        },
        success: {
          DEFAULT: "#15803d",
          soft: "#f0fdf4",
          line: "#bbf7d0",
        },
      },
      fontFamily: {
        sans: ["var(--ew-font-sans)"],
      },
      fontSize: {
        micro: "0.6875rem",
        label: "0.75rem",
        meta: "0.8125rem",
        "body-sm": "0.875rem",
        body: "1rem",
        title: "1.125rem",
        heading: "1.5rem",
        display: "1.75rem",
      },
      borderRadius: {
        xs: "6px",
        control: "10px",
        tile: "12px",
        panel: "16px",
        pill: "999px",
      },
      boxShadow: {
        panel: "0 1px 2px rgba(27,26,24,0.04), 0 14px 34px -14px rgba(27,26,24,0.20)",
        field: "inset 0 1px 1px rgba(27,26,24,0.03)",
      },
    },
  },
  plugins: [],
}
