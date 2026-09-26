import palettes from "./theme/palettes";

const palette = palettes.PALETTES[palettes.ACTIVE_PALETTE];

/** Theme-independent layout, radius, and motion tokens. Colours live in ./theme. */
export const DesignTokens = {
  radius: { small: 14, control: 18, card: 24, large: 28, sheet: 34, pill: 999 },
  size: {
    minimumTarget: 44,
    control: 54,
    bottomNavigation: 86,
    compactAvatar: 48,
    heroAvatar: 76,
    compactArtwork: 96,
  },
  motion: { quick: 140, standard: 220, celebration: 420 },
  shadowStyle: {
    card: {
      shadowColor: palette.bg,
      shadowOpacity: 0.1,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    floating: {
      shadowColor: palette.bg,
      shadowOpacity: 0.18,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 8,
    },
  },
} as const;

export type TypographyToken =
  | "display"
  | "screenTitle"
  | "sectionTitle"
  | "cardTitle"
  | "amount"
  | "body"
  | "bodySmall"
  | "label"
  | "caption";
