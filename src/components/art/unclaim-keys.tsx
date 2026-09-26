import { useEffect, type ReactNode } from "react";
import { View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

import { AppText } from "@/design-system/text";
import { useTheme } from "@/design-system/theme";

import { Easings } from "./motion";

const MAX_DRAWN = 5;

function KeyGlyph({ size, color }: { size: number; color: string }) {
  const { tokens } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={8} cy={12} r={5.5} fill={color} />
      <Circle cx={8} cy={12} r={2} fill={tokens.surface} />
      <Path
        d="M13 12h9M18.5 12v4M21.5 12v3"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * Weekly unclaims as keys: gold keys are left, dim ones are spent. When
 * `spending`, the last gold key lifts away to show what an unclaim costs.
 * Decorative: always pair it with text that states the count.
 */
export function UnclaimKeys({
  total,
  remaining,
  spending = false,
  size = 20,
}: {
  total: number;
  remaining: number;
  spending?: boolean;
  size?: number;
}) {
  const { tokens } = useTheme();
  const drawn = Math.min(total, MAX_DRAWN);
  const overflow = total - drawn;
  const shownRemaining = Math.min(remaining, drawn);
  const spendIndex = shownRemaining - 1;

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      className="flex-row items-center gap-1"
    >
      {Array.from({ length: drawn }, (_, i) => {
        const left = i < shownRemaining;
        const glyph = (
          <KeyGlyph
            size={size}
            color={left ? tokens.gold : tokens.nightRaised}
          />
        );
        return i === spendIndex ? (
          <SpendingKey key={i} spending={spending} size={size}>
            {glyph}
          </SpendingKey>
        ) : (
          <View key={i}>{glyph}</View>
        );
      })}
      {overflow > 0 ? (
        <AppText variant="caption" color="ink-muted" className="ml-0.5">
          +{overflow}
        </AppText>
      ) : null}
    </View>
  );
}

function SpendingKey({
  spending,
  size,
  children,
}: {
  spending: boolean;
  size: number;
  children: ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      withTiming(spending ? 1 : 0, {
        duration: spending ? 600 : 200,
        easing: Easings.out,
      }),
    );
  }, [progress, spending]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 0.7, 1], [1, 0.6, 0.25]),
    transform: reducedMotion
      ? []
      : [
          { translateY: interpolate(progress.get(), [0, 1], [0, -size * 0.9]) },
          { rotate: `${interpolate(progress.get(), [0, 1], [0, 35])}deg` },
          { scale: interpolate(progress.get(), [0, 1], [1, 0.8]) },
        ],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}
