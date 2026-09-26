import * as Haptics from "expo-haptics";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { PRESS, pressTransition } from "@/components/art/motion";

import { AppText } from "./text";
import { useTheme } from "./theme";

const HOLD_MS = 900;
const RELEASE_MS = 200;
const RELEASE_EASING = Easing.bezier(0.23, 1, 0.32, 1);
const LIP_DEPTH = 5;

/**
 * Hold-to-complete for deliberate commits (sending work for review).
 * Slow on the way in (the user is deciding), snappy on release. Screen reader
 * users get a normal activate action instead of having to hold.
 */
export function HoldButton({
  label,
  holdingLabel = "Keep holding…",
  onComplete,
  disabled = false,
  loading = false,
  leading,
  testID,
}: {
  label: string;
  holdingLabel?: string;
  onComplete: () => void;
  disabled?: boolean;
  loading?: boolean;
  leading?: ReactNode;
  testID?: string;
}) {
  const { tokens } = useTheme();
  const [width, setWidth] = useState(0);
  const [holding, setHolding] = useState(false);
  const progress = useSharedValue(0);
  const inactive = disabled || loading;

  function complete() {
    setHolding(false);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete();
  }

  function pressIn() {
    if (inactive) return;
    setHolding(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    cancelAnimation(progress);
    progress.set(
      withTiming(
        1,
        { duration: HOLD_MS * (1 - progress.get()), easing: Easing.linear },
        (finished) => {
          if (finished) {
            progress.set(0);
            scheduleOnRN(complete);
          }
        },
      ),
    );
  }

  function pressOut() {
    setHolding(false);
    if (progress.get() < 1) {
      progress.set(
        withTiming(0, { duration: RELEASE_MS, easing: RELEASE_EASING }),
      );
    }
  }

  // Transform-only fill: a full-width bar slid in from the left, clipped by
  // the rounded face, so corners stay crisp.
  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (progress.get() - 1) * width }],
  }));

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Press and hold to confirm"
      accessibilityState={{ disabled: inactive, busy: loading }}
      accessibilityActions={[{ name: "activate" }]}
      onAccessibilityAction={() => {
        if (!inactive) complete();
      }}
      disabled={inactive}
      onPressIn={pressIn}
      onPressOut={pressOut}
      pressRetentionOffset={24}
      className={inactive ? "opacity-50" : ""}
    >
      <Animated.View
        style={[
          { transform: [{ scale: holding ? PRESS.scale : 1 }] },
          pressTransition,
        ]}
      >
        <View
          style={{
            borderRadius: 20,
            backgroundColor: tokens.primaryShade,
            paddingBottom: LIP_DEPTH,
          }}
        >
          <View
            onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
            className="min-h-[58px] items-center justify-center overflow-hidden rounded-[20px] px-5"
            style={{ backgroundColor: tokens.primary }}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: width || 1,
                  backgroundColor: "rgba(255, 255, 255, 0.5)",
                },
                fillStyle,
              ]}
            />
            {loading ? (
              <ActivityIndicator color={tokens.onPrimary} />
            ) : (
              <View className="flex-row items-center gap-2.5">
                {leading}
                <AppText
                  className="font-display text-[19px]"
                  style={{ color: tokens.onPrimary }}
                >
                  {holding ? holdingLabel : label}
                </AppText>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}
