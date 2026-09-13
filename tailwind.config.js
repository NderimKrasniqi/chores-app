/** @type {import('tailwindcss').Config} */
const directionC = require("./design/system/tokens.json");

module.exports = {
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
    "./src/design-system/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: directionC.color,
      borderRadius: {
        small: `${directionC.radius.small}px`,
        control: `${directionC.radius.control}px`,
        card: `${directionC.radius.card}px`,
        large: `${directionC.radius.large}px`,
        sheet: `${directionC.radius.sheet}px`,
      },
      fontFamily: {
        rounded: ["ui-rounded", "system-ui", "sans-serif"],
      },
      fontSize: {
        display: [
          `${directionC.typography.display.fontSize}px`,
          {
            lineHeight: `${directionC.typography.display.lineHeight}px`,
            fontWeight: directionC.typography.display.fontWeight,
          },
        ],
        "screen-title": [
          `${directionC.typography.screenTitle.fontSize}px`,
          {
            lineHeight: `${directionC.typography.screenTitle.lineHeight}px`,
            fontWeight: directionC.typography.screenTitle.fontWeight,
          },
        ],
        "section-title": [
          `${directionC.typography.sectionTitle.fontSize}px`,
          {
            lineHeight: `${directionC.typography.sectionTitle.lineHeight}px`,
            fontWeight: directionC.typography.sectionTitle.fontWeight,
          },
        ],
        "card-title": [
          `${directionC.typography.cardTitle.fontSize}px`,
          {
            lineHeight: `${directionC.typography.cardTitle.lineHeight}px`,
            fontWeight: directionC.typography.cardTitle.fontWeight,
          },
        ],
        amount: [
          `${directionC.typography.amount.fontSize}px`,
          {
            lineHeight: `${directionC.typography.amount.lineHeight}px`,
            fontWeight: directionC.typography.amount.fontWeight,
          },
        ],
        body: [
          `${directionC.typography.body.fontSize}px`,
          { lineHeight: `${directionC.typography.body.lineHeight}px` },
        ],
        "body-small": [
          `${directionC.typography.bodySmall.fontSize}px`,
          { lineHeight: `${directionC.typography.bodySmall.lineHeight}px` },
        ],
        label: [
          `${directionC.typography.label.fontSize}px`,
          {
            lineHeight: `${directionC.typography.label.lineHeight}px`,
            fontWeight: directionC.typography.label.fontWeight,
          },
        ],
        caption: [
          `${directionC.typography.caption.fontSize}px`,
          {
            lineHeight: `${directionC.typography.caption.lineHeight}px`,
            fontWeight: directionC.typography.caption.fontWeight,
          },
        ],
      },
      minHeight: {
        target: `${directionC.size.minimumTarget}px`,
        control: `${directionC.size.control}px`,
        "bottom-navigation": `${directionC.size.bottomNavigation}px`,
      },
      width: {
        "avatar-compact": `${directionC.size.compactAvatar}px`,
        "avatar-hero": `${directionC.size.heroAvatar}px`,
        "artwork-compact": `${directionC.size.compactArtwork}px`,
      },
      height: {
        "avatar-compact": `${directionC.size.compactAvatar}px`,
        "avatar-hero": `${directionC.size.heroAvatar}px`,
        "artwork-compact": `${directionC.size.compactArtwork}px`,
      },
    },
  },
  plugins: [],
};
