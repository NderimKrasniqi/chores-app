import type { ComponentProps } from "react";
import { Text } from "react-native";

import type { TypographyToken } from "./tokens";

type TextColor =
  | "ink"
  | "ink-muted"
  | "ink-faint"
  | "action"
  | "urgency"
  | "white"
  | "primary"
  | "accent"
  | "gold"
  | "pink"
  | "on-primary";

type AppTextProps = ComponentProps<typeof Text> & {
  variant?: TypographyToken;
  color?: TextColor;
};

// Fredoka for display roles, Nunito for everything read at length.
const variantClass: Record<TypographyToken, string> = {
  display: "font-display text-display",
  screenTitle: "font-display text-screen-title",
  sectionTitle: "font-display text-section-title",
  cardTitle: "font-body-heavy text-card-title",
  amount: "font-display text-amount",
  body: "font-body text-body",
  bodySmall: "font-body text-body-small",
  label: "font-body-heavy text-label",
  caption: "font-body-bold text-caption",
};

const colorClass: Record<TextColor, string> = {
  ink: "text-ink",
  "ink-muted": "text-inkMuted",
  "ink-faint": "text-inkFaint",
  action: "text-action",
  urgency: "text-urgency",
  white: "text-white",
  primary: "text-primary",
  accent: "text-accent",
  gold: "text-gold",
  pink: "text-pink",
  "on-primary": "text-onPrimary",
};

// An explicit size like `text-[22px]` must replace the variant's size, not
// compete with it: with two font-size classes NativeWind picks by stylesheet
// order, so the override silently lost on some screens. Dropping the variant
// class also drops its line height, so when the caller sets no `leading-*`,
// keep the variant's proportions at the new size.
const EXPLICIT_SIZE = /(^|\s)text-\[(\d+(?:\.\d+)?)px\]/;
const EXPLICIT_LEADING = /(^|\s)leading-/;

// Line height ÷ font size for each variant (tailwind.config.js type scale).
const leadingRatio: Record<TypographyToken, number> = {
  display: 44 / 40,
  screenTitle: 34 / 30,
  sectionTitle: 27 / 22,
  cardTitle: 23 / 18,
  amount: 32 / 28,
  body: 23 / 16,
  bodySmall: 19 / 14,
  label: 18 / 14,
  caption: 16 / 12,
};

function sizing(variant: TypographyToken, className: string) {
  const base = variantClass[variant];
  const match = className.match(EXPLICIT_SIZE);
  if (!match) return { classes: base, lineHeight: undefined };
  const classes = base
    .split(" ")
    .filter((token) => !token.startsWith("text-"))
    .join(" ");
  const lineHeight = EXPLICIT_LEADING.test(className)
    ? undefined
    : Math.round(Number(match[2]) * leadingRatio[variant]);
  return { classes, lineHeight };
}

export function AppText({
  variant = "body",
  color = "ink",
  className = "",
  style,
  ...props
}: AppTextProps) {
  const { classes, lineHeight } = sizing(variant, className);
  return (
    <Text
      {...props}
      style={lineHeight === undefined ? style : [{ lineHeight }, style]}
      className={`${classes} ${colorClass[color]} ${className}`}
    />
  );
}
