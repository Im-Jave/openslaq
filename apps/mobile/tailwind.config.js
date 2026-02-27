/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        surface: "#ffffff",
        "surface-secondary": "#f9fafb",
        "surface-tertiary": "#f3f4f6",
        primary: "#111827",
        secondary: "#374151",
        muted: "#6b7280",
        faint: "#9ca3af",
        "border-default": "#e5e7eb",
        "border-strong": "#d1d5db",
        "brand-primary": "#1264a3",
        "brand-success": "#007a5a",
        "danger-bg": "#fef2f2",
        "danger-text": "#b91c1c",
      },
    },
  },
  plugins: [],
};
