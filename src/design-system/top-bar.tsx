import { DirectionCIcon } from "@/components/ui/direction-c-icon";
import { DirectionC } from "@/constants/direction-c";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { AppText } from "./text";

export function TopBar({
  title,
  onBack,
  backLabel = "Back",
  trailing,
}: {
  title: string;
  onBack?: () => void;
  backLabel?: string;
  trailing?: ReactNode;
}) {
  return (
    <View className="h-14 flex-row items-center justify-between">
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          onPress={onBack}
          className="h-11 w-11 items-center justify-center"
        >
          <DirectionCIcon name="back" color={DirectionC.color.ink} size={24} />
        </Pressable>
      ) : (
        <View className="h-11 w-11" />
      )}

      <AppText variant="cardTitle" className="text-center">
        {title}
      </AppText>

      <View className="h-11 min-w-11 items-center justify-center">
        {trailing}
      </View>
    </View>
  );
}
