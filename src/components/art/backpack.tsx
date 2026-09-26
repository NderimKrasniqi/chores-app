import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { useTheme } from "@/design-system/theme";

import { ChoreIcon } from "./chore-art";
import { Easings, useEntrance, useLoop } from "./motion";

/**
 * The one-quest backpack: a Child carries exactly one Extra at a time.
 * Empty, a ghost slot breathes where a quest would sit. Full, the quest peeks
 * out of the top — it drops in on arrival and lifts out when `leaving`.
 */
export function Backpack({
  size = 120,
  title,
  leaving = false,
}: {
  size?: number;
  /** Title of the carried quest; empty backpack when omitted. */
  title?: string;
  leaving?: boolean;
}) {
  const { tokens } = useTheme();
  const s = size / 120;
  const height = 130 * s;
  const itemSize = 58 * s;

  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={{ width: size, height }}
    >
      {title ? (
        <CarriedQuest
          title={title}
          size={itemSize}
          left={(size - itemSize) / 2}
          top={8 * s}
          leaving={leaving}
        />
      ) : (
        <EmptySlot
          size={itemSize}
          left={(size - itemSize) / 2}
          top={10 * s}
          color={tokens.inkMuted}
        />
      )}
      <Svg
        width={size}
        height={height}
        viewBox="0 0 120 130"
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        <Path
          d="M22 70 q-12 0 -12 14 v16 q0 10 10 10"
          fill="none"
          stroke={tokens.accentShade}
          strokeWidth={6}
          strokeLinecap="round"
        />
        <Path
          d="M98 70 q12 0 12 14 v16 q0 10 -10 10"
          fill="none"
          stroke={tokens.accentShade}
          strokeWidth={6}
          strokeLinecap="round"
        />
        <Rect
          x={18}
          y={52}
          width={84}
          height={74}
          rx={24}
          fill={tokens.accent}
        />
        <Rect
          x={12}
          y={46}
          width={96}
          height={14}
          rx={7}
          fill={tokens.accentShade}
        />
        <Rect
          x={32}
          y={80}
          width={56}
          height={36}
          rx={12}
          fill={tokens.accentShade}
        />
        <Rect x={54} y={74} width={12} height={16} rx={4} fill={tokens.gold} />
        <Circle cx={60} cy={84} r={2.5} fill={tokens.goldShade} />
      </Svg>
    </View>
  );
}

function CarriedQuest({
  title,
  size,
  left,
  top,
  leaving,
}: {
  title: string;
  size: number;
  left: number;
  top: number;
  leaving: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const arrive = useEntrance({ duration: 420 });
  const bob = useLoop({ duration: 3200, reverse: true, rest: 0.5 });
  const lift = useSharedValue(0);

  useEffect(() => {
    lift.set(
      withTiming(leaving ? 1 : 0, {
        duration: leaving ? 520 : 200,
        easing: Easings.out,
      }),
    );
  }, [leaving, lift]);

  const style = useAnimatedStyle(() => {
    const drop = reducedMotion
      ? 0
      : interpolate(arrive.get(), [0, 1], [-28, 0]);
    const rise = reducedMotion ? 0 : interpolate(lift.get(), [0, 1], [0, -46]);
    return {
      opacity:
        interpolate(arrive.get(), [0, 0.4, 1], [0, 1, 1]) *
        interpolate(lift.get(), [0, 0.6, 1], [1, 0.8, 0]),
      transform: [
        { translateY: drop + rise + interpolate(bob.get(), [0, 1], [0, -3]) },
        {
          rotate: `${reducedMotion ? 0 : interpolate(lift.get(), [0, 1], [0, -14])}deg`,
        },
      ],
    };
  });

  return (
    <Animated.View style={[{ position: "absolute", left, top }, style]}>
      <ChoreIcon title={title} size={size} />
    </Animated.View>
  );
}

function EmptySlot({
  size,
  left,
  top,
  color,
}: {
  size: number;
  left: number;
  top: number;
  color: string;
}) {
  const breathe = useLoop({ duration: 2600, reverse: true, rest: 0.5 });
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(breathe.get(), [0, 1], [0.35, 0.85]),
    transform: [{ scale: interpolate(breathe.get(), [0, 1], [0.94, 1]) }],
  }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left,
          top,
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2.5,
          borderStyle: "dashed",
          borderColor: color,
        },
        style,
      ]}
    />
  );
}
