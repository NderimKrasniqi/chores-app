import { Pressable, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { AppText } from "@/design-system";
import { useTheme } from "@/design-system/theme";

/** Title for a parent tab, with the account button on the right. */
export function ParentScreenHeader({
  title,
  subtitle,
  onOpenAccount,
}: {
  title: string;
  subtitle: string;
  onOpenAccount: () => void;
  compact?: boolean;
}) {
  const { tokens } = useTheme();
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
        className="h-11 w-11 items-center justify-center rounded-full"
        style={{ backgroundColor: tokens.surface }}
      >
        <Icon name="person" color={tokens.ink} size={20} />
      </Pressable>
    </View>
  );
}
