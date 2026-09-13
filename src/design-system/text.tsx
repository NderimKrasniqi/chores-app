import type { ComponentProps } from "react";
import { Text } from "react-native";

import type { TypographyToken } from "./tokens";

type TextColor =
  "ink" | "ink-muted" | "ink-faint" | "action" | "urgency" | "white";

type AppTextProps = ComponentProps<typeof Text> & {
  variant?: TypographyToken;
  color?: TextColor;
};

const variantClass: Record<TypographyToken, string> = {
  display: "text-display",
  screenTitle: "text-screen-title",
  sectionTitle: "text-section-title",
  cardTitle: "text-card-title",
  amount: "text-amount",
  body: "text-body font-medium",
  bodySmall: "text-body-small font-medium",
  label: "text-label",
  caption: "text-caption",
};

const colorClass: Record<TextColor, string> = {
  ink: "text-ink",
  "ink-muted": "text-inkMuted",
  "ink-faint": "text-inkFaint",
  action: "text-action",
  urgency: "text-urgency",
  white: "text-white",
};

export function AppText({
  variant = "body",
  color = "ink",
  className = "",
  ...props
}: AppTextProps) {
  return (
    <Text
      {...props}
      className={`font-rounded ${variantClass[variant]} ${colorClass[color]} ${className}`}
    />
  );
}
