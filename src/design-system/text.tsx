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
// order, so the override silently lost on some screens.
const EXPLICIT_SIZE = /(^|\s)text-\[\d/;

function variantClasses(variant: TypographyToken, className: string) {
  const base = variantClass[variant];
  if (!EXPLICIT_SIZE.test(className)) return base;
  return base
    .split(" ")
    .filter((token) => !token.startsWith("text-"))
    .join(" ");
}

export function AppText({
  variant = "body",
  color = "ink",
  className = "",
  ...props
}: AppTextProps) {
  return (
    <Text
      {...props}
      className={`${variantClasses(variant, className)} ${colorClass[color]} ${className}`}
    />
  );
}
