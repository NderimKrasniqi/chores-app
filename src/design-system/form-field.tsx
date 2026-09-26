import type { ComponentProps } from "react";
import { TextInput, View } from "react-native";

import { AppText } from "./text";
import { DesignTokens } from "./tokens";

type FormFieldProps = ComponentProps<typeof TextInput> & {
  label: string;
  helper?: string;
  error?: string | null;
  compact?: boolean;
};

export function FormField({
  label,
  helper,
  error,
  multiline,
  compact = false,
  style,
  className = "",
  ...props
}: FormFieldProps) {
  const inputSizing = compact
    ? multiline
      ? "min-h-[44px] px-3 py-2 text-left"
      : "min-h-[40px] px-3 py-2"
    : multiline
      ? "min-h-[92px] py-3 text-left"
      : "min-h-control py-3";

  return (
    <View>
      <AppText
        variant="label"
        className={compact ? "text-[12px] leading-[15px]" : ""}
      >
        {label}
      </AppText>
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={DesignTokens.color.inkFaint}
        style={[style, compact ? { fontSize: 15, lineHeight: 19 } : undefined]}
        className={`mt-2 rounded-control border bg-surfaceRaised px-4 font-rounded text-body text-ink ${
          error ? "border-urgency" : "border-infoSoftStrong"
        } ${inputSizing} ${compact ? "text-[15px] leading-[19px]" : ""} ${className}`}
      />
      {error?.trim() ? (
        <AppText variant="caption" color="urgency" className="mt-1.5">
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="caption" color="ink-muted" className="mt-1.5">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}
