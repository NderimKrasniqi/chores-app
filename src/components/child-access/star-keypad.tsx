import * as Haptics from "expo-haptics";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { Easings, PRESS, pressTransition } from "@/components/art/motion";
import { Icon } from "@/components/ui/icon";
import { AppText } from "@/design-system";
import { useTheme } from "@/design-system/theme";

const STAR =
  "M12 1.5l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.6l-6.4 3.5 1.4-7.1-5.3-5 7.2-.9z";

/**
 * The secret star code: one slot per digit, lighting gold as digits go in.
 * `shake` bumps on a wrong code (slots shudder); `celebrate` bumps on a right
 * one (slots pop). With `min === max` the slots are fixed; otherwise they
 * grow with the code up to `max` (older codes saved at 4–8 digits).
 */
export function StarSlots({
  length,
  min,
  max,
  shake = 0,
  celebrate = 0,
}: {
  length: number;
  min: number;
  max: number;
  shake?: number;
  celebrate?: number;
}) {
  const { tokens } = useTheme();
  const reducedMotion = useReducedMotion();
  const offset = useSharedValue(0);
  const pop = useSharedValue(1);
  const count = Math.min(max, Math.max(min, length + (length < max ? 1 : 0)));
  // Only react to changes after mount, never replay an old shake/pop.
  const [mountedShake] = useState(shake);
  const [mountedCelebrate] = useState(celebrate);

  useEffect(() => {
    if (shake === mountedShake || reducedMotion) return;
    offset.set(
      withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 60 }),
        withTiming(-6, { duration: 60 }),
        withTiming(6, { duration: 60 }),
        withTiming(0, { duration: 50 }),
      ),
    );
  }, [mountedShake, offset, reducedMotion, shake]);

  useEffect(() => {
    if (celebrate === mountedCelebrate || reducedMotion) return;
    pop.set(
      withSequence(
        withTiming(1.15, { duration: 140, easing: Easings.out }),
        withSpring(1, { duration: 400, dampingRatio: 0.6 }),
      ),
    );
  }, [celebrate, mountedCelebrate, pop, reducedMotion]);

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.get() }, { scale: pop.get() }],
  }));

  return (
    <Animated.View
      accessible
      accessibilityLabel={
        min === max
          ? `${length} of ${max} digits entered`
          : `${length} of at least ${min} digits entered`
      }
      className="flex-row items-center justify-center gap-2.5"
      style={rowStyle}
    >
      {Array.from({ length: count }, (_, i) => {
        const filled = i < length;
        return (
          <View
            key={i}
            className={`h-12 w-10 items-center justify-center rounded-[14px] ${filled ? "bg-nightRaised" : "border-2 border-dashed border-nightRaised"}`}
          >
            {filled ? (
              <Svg width={22} height={22} viewBox="0 0 24 24">
                <Path d={STAR} fill={tokens.gold} />
              </Svg>
            ) : null}
          </View>
        );
      })}
    </Animated.View>
  );
}

function Key({
  label,
  accessibilityLabel,
  onPress,
  disabled,
  tone = "digit",
  children,
  testID,
}: {
  label?: string;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "digit" | "quiet" | "go";
  children?: ReactNode;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={() => {
        if (!disabled) void Haptics.selectionAsync();
      }}
      onPress={onPress}
      pressRetentionOffset={12}
      className="flex-1 items-center"
    >
      {({ pressed }) => (
        <Animated.View
          className={`h-[64px] w-[64px] items-center justify-center rounded-full ${
            tone === "go"
              ? disabled
                ? "bg-nightRaised"
                : "border-b-4 border-primaryShade bg-primary"
              : tone === "quiet"
                ? ""
                : "bg-surface"
          }`}
          style={[
            {
              opacity: disabled && tone !== "go" ? 0.35 : 1,
              transform: [{ scale: pressed ? PRESS.scale : 1 }],
            },
            pressTransition,
          ]}
        >
          {label ? (
            <AppText className="font-display text-[26px] leading-[30px]">
              {label}
            </AppText>
          ) : (
            children
          )}
        </Animated.View>
      )}
    </Pressable>
  );
}

/**
 * A big friendly number pad instead of the system keyboard: round keys with
 * press feedback, delete on the left, a go key on the right once the code is
 * long enough.
 */
export function StarKeypad({
  value,
  max,
  canSubmit,
  busy = false,
  onDigit,
  onDelete,
  onSubmit,
  submitLabel,
  testID,
}: {
  value: string;
  max: number;
  canSubmit: boolean;
  busy?: boolean;
  /** Called per key; apply with a functional update so fast taps stack. */
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onSubmit: () => void;
  submitLabel: string;
  testID?: string;
}) {
  const { tokens } = useTheme();
  const full = value.length >= max;
  const rows = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
  ];

  return (
    <View testID={testID} className="gap-3">
      {rows.map((row) => (
        <View key={row[0]} className="flex-row">
          {row.map((digit) => (
            <Key
              key={digit}
              testID={testID ? `${testID}-key-${digit}` : undefined}
              label={digit}
              accessibilityLabel={digit}
              disabled={busy || full}
              onPress={() => onDigit(digit)}
            />
          ))}
        </View>
      ))}
      <View className="flex-row">
        <Key
          tone="quiet"
          accessibilityLabel="Delete"
          disabled={busy || value.length === 0}
          onPress={onDelete}
        >
          <Icon name="back" color={tokens.ink} size={24} />
        </Key>
        <Key
          testID={testID ? `${testID}-key-0` : undefined}
          label="0"
          accessibilityLabel="0"
          disabled={busy || full}
          onPress={() => onDigit("0")}
        />
        <Key
          tone="go"
          testID={testID ? `${testID}-submit` : undefined}
          accessibilityLabel={submitLabel}
          disabled={busy || !canSubmit}
          onPress={onSubmit}
        >
          <Icon
            name="check"
            color={canSubmit && !busy ? tokens.night : tokens.inkMuted}
            size={26}
          />
        </Key>
      </View>
    </View>
  );
}
