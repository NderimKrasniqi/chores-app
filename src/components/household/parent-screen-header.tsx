import { Pressable, View } from "react-native";

import { Avatar } from "@/components/ui/avatar";
import { AppText } from "@/design-system";

/** Title for a parent tab, with the account button on the right. */
export function ParentScreenHeader({
  title,
  subtitle,
  onOpenAccount,
  parentName,
}: {
  title: string;
  subtitle: string;
  onOpenAccount: () => void;
  parentName: string;
  compact?: boolean;
}) {
  return (
    <View className="flex-row items-center pb-2 pt-3">
      <View className="flex-1">
        <AppText variant="screenTitle">{title}</AppText>
        <AppText variant="bodySmall" color="ink-muted" className="mt-0.5">
          {subtitle}
        </AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open your account"
        onPress={onOpenAccount}
        hitSlop={8}
      >
        <Avatar
          tone="parent"
          className="rounded-full"
          fallbackLabel={parentName}
          size={44}
        />
      </Pressable>
    </View>
  );
}
