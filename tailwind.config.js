/** @type {import('tailwindcss').Config} */
const { SEMANTIC_KEYS, cssVar } = require("./src/design-system/theme/palettes");

// Every colour class resolves to a CSS variable set by <ThemeScope>, so the
// Child ("quest", dark) and Parent ("home", light) surfaces share classes and
// the palette can change in one place (src/design-system/theme/palettes.js).
const colors = Object.fromEntries(
  SEMANTIC_KEYS.map((key) => [key, `var(${cssVar(key)})`]),
);

module.exports = {
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
    "./src/design-system/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors,
      borderRadius: {
        small: "14px",
        control: "18px",
        card: "24px",
        large: "28px",
        sheet: "34px",
      },
      fontFamily: {
        // Nunito for reading, Fredoka for playful display type.
        rounded: ["Nunito_700Bold"],
        body: ["Nunito_600SemiBold"],
        "body-bold": ["Nunito_700Bold"],
        "body-heavy": ["Nunito_800ExtraBold"],
        display: ["Fredoka_700Bold"],
        "display-medium": ["Fredoka_600SemiBold"],
      },
      fontSize: {
        display: ["40px", { lineHeight: "44px" }],
        "screen-title": ["30px", { lineHeight: "34px" }],
        "section-title": ["22px", { lineHeight: "27px" }],
        "card-title": ["18px", { lineHeight: "23px" }],
        amount: ["28px", { lineHeight: "32px" }],
        body: ["16px", { lineHeight: "23px" }],
        "body-small": ["14px", { lineHeight: "19px" }],
        label: ["14px", { lineHeight: "18px" }],
        caption: ["12px", { lineHeight: "16px" }],
      },
      minHeight: {
        target: "44px",
        control: "54px",
        "bottom-navigation": "86px",
      },
      width: {
        "avatar-compact": "48px",
        "avatar-hero": "76px",
        "artwork-compact": "96px",
      },
      height: {
        "avatar-compact": "48px",
        "avatar-hero": "76px",
        "artwork-compact": "96px",
      },
    },
  },
  plugins: [],
};
