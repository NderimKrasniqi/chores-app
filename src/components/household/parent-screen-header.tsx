import { AppText } from "@/design-system";
import { DirectionCAvatar } from "@/components/ui/direction-c-avatar";
import { Pressable, View } from "react-native";

const parentAvatar = require("../../../assets/images/direction-c/sam-avatar.png");

export function ParentScreenHeader({
  title,
  subtitle,
  onOpenAccount,
}: {
  title: string;
  subtitle: string;
  onOpenAccount: () => void;
}) {
  return (
    <View className="flex-row items-center">
      <View className="flex-1 pr-4">
        <AppText variant="display">{title}</AppText>
        <AppText className="mt-1">{subtitle}</AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Parent account"
        onPress={onOpenAccount}
        className="h-[64px] w-[64px]"
      >
        <DirectionCAvatar
          source={parentAvatar}
          tone="parent"
          className="h-full w-full"
        />
      </Pressable>
    </View>
  );
}
