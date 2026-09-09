/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Mirrors the web app's --fl-* design tokens (src/app/globals.css)
      // so the mobile UI carries over the same Finlight palette.
      colors: {
        "fl-bg": "#e9ece9",
        "fl-card": "#ffffff",
        "fl-content-bg": "#fbfcfb",
        "fl-ink": "#0f1512",
        "fl-muted": "#6c7873",
        "fl-line": "#e8ebe9",
        "fl-green": "#1a7f4b",
        "fl-green-dark": "#0c4429",
        "fl-green-deep": "#083322",
        "fl-mint": "#bfe4cf",
        "fl-mint-soft": "#eaf5ee",
        "fl-red": "#c0392b",
        "fl-red-soft": "#fdeeec",
        "fl-fill": "#f4f6f5",
        "fl-track": "#eef1ef",
      },
    },
  },
  plugins: [],
};
