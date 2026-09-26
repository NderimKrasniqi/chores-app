import { View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { useTheme } from "@/design-system/theme";

import { Easings, useLoop } from "./motion";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * "This locks right away": a padlock whose shackle drops shut with a small
 * clunk inside a draining ring. Explains commitment — decorative otherwise.
 */
export function LockClunk({ size = 150 }: { size?: number }) {
  const { tokens } = useTheme();
  const cycle = useLoop({ duration: 3000, easing: Easings.linear, rest: 0.6 });
  const ring = useLoop({ duration: 8000, easing: Easings.linear, rest: 0.4 });
  const r = 64;
  const circumference = 2 * Math.PI * r;

  const shackleStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          cycle.get(),
          [0, 0.3, 0.42, 0.85, 1],
          [-12, -12, 0, 0, -12],
        ),
      },
    ],
  }));
  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(cycle.get(), [0, 0.4, 0.46, 0.52, 0.58, 1], [0, 0, -6, 5, 0, 0])}deg`,
      },
    ],
  }));
  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: ring.get() * circumference,
  }));

  const s = size / 150;

  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} viewBox="0 0 150 150">
        <Circle
          cx={75}
          cy={75}
          r={r}
          fill="none"
          stroke={tokens.nightRaised}
          strokeWidth={8}
        />
        <AnimatedCircle
          cx={75}
          cy={75}
          r={r}
          fill="none"
          stroke={tokens.accent}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          transform="rotate(-90 75 75)"
          animatedProps={ringProps}
        />
      </Svg>
      <Animated.View
        style={[
          {
            position: "absolute",
            left: 48 * s,
            top: 34 * s,
            width: 54 * s,
            height: 80 * s,
            transformOrigin: "center bottom",
          },
          bodyStyle,
        ]}
      >
        <Animated.View
          style={[{ position: "absolute", top: 0, left: 0 }, shackleStyle]}
        >
          <Svg width={54 * s} height={44 * s} viewBox="0 0 54 44">
            <Path
              d="M10 44V24a17 17 0 0 1 34 0v20"
              fill="none"
              stroke={tokens.star}
              strokeWidth={9}
              strokeLinecap="round"
            />
          </Svg>
        </Animated.View>
        <Svg
          width={54 * s}
          height={46 * s}
          viewBox="0 0 54 46"
          style={{ position: "absolute", top: 34 * s }}
        >
          <Rect
            x={2}
            y={2}
            width={50}
            height={42}
            rx={10}
            fill={tokens.gold}
            stroke={tokens.night}
            strokeWidth={4}
          />
          <Circle cx={27} cy={20} r={5} fill={tokens.night} />
          <Path
            d="M27 22v10"
            stroke={tokens.night}
            strokeWidth={4}
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}
