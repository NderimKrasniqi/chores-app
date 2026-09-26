import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";

import { useTheme } from "@/design-system/theme";

import { Easings, seeded, useEntrance, useLoop } from "./motion";

/** Slowly turning rays behind a hero — the "spotlight" of a win. */
export function Sunburst({ size = 260 }: { size?: number }) {
  const { tokens } = useTheme();
  const spin = useLoop({ duration: 16000, easing: Easings.linear });
  const glow = useLoop({ duration: 2200, reverse: true, rest: 0.6 });
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.get() * 360}deg` }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.get(), [0, 1], [0.35, 0.7]),
  }));
  const c = size / 2;
  const rays = 12;

  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={{ position: "absolute", width: size, height: size }}
    >
      <Animated.View style={[StyleSheet.absoluteFill, glowStyle, spinStyle]}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="ray" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={tokens.gold} stopOpacity={0} />
              <Stop offset="1" stopColor={tokens.gold} stopOpacity={0.9} />
            </LinearGradient>
          </Defs>
          {Array.from({ length: rays }, (_, i) => (
            <Path
              key={i}
              d={`M${c} ${c}L${c - size * 0.07} 0h${size * 0.14}z`}
              fill="url(#ray)"
              transform={`rotate(${(i * 360) / rays} ${c} ${c})`}
            />
          ))}
        </Svg>
      </Animated.View>
    </View>
  );
}

type Burst = {
  x: number;
  y: number;
  radius: number;
  color: string;
  delay: number;
};

/** One firework: sparks fly out from a point, stretch, and fade. */
function FireworkBurst({ x, y, radius, color, delay }: Burst) {
  const progress = useEntrance({ duration: 900, delay });
  const size = radius * 2.6;
  const sparks = 10;
  const style = useAnimatedStyle(() => {
    const t = progress.get();
    return {
      opacity: interpolate(t, [0, 0.15, 0.7, 1], [0, 1, 1, 0]),
      transform: [{ scale: interpolate(t, [0, 1], [0.3, 1]) }],
    };
  });
  const c = size / 2;
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: x - c,
          top: y - c,
          width: size,
          height: size,
        },
        style,
      ]}
    >
      <Svg width={size} height={size}>
        {Array.from({ length: sparks }, (_, i) => {
          const a = (i / sparks) * Math.PI * 2;
          const inner = radius * 0.45;
          return (
            <Line
              key={i}
              x1={c + Math.cos(a) * inner}
              y1={c + Math.sin(a) * inner}
              x2={c + Math.cos(a) * radius}
              y2={c + Math.sin(a) * radius}
              stroke={color}
              strokeWidth={3}
              strokeLinecap="round"
            />
          );
        })}
        <Circle cx={c} cy={c} r={3.5} fill={color} />
      </Svg>
    </Animated.View>
  );
}

/**
 * A short fireworks show for rare wins: a few bursts popping around the hero,
 * staggered so it reads as a moment rather than a flash. Gone under reduced
 * motion — pure movement explains nothing.
 */
export function Fireworks({
  width,
  height,
  seed = 5,
  count = 5,
}: {
  width: number;
  height: number;
  seed?: number;
  count?: number;
}) {
  const { tokens } = useTheme();
  const reducedMotion = useReducedMotion();
  const bursts = useMemo<Burst[]>(() => {
    const random = seeded(seed);
    const colors = [tokens.gold, tokens.pink, tokens.primary, tokens.accent];
    return Array.from({ length: count }, (_, i) => ({
      x: width * (0.12 + random() * 0.76),
      y: height * (0.08 + random() * 0.4),
      radius: 26 + random() * 22,
      color: colors[i % colors.length],
      delay: 150 + i * 260 + Math.round(random() * 120),
    }));
  }, [count, height, seed, tokens, width]);

  if (reducedMotion) return null;

  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      {bursts.map((burst, i) => (
        <FireworkBurst key={i} {...burst} />
      ))}
      <ShootingStar width={width} top={height * 0.18} />
    </View>
  );
}

/** A single shooting star streaking across once, trailing light. */
function ShootingStar({ width, top }: { width: number; top: number }) {
  const { tokens } = useTheme();
  const progress = useEntrance({ duration: 1100, delay: 900 });
  const length = 90;
  const style = useAnimatedStyle(() => {
    const t = progress.get();
    return {
      opacity: interpolate(t, [0, 0.1, 0.8, 1], [0, 1, 1, 0]),
      transform: [
        { translateX: interpolate(t, [0, 1], [-length, width + length]) },
        { translateY: interpolate(t, [0, 1], [0, 90]) },
        { rotate: "18deg" },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: "absolute", left: 0, top }, style]}>
      <Svg width={length} height={12}>
        <Defs>
          <LinearGradient id="trail" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={tokens.star} stopOpacity={0} />
            <Stop offset="1" stopColor={tokens.star} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Path
          d={`M0 6 L${length - 8} 3 L${length - 8} 9 Z`}
          fill="url(#trail)"
        />
        <Circle cx={length - 6} cy={6} r={5} fill={tokens.star} />
      </Svg>
    </Animated.View>
  );
}
