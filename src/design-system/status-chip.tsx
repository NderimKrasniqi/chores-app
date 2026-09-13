import type { ReactNode } from "react";
import { View } from "react-native";

import { AppText } from "./text";

type StatusTone = "success" | "urgent" | "info" | "neutral" | "reward";

const toneClass: Record<StatusTone, string> = {
  success: "bg-actionSoftStrong",
  urgent: "bg-urgencySoft",
  info: "bg-infoSoft",
  neutral: "bg-disabledSurface",
  reward: "bg-rewardSoft",
};

const textColor: Record<
  StatusTone,
  "action" | "urgency" | "ink" | "ink-muted"
> = {
  success: "action",
  urgent: "urgency",
  info: "ink",
  neutral: "ink-muted",
  reward: "ink",
};

export function StatusChip({
  label,
  tone,
  icon,
}: {
  label: string;
  tone: StatusTone;
  icon?: ReactNode;
}) {
  return (
    <View
      className={`min-h-7 flex-row items-center self-start rounded-full px-2.5 ${toneClass[tone]}`}
    >
      {icon}
      <AppText
        variant="caption"
        color={textColor[tone]}
        className={icon ? "ml-1" : ""}
      >
        {label}
      </AppText>
    </View>
  );
}
