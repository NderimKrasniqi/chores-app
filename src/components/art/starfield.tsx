import { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
} from "react-native-reanimated";

import { useTheme } from "@/design-system/theme";

import { seeded, Easings, useLoop } from "./motion";

function TwinkleStar({
  x,
  y,
  size,
  color,
  delay,
  duration,
  sparkle,
}: {
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  sparkle: boolean;
}) {
  // Twinkling is gentle enough to keep under reduced motion — as a fade only.
  const reducedMotion = useReducedMotion();
  const progress = useLoop({
    duration,
    delay,
    reverse: true,
    rest: 0.7,
    essential: true,
  });
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 1], [0.2, 1]),
    transform: reducedMotion
      ? []
      : [
          { scale: interpolate(progress.get(), [0, 1], [0.6, 1.15]) },
          { rotate: sparkle ? `${progress.get() * 45}deg` : "0deg" },
        ],
  }));

  if (sparkle) {
    // Four-point sparkle made from two crossed bars.
    return (
      <Animated.View
        style={[
          {
            position: "absolute",
            left: x,
            top: y,
            width: size * 3,
            height: size * 3,
          },
          style,
        ]}
      >
        <View
          style={{
            position: "absolute",
            left: size * 1.25,
            top: 0,
            width: size * 0.5,
            height: size * 3,
            borderRadius: size,
            backgroundColor: color,
          }}
        />
        <View
          style={{
            position: "absolute",
            top: size * 1.25,
            left: 0,
            height: size * 0.5,
            width: size * 3,
            borderRadius: size,
            backgroundColor: color,
          }}
        />
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

function ShootingStar({ top, delay }: { top: number; delay: number }) {
  const { tokens } = useTheme();
  const progress = useLoop({ duration: 7000, delay, easing: Easings.linear });
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.get(),
      [0, 0.02, 0.12, 0.13, 1],
      [0, 1, 0, 0, 0],
    ),
    transform: [
      {
        translateX: interpolate(progress.get(), [0, 0.12, 1], [-60, 300, 300]),
      },
      { translateY: interpolate(progress.get(), [0, 0.12, 1], [0, 110, 110]) },
      { rotate: "20deg" },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: 0,
          top,
          flexDirection: "row",
          alignItems: "center",
        },
        style,
      ]}
    >
      <View
        style={{
          width: 44,
          height: 2.5,
          borderRadius: 2,
          backgroundColor: tokens.star,
          opacity: 0.6,
        }}
      />
      <View
        style={{
          width: 5,
          height: 5,
          borderRadius: 3,
          backgroundColor: tokens.star,
        }}
      />
    </Animated.View>
  );
}

/**
 * Ambient night sky: twinkling dots, a few sparkles, and an occasional
 * shooting star. Purely decorative and hidden from assistive technology.
 */
export const Starfield = memo(function Starfield({
  width = 400,
  height = 900,
  count = 18,
  seed = 7,
  shootingStar = true,
}: {
  width?: number;
  height?: number;
  count?: number;
  seed?: number;
  shootingStar?: boolean;
}) {
  const { tokens } = useTheme();
  const stars = useMemo(() => {
    const random = seeded(seed);
    const colors = [
      tokens.star,
      tokens.star,
      tokens.star,
      tokens.primary,
      tokens.pink,
      tokens.gold,
    ];
    return Array.from({ length: count }, (_, index) => ({
      key: index,
      x: random() * width,
      y: random() * height,
      size: 2 + random() * 2.2,
      color: colors[Math.floor(random() * colors.length)],
      delay: Math.round(random() * 2500),
      duration: 1800 + Math.round(random() * 1800),
      sparkle: index % 7 === 3,
    }));
  }, [count, height, seed, tokens, width]);

  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      {stars.map(({ key, ...star }) => (
        <TwinkleStar key={key} {...star} />
      ))}
      {shootingStar ? (
        <ShootingStar top={Math.min(80, height * 0.1)} delay={1200} />
      ) : null}
    </View>
  );
});
