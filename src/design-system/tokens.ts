import rawTokens from "../../design/system/tokens.json";
import { Platform } from "react-native";

export const DesignTokens = {
  ...rawTokens,
  fontFamily: {
    rounded: Platform.select({
      ios: "ui-rounded",
      android: "sans-serif",
      default: "system-ui",
    }),
    regular: Platform.select({
      ios: "system-ui",
      android: "sans-serif",
      default: "system-ui",
    }),
  },
  shadowStyle: {
    card: {
      shadowColor: rawTokens.shadow.card.color,
      shadowOpacity: rawTokens.shadow.card.opacity,
      shadowRadius: rawTokens.shadow.card.radius,
      shadowOffset: {
        width: rawTokens.shadow.card.offsetX,
        height: rawTokens.shadow.card.offsetY,
      },
      elevation: rawTokens.shadow.card.elevation,
    },
    floating: {
      shadowColor: rawTokens.shadow.floating.color,
      shadowOpacity: rawTokens.shadow.floating.opacity,
      shadowRadius: rawTokens.shadow.floating.radius,
      shadowOffset: {
        width: rawTokens.shadow.floating.offsetX,
        height: rawTokens.shadow.floating.offsetY,
      },
      elevation: rawTokens.shadow.floating.elevation,
    },
  },
} as const;

export type TypographyToken = keyof typeof DesignTokens.typography;
