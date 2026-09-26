import { useMemo, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
} from "react-native-reanimated";

import { useTheme } from "@/design-system/theme";

import { seeded, useEntrance, Easings, useLoop } from "./motion";

/** A gold coin that flips on its vertical axis. */
export function SpinningCoin({
  size = 20,
  duration = 1000,
}: {
  size?: number;
  duration?: number;
}) {
  const { tokens } = useTheme();
  const progress = useLoop({ duration, easing: Easings.linear, rest: 0 });
  const style = useAnimatedStyle(() => ({
    transform: [
      { scaleX: interpolate(progress.get(), [0, 0.5, 1], [1, 0.12, 1]) },
    ],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: tokens.gold,
          borderWidth: Math.max(2, size * 0.12),
          borderColor: tokens.goldShade,
        },
        style,
      ]}
    />
  );
}

/** Expanding rings that draw the eye to the next thing to do. */
export function PulseRings({
  size,
  color,
  children,
  duration = 1800,
}: {
  size: number;
  color?: string;
  children?: ReactNode;
  duration?: number;
}) {
  const { tokens } = useTheme();
  const ringColor = color ?? tokens.accent;
  const a = useLoop({ duration, easing: Easings.out });
  const b = useLoop({ duration, delay: duration / 2, easing: Easings.out });
  const ringA = useAnimatedStyle(() => ({
    opacity: interpolate(a.get(), [0, 1], [0.7, 0]),
    transform: [{ scale: interpolate(a.get(), [0, 1], [1, 1.9]) }],
  }));
  const ringB = useAnimatedStyle(() => ({
    opacity: interpolate(b.get(), [0, 1], [0.7, 0]),
    transform: [{ scale: interpolate(b.get(), [0, 1], [1, 1.9]) }],
  }));
  const ring = {
    position: "absolute" as const,
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 4,
    borderColor: ringColor,
  };
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View pointerEvents="none" style={[ring, ringA]} />
      <Animated.View pointerEvents="none" style={[ring, ringB]} />
      {children}
    </View>
  );
}

/** Gentle vertical float for any decoration. */
export function Floating({
  children,
  distance = 6,
  duration = 4000,
  delay = 0,
}: {
  children: ReactNode;
  distance?: number;
  duration?: number;
  delay?: number;
}) {
  const progress = useLoop({ duration, delay, reverse: true });
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.get(), [0, 1], [0, -distance]) },
    ],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/**
 * Celebration entrance for rare moments (approval amounts, badges): fades in
 * from 0.9 scale — never from nothing — and settles with a small spring.
 */
export function PopIn({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const progress = useEntrance({ delay, playful: true });
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 0.5, 1], [0, 1, 1]),
    transform: [{ scale: interpolate(progress.get(), [0, 1], [0.9, 1]) }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

function ConfettiPiece({
  x,
  width,
  height,
  color,
  round,
  delay,
  duration,
  fall,
}: {
  x: number;
  width: number;
  height: number;
  color: string;
  round: boolean;
  delay: number;
  duration: number;
  fall: number;
}) {
  const progress = useLoop({
    duration,
    delay,
    easing: Easings.linear,
    rest: 0.3,
  });
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.get(), [0, 1], [-80, fall]) },
      { translateX: Math.sin(progress.get() * Math.PI * 6) * 14 },
      { rotate: `${progress.get() * 720}deg` },
    ],
  }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: 0,
          left: x,
          width,
          height: round ? width : height,
          borderRadius: round ? width / 2 : 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

/** Falling confetti for approvals and celebrations. */
export function Confetti({
  width = 390,
  height = 844,
  count = 16,
  seed = 11,
}: {
  width?: number;
  height?: number;
  count?: number;
  seed?: number;
}) {
  const { tokens } = useTheme();
  const reducedMotion = useReducedMotion();
  const pieces = useMemo(() => {
    const random = seeded(seed);
    const colors = [tokens.primary, tokens.pink, tokens.accent, tokens.gold];
    return Array.from({ length: count }, (_, index) => ({
      key: index,
      x: (index / count) * width + random() * 18,
      width: 8 + random() * 5,
      height: 14 + random() * 6,
      color: colors[index % colors.length],
      round: random() > 0.6,
      delay: Math.round(random() * 3000),
      duration: 3400 + Math.round(random() * 1600),
      fall: height + 80,
    }));
  }, [count, height, seed, tokens, width]);

  // Confetti is pure movement: under reduced motion it simply isn't there.
  if (reducedMotion) return null;

  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      {pieces.map(({ key, ...piece }) => (
        <ConfettiPiece key={key} {...piece} />
      ))}
    </View>
  );
}

/** The Child's balance as a glowing planet with orbiting coins. */
export function BalanceOrb({
  size = 96,
  children,
  orbit = true,
}: {
  size?: number;
  children: ReactNode;
  orbit?: boolean;
}) {
  const { tokens } = useTheme();
  const spin = useLoop({ duration: 16000, easing: Easings.linear });
  const bob = useLoop({ duration: 5000, reverse: true });
  const orbitSize = size * 1.22;
  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.get() * 360}deg` }],
  }));
  const bobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(bob.get(), [0, 1], [0, -2]) }],
  }));

  return (
    <View
      style={{
        width: orbitSize,
        height: orbitSize,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {orbit ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              width: orbitSize,
              height: orbitSize,
              borderRadius: orbitSize / 2,
              borderWidth: 2,
              borderStyle: "dashed",
              borderColor: tokens.nightRaised,
            },
            orbitStyle,
          ]}
        >
          <View
            style={{ position: "absolute", left: orbitSize / 2 - 10, top: -10 }}
          >
            <SpinningCoin size={20} duration={2400} />
          </View>
          <View
            style={{
              position: "absolute",
              left: orbitSize / 2 - 7,
              bottom: -7,
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: tokens.pink,
            }}
          />
        </Animated.View>
      ) : null}
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: tokens.primary,
            borderBottomWidth: Math.round(size * 0.07),
            borderBottomColor: tokens.primaryShade,
            alignItems: "center",
            justifyContent: "center",
          },
          bobStyle,
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
}
