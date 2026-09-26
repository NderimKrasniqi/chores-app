import type { ComponentProps, ReactNode } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import Animated from "react-native-reanimated";

import { PRESS, pressTransition } from "@/components/art/motion";

import { AppText } from "./text";
import { useTheme } from "./theme";

const LIP_DEPTH = 5;
const LIP_RADIUS = 18;

type ButtonTone =
  | "primary"
  | "commit"
  | "soft"
  | "destructive"
  | "destructiveSecondary"
  | "secondary"
  | "quiet";

type ActionButtonProps = Omit<ComponentProps<typeof Pressable>, "children"> & {
  label: string;
  tone?: ButtonTone;
  leading?: ReactNode;
  trailing?: ReactNode;
  loading?: boolean;
  labelClassName?: string;
  labelStyle?: ComponentProps<typeof AppText>["style"];
};

/**
 * Chunky Quest Path button. Filled tones sit on a darker "3D" lip that
 * squashes when pressed.
 */
export function ActionButton({
  label,
  tone = "primary",
  leading,
  trailing,
  loading = false,
  labelClassName = "",
  labelStyle,
  disabled,
  className = "",
  style,
  ...props
}: ActionButtonProps) {
  const { mode, tokens } = useTheme();
  const isDisabled = disabled || loading;

  // Quest (child) primary is the lime chunky button; home (parent) primary
  // is deep ink so it reads as a serious action on light surfaces.
  const palette: Record<
    ButtonTone,
    { fill: string; lip: string | null; text: string; border?: string }
  > = {
    primary:
      mode === "quest"
        ? {
            fill: tokens.primary,
            lip: tokens.primaryShade,
            text: tokens.onPrimary,
          }
        : {
            fill: tokens.action,
            lip: tokens.actionPressed,
            text: tokens.primary,
          },
    soft:
      mode === "quest"
        ? { fill: tokens.nightRaised, lip: tokens.nightTrack, text: tokens.ink }
        : {
            fill: tokens.actionSoftStrong,
            lip: tokens.primaryShade,
            text: tokens.ink,
          },
    // A deliberate, consequential choice (claim-and-lock): warm accent.
    commit: {
      fill: tokens.accent,
      lip: tokens.accentShade,
      text: tokens.night,
    },
    destructive: {
      fill: tokens.urgency,
      lip: tokens.urgencyPressed,
      text: tokens.white,
    },
    destructiveSecondary: {
      fill: "transparent",
      lip: null,
      text: tokens.urgency,
      border: tokens.urgency,
    },
    secondary: {
      fill: mode === "quest" ? tokens.surface : tokens.surface,
      lip: null,
      text: tokens.ink,
      border: tokens.infoSoftStrong,
    },
    quiet: { fill: "transparent", lip: null, text: tokens.inkMuted },
  };
  const colors = palette[tone];

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      pressRetentionOffset={16}
      className={`${isDisabled ? "opacity-50" : ""} ${className}`}
      style={style}
    >
      {({ pressed }) => (
        // Feedback on press-in: the whole button eases to 0.97 while the face
        // sinks onto its lip. Transform-only, 120ms, strong ease-out.
        <Animated.View
          style={[
            { transform: [{ scale: pressed ? PRESS.scale : 1 }] },
            pressTransition,
          ]}
        >
          <View
            style={{
              borderRadius: LIP_RADIUS,
              backgroundColor: colors.lip ?? "transparent",
              paddingBottom: colors.lip ? LIP_DEPTH : 0,
            }}
          >
            <Animated.View
              className="items-center justify-center rounded-control px-5"
              style={[
                {
                  minHeight: colors.lip ? 54 - LIP_DEPTH : 54,
                  backgroundColor: colors.fill,
                  borderWidth: colors.border ? 2 : 0,
                  borderColor: colors.border,
                  transform: [
                    { translateY: colors.lip && pressed ? LIP_DEPTH - 2 : 0 },
                  ],
                },
                pressTransition,
              ]}
            >
              {loading ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <View className="flex-row items-center justify-center gap-2.5">
                  {leading}
                  <AppText
                    variant="cardTitle"
                    className={`text-center font-display ${labelClassName}`}
                    style={[{ color: colors.text }, labelStyle]}
                  >
                    {label}
                  </AppText>
                  {trailing}
                </View>
              )}
            </Animated.View>
          </View>
        </Animated.View>
      )}
    </Pressable>
  );
}
