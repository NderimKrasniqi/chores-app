import { DesignTokens } from "@/design-system/tokens";

export const DirectionC = {
  color: {
    canvas: DesignTokens.color.canvas,
    surface: DesignTokens.color.surface,
    surfaceMuted: DesignTokens.color.surfaceMuted,
    mint: DesignTokens.color.actionSoft,
    mintStrong: DesignTokens.color.actionSoftStrong,
    lavender: DesignTokens.color.infoSoft,
    lavenderStrong: DesignTokens.color.infoSoftStrong,
    ink: DesignTokens.color.ink,
    inkMuted: DesignTokens.color.inkMuted,
    green: DesignTokens.color.action,
    greenDeep: DesignTokens.color.actionPressed,
    coral: DesignTokens.color.urgency,
    coralSoft: DesignTokens.color.urgencySoft,
    yellow: DesignTokens.color.reward,
    line: DesignTokens.color.line,
    disabled: DesignTokens.color.disabledInk,
    white: DesignTokens.color.white,
  },
  radius: {
    small: DesignTokens.radius.small,
    medium: DesignTokens.radius.control,
    large: DesignTokens.radius.large,
    pill: DesignTokens.radius.pill,
  },
  font: {
    rounded: DesignTokens.fontFamily.rounded,
  },
  shadow: {
    color: DesignTokens.shadow.card.color,
    opacity: DesignTokens.shadow.card.opacity,
    radius: DesignTokens.shadow.card.radius,
    offset: {
      width: DesignTokens.shadow.card.offsetX,
      height: DesignTokens.shadow.card.offsetY,
    },
    elevation: DesignTokens.shadow.card.elevation,
  },
} as const;
