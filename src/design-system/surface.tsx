import type { ComponentProps } from "react";
import { View } from "react-native";

import { useTheme } from "./theme";
import { DesignTokens } from "./tokens";

type SurfaceTone =
  "raised" | "mint" | "lavender" | "coral" | "reward" | "muted" | "night";

type SurfaceProps = ComponentProps<typeof View> & {
  tone?: SurfaceTone;
  elevated?: boolean;
};

const toneClass: Record<SurfaceTone, string> = {
  raised: "bg-surfaceRaised",
  mint: "bg-actionSoft",
  lavender: "bg-infoSoft",
  coral: "bg-urgencySoft",
  reward: "bg-rewardSoft",
  muted: "bg-surfaceMuted",
  night: "bg-night",
};

export function Surface({
  tone = "raised",
  elevated,
  className = "",
  style,
  ...props
}: SurfaceProps) {
  const { mode } = useTheme();
  // Night-sky surfaces read as depth through colour, not drop shadow.
  const shadow = elevated ?? (tone === "raised" && mode === "home");

  return (
    <View
      {...props}
      className={`rounded-card ${toneClass[tone]} ${className}`}
      style={[shadow ? DesignTokens.shadowStyle.card : undefined, style]}
    />
  );
}
