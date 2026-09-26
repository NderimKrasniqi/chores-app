import { View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

import { useTheme } from "@/design-system/theme";

import { Easings, useLoop } from "./motion";

export type BuddyMood = "idle" | "hop" | "dance" | "wave" | "sleepy";

const STAR =
  "M45 5l11 23 25 3.2-18.5 17 5 25L45 60.5 22.5 73.2l5-25L9 31.2l25-3.2z";

/**
 * The Quest Path mascot: a friendly star that blinks and reacts. Decorative.
 */
export function StarBuddy({
  size = 64,
  mood = "idle",
}: {
  size?: number;
  mood?: BuddyMood;
}) {
  const { tokens } = useTheme();
  const scale = size / 90;

  const blink = useLoop({ duration: 3600, easing: Easings.linear });
  const motion = useLoop({
    // Hops come in short bursts with a rest between, so an always-visible
    // buddy on Home reads as alive rather than busy.
    duration: mood === "dance" ? 1400 : mood === "hop" ? 2600 : 4000,
    reverse: mood === "idle" || mood === "sleepy",
    easing: mood === "idle" || mood === "sleepy" ? undefined : Easings.linear,
  });

  const bodyStyle = useAnimatedStyle(() => {
    const p = motion.get();
    switch (mood) {
      case "hop":
        return {
          transform: [
            {
              translateY: interpolate(
                p,
                [0, 0.06, 0.2, 0.34, 1],
                [0, 0, -size * 0.22, 0, 0],
              ),
            },
            {
              scaleY: interpolate(
                p,
                [0, 0.06, 0.2, 0.34, 1],
                [1, 0.88, 1.04, 1, 1],
              ),
            },
          ],
        };
      case "dance":
        return {
          transform: [
            {
              translateY: interpolate(
                p,
                [0, 0.25, 0.5, 0.75, 1],
                [0, -size * 0.24, 0, -size * 0.15, 0],
              ),
            },
            {
              rotate: `${interpolate(p, [0, 0.25, 0.5, 0.75, 1], [-8, 6, 8, -4, -8])}deg`,
            },
          ],
        };
      case "wave":
        return {
          transform: [
            { translateY: interpolate(p, [0, 0.5, 1], [0, -size * 0.12, 0]) },
            { rotate: `${interpolate(p, [0, 0.5, 1], [-4, 4, -4])}deg` },
          ],
        };
      default:
        return {
          transform: [
            { translateY: interpolate(p, [0, 1], [0, -size * 0.06]) },
          ],
        };
    }
  });

  const eyeStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scaleY:
          mood === "sleepy"
            ? 0.25
            : interpolate(
                blink.get(),
                [0, 0.9, 0.93, 0.96, 1],
                [1, 1, 0.1, 1, 1],
              ),
      },
    ],
  }));

  const eye = {
    width: 7 * scale,
    height: 9 * scale,
    borderRadius: 4 * scale,
    backgroundColor: tokens.night,
  } as const;

  return (
    <Animated.View
      pointerEvents="none"
      accessible={false}
      style={[{ width: size, height: size }, bodyStyle]}
    >
      <Svg width={size} height={size} viewBox="0 0 90 90">
        <Path
          d={STAR}
          fill={tokens.gold}
          stroke={tokens.night}
          strokeWidth={4}
          strokeLinejoin="round"
        />
        <Circle cx={30} cy={48} r={3.5} fill={tokens.pink} />
        <Circle cx={60} cy={48} r={3.5} fill={tokens.pink} />
        {mood === "dance" ? (
          <Path
            d="M36 50c4 7 14 7 18 0z"
            fill={tokens.night}
            stroke={tokens.night}
            strokeWidth={3}
            strokeLinejoin="round"
          />
        ) : (
          <Path
            d="M38 51c4 4 10 4 14 0"
            fill="none"
            stroke={tokens.night}
            strokeWidth={3.5}
            strokeLinecap="round"
          />
        )}
      </Svg>
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 35 * scale,
            left: 33 * scale,
            width: 24 * scale,
            flexDirection: "row",
            justifyContent: "space-between",
          },
          eyeStyle,
        ]}
      >
        <View style={eye} />
        <View style={eye} />
      </Animated.View>
    </Animated.View>
  );
}
