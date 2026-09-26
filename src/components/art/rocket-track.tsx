import { useState } from "react";
import { View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { AppText } from "@/design-system/text";
import { useTheme } from "@/design-system/theme";

import { useEntrance, useLoop } from "./motion";

const ROCKET = 34;
const PLANET = 30;

function Rocket({ size }: { size: number }) {
  const { tokens } = useTheme();
  // A slow, soft flicker: this card is seen many times a day.
  const flicker = useLoop({ duration: 700, reverse: true, rest: 0.5 });
  const flame = useAnimatedStyle(() => ({
    opacity: interpolate(flicker.get(), [0, 1], [0.75, 1]),
    transform: [{ scaleX: interpolate(flicker.get(), [0, 1], [0.9, 1.05]) }],
  }));
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        style={[
          {
            position: "absolute",
            left: -size * 0.28,
            top: size * 0.36,
            width: size * 0.4,
            height: size * 0.28,
            transformOrigin: "right center",
          },
          flame,
        ]}
      >
        <Svg width="100%" height="100%" viewBox="0 0 20 14">
          <Path d="M20 0 Q4 7 20 14 Z" fill={tokens.accent} />
          <Path d="M20 3 Q10 7 20 11 Z" fill={tokens.gold} />
        </Svg>
      </Animated.View>
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Path d="M10 12 L2 6 L6 16 Z" fill={tokens.pink} />
        <Path d="M10 28 L2 34 L6 24 Z" fill={tokens.pink} />
        <Path d="M6 14 H24 Q36 14 39 20 Q36 26 24 26 H6 Z" fill={tokens.star} />
        <Circle cx={24} cy={20} r={4} fill={tokens.info} />
        <Rect x={6} y={14} width={4} height={12} fill={tokens.pink} />
      </Svg>
    </View>
  );
}

/**
 * The payout week as a flight: stops for each day, a trail behind the rocket
 * for time already flown, and payday as the planet at the end.
 */
export function RocketTrack({
  progress,
  dayLabels,
  todayIndex,
}: {
  /** 0 = week start, 1 = payday. */
  progress: number;
  dayLabels: string[];
  todayIndex: number;
}) {
  const { tokens } = useTheme();
  const [width, setWidth] = useState(0);
  // Replays on every visit to Money, so it stays inside the UI budget.
  const arrive = useEntrance({ duration: 300 });
  const clamped = Math.min(1, Math.max(0, progress));
  // The last stop sits under the payday planet's centre.
  const track = Math.max(0, width - PLANET / 2);
  const stops = Math.max(2, dayLabels.length);

  // Keep the rocket (and its flame) inside the card at the start of the week.
  const minX = ROCKET * 0.3;
  const targetX = Math.max(minX, clamped * track - ROCKET / 2);
  const rocketStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(arrive.get(), [0, 1], [minX, targetX]),
      },
    ],
  }));
  const trailStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: interpolate(arrive.get(), [0, 1], [0, clamped]) }],
  }));

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      <View style={{ height: ROCKET + 6 }} className="justify-center">
        <View
          className="absolute left-0 h-0 border-t-2 border-dashed border-nightRaised"
          style={{ right: PLANET / 2 }}
        />
        {width > 0 ? (
          <>
            <Animated.View
              className="absolute left-0 h-[4px] rounded-full bg-accent"
              style={[
                { width: track, transformOrigin: "left center" },
                trailStyle,
              ]}
            />
            {dayLabels.map((label, i) => (
              <View
                key={`${label}-${i}`}
                className={`absolute h-3 w-3 rounded-full ${i <= todayIndex ? "bg-accent" : "bg-nightRaised"}`}
                style={{ left: (i / (stops - 1)) * track - 6 }}
              />
            ))}
            <View
              className="absolute items-center justify-center rounded-full border-b-4 border-goldShade bg-gold"
              style={{ right: 0, width: PLANET, height: PLANET }}
            >
              <View
                className="absolute h-3 w-0.5 bg-night"
                style={{ top: -9, left: PLANET / 2 }}
              />
              <View
                className="absolute h-2 w-2.5 rounded-sm"
                style={{
                  top: -10,
                  left: PLANET / 2 + 2,
                  backgroundColor: tokens.pink,
                }}
              />
            </View>
            <Animated.View
              className="absolute"
              style={[{ left: 0, top: 3 }, rocketStyle]}
            >
              <Rocket size={ROCKET} />
            </Animated.View>
          </>
        ) : null}
      </View>
      {width > 0 ? (
        <View style={{ height: 18 }} className="mt-1.5">
          {dayLabels.map((label, i) => (
            <AppText
              key={`${label}-${i}`}
              variant="caption"
              color={i === todayIndex ? "ink" : "ink-muted"}
              className={`absolute w-8 text-center ${i === todayIndex ? "font-body-heavy" : ""}`}
              style={{ left: (i / (stops - 1)) * track - 16 }}
            >
              {label}
            </AppText>
          ))}
        </View>
      ) : null}
    </View>
  );
}
