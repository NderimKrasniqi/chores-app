import { Icon } from "@/components/ui/icon";
import type { ReactNode } from "react";
import { Pressable, type StyleProp, type TextStyle, View } from "react-native";

import { AppText } from "./text";
import { useTheme } from "./theme";

export function TopBar({
  title,
  onBack,
  backLabel = "Back",
  trailing,
  titleStyle,
}: {
  title: string;
  onBack?: () => void;
  backLabel?: string;
  trailing?: ReactNode;
  titleStyle?: StyleProp<TextStyle>;
}) {
  const { tokens } = useTheme();
  return (
    <View className="h-14 flex-row items-center justify-between">
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          onPress={onBack}
          className="h-11 w-11 items-center justify-center"
        >
          <Icon name="back" color={tokens.ink} size={24} />
        </Pressable>
      ) : (
        <View className="h-11 w-11" />
      )}

      <AppText
        variant="sectionTitle"
        className="text-center"
        style={titleStyle}
      >
        {title}
      </AppText>

      <View className="h-11 min-w-11 items-center justify-center">
        {trailing}
      </View>
    </View>
  );
}
