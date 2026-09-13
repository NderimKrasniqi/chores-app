import type { ComponentProps, ReactNode } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import { AppText } from "./text";
import { DesignTokens } from "./tokens";

type ButtonTone = "primary" | "destructive" | "secondary" | "quiet";

type ActionButtonProps = Omit<ComponentProps<typeof Pressable>, "children"> & {
  label: string;
  tone?: ButtonTone;
  leading?: ReactNode;
  trailing?: ReactNode;
  loading?: boolean;
};

const toneClass: Record<ButtonTone, string> = {
  primary: "bg-action",
  destructive: "bg-urgency",
  secondary: "border-2 border-infoSoftStrong bg-surfaceRaised",
  quiet: "bg-transparent",
};

export function ActionButton({
  label,
  tone = "primary",
  leading,
  trailing,
  loading = false,
  disabled,
  className = "",
  ...props
}: ActionButtonProps) {
  const isDisabled = disabled || loading;
  const lightLabel = tone === "primary" || tone === "destructive";

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      className={`min-h-control items-center justify-center rounded-control px-5 ${toneClass[tone]} ${isDisabled ? "opacity-50" : ""} ${className}`}
    >
      {loading ? (
        <ActivityIndicator
          color={lightLabel ? DesignTokens.color.white : DesignTokens.color.ink}
        />
      ) : (
        <View className="flex-row items-center justify-center gap-2.5">
          {leading}
          <AppText
            variant="cardTitle"
            color={lightLabel ? "white" : tone === "quiet" ? "action" : "ink"}
            className="text-center"
          >
            {label}
          </AppText>
          {trailing}
        </View>
      )}
    </Pressable>
  );
}
