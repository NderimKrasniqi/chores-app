import type { ComponentProps } from "react";
import { View } from "react-native";
import { DesignTokens } from "./tokens";

type SurfaceTone =
  "raised" | "mint" | "lavender" | "coral" | "reward" | "muted";

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
};

export function Surface({
  tone = "raised",
  elevated = tone === "raised",
  className = "",
  style,
  ...props
}: SurfaceProps) {
  return (
    <View
      {...props}
      className={`rounded-card ${toneClass[tone]} ${className}`}
      style={[elevated ? DesignTokens.shadowStyle.card : undefined, style]}
    />
  );
}
