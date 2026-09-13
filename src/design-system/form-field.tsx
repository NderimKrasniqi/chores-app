import type { ComponentProps } from "react";
import { TextInput, View } from "react-native";

import { AppText } from "./text";
import { DesignTokens } from "./tokens";

type FormFieldProps = ComponentProps<typeof TextInput> & {
  label: string;
  helper?: string;
  error?: string | null;
};

export function FormField({
  label,
  helper,
  error,
  multiline,
  className = "",
  ...props
}: FormFieldProps) {
  return (
    <View>
      <AppText variant="label">{label}</AppText>
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={DesignTokens.color.inkFaint}
        className={`mt-2 min-h-control rounded-control border bg-surfaceRaised px-4 font-rounded text-body text-ink ${
          error ? "border-urgency" : "border-infoSoftStrong"
        } ${multiline ? "min-h-[92px] py-3 text-left" : "py-3"} ${className}`}
      />
      {error ? (
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
