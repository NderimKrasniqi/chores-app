import { AppText } from "@/design-system";
import { Avatar } from "@/components/ui/avatar";
import { Pressable, View } from "react-native";

const parentAvatar = require("../../../assets/images/direction-c/sam-avatar.png");

export function ParentScreenHeader({
  title,
  subtitle,
  onOpenAccount,
  compact = false,
}: {
  title: string;
  subtitle: string;
  onOpenAccount: () => void;
  compact?: boolean;
}) {
  return (
    <View className="flex-row items-center px-1">
      <View className="flex-1">
        <AppText variant="display" style={{ fontSize: 36, lineHeight: 40 }}>
          {title}
        </AppText>
        <AppText
          variant={compact ? "body" : "bodySmall"}
          className={compact ? "mt-0" : "mt-1"}
          style={compact ? { fontSize: 17, lineHeight: 20 } : undefined}
        >
          {subtitle}
        </AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Parent account"
        onPress={onOpenAccount}
        className="h-[76px] w-[76px]"
      >
        <Avatar
          source={parentAvatar}
          tone="parent"
          className="h-full w-full"
        />
      </Pressable>
    </View>
  );
}
