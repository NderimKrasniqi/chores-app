import { View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  G,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

import { useTheme } from "@/design-system/theme";

import { Easings, useLoop } from "./motion";

const WOOD = "#C9772B";
const WOOD_LIGHT = "#E08A36";

function Glow({ size, color }: { size: number; color: string }) {
  const progress = useLoop({ duration: 2400, reverse: true, rest: 0.6 });
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 1], [0.45, 1]),
    transform: [{ scale: interpolate(progress.get(), [0, 1], [0.85, 1.15]) }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: "absolute", width: size, height: size, left: 0, top: 0 },
        style,
      ]}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="chestGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={0.6} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2}
          fill="url(#chestGlow)"
        />
      </Svg>
    </Animated.View>
  );
}

function Rays({ size, color }: { size: number; color: string }) {
  const progress = useLoop({ duration: 18000, easing: Easings.linear });
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.get() * 360}deg` }],
  }));
  const c = size / 2;
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", left: 0, top: 0, opacity: 0.35 }, style]}
    >
      <Svg width={size} height={size}>
        {Array.from({ length: 8 }, (_, i) => (
          <Path
            key={i}
            d={`M${c} ${c}L${c - size * 0.06} 0h${size * 0.12}z`}
            fill={color}
            transform={`rotate(${i * 45} ${c} ${c})`}
          />
        ))}
      </Svg>
    </Animated.View>
  );
}

function PoppingCoin({
  delay,
  dx,
  dy,
  size,
  color,
  stroke,
}: {
  delay: number;
  dx: number;
  dy: number;
  size: number;
  color: string;
  stroke: string;
}) {
  const progress = useLoop({
    duration: 2600,
    delay,
    easing: Easings.out,
    rest: 0.7,
  });
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 0.2, 0.7, 1], [0, 1, 1, 0]),
    transform: [
      {
        translateX: interpolate(
          progress.get(),
          [0, 0.7, 1],
          [0, dx, dx * 1.15],
        ),
      },
      {
        translateY: interpolate(
          progress.get(),
          [0, 0.7, 1],
          [20, dy, dy * 0.7],
        ),
      },
      { scale: interpolate(progress.get(), [0, 0.3, 1], [0.7, 1, 1]) },
    ],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          borderWidth: 2.5,
          borderColor: stroke,
        },
        style,
      ]}
    />
  );
}

/**
 * The Extras treasure chest. Locked: glowing with a jiggling padlock.
 * Open: lid up, rays spinning, coins popping out. Decorative.
 */
export function TreasureChest({
  size = 120,
  state,
  quiet = false,
}: {
  size?: number;
  state: "locked" | "open";
  /** Open but calm: no rays or popping coins (the chest has been seen). */
  quiet?: boolean;
}) {
  const { tokens } = useTheme();
  const jiggle = useLoop({ duration: 2800, easing: Easings.linear });
  const lid = useLoop({ duration: 2600, reverse: true });

  const lockStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(jiggle.get(), [0, 0.7, 0.75, 0.82, 0.89, 1], [0, 0, -14, 12, -6, 0])}deg`,
      },
    ],
  }));
  const lidStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(lid.get(), [0, 1], [-24, -30])}deg` }],
  }));

  const s = size / 170; // artwork drawn on a 170 × 170 grid
  const coin = size * 0.1;
  const coinOriginLeft = size / 2 - coin / 2;
  const coinOriginTop = size * 0.6;

  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={{ width: size, height: size }}
    >
      {state === "open" && !quiet ? (
        <Rays size={size} color={tokens.gold} />
      ) : null}
      <Glow size={size} color={tokens.gold} />

      {state === "open" && !quiet ? (
        <View
          style={{
            position: "absolute",
            left: coinOriginLeft,
            top: coinOriginTop,
          }}
        >
          <PoppingCoin
            delay={0}
            dx={-size * 0.22}
            dy={-size * 0.3}
            size={coin}
            color={tokens.gold}
            stroke={tokens.night}
          />
          <PoppingCoin
            delay={500}
            dx={size * 0.04}
            dy={-size * 0.4}
            size={coin * 1.1}
            color={tokens.gold}
            stroke={tokens.night}
          />
          <PoppingCoin
            delay={1000}
            dx={size * 0.24}
            dy={-size * 0.28}
            size={coin * 0.9}
            color={tokens.gold}
            stroke={tokens.night}
          />
        </View>
      ) : null}

      <Svg
        width={size}
        height={size}
        viewBox="0 0 170 170"
        style={{ position: "absolute" }}
      >
        <Path
          d="M40 100h90v44a8 8 0 0 1-8 8H48a8 8 0 0 1-8-8z"
          fill={WOOD}
          stroke={tokens.night}
          strokeWidth={4}
        />
        <Path d="M60 100v52M110 100v52" stroke={tokens.gold} strokeWidth={7} />
        <Path d="M40 100h90" stroke={tokens.night} strokeWidth={4} />
        {state === "locked" ? (
          <G>
            <Path
              d="M40 100c0-20 14-32 45-32s45 12 45 32z"
              fill={WOOD_LIGHT}
              stroke={tokens.night}
              strokeWidth={4}
            />
            <Path
              d="M60 100V72M110 100V72"
              stroke={tokens.gold}
              strokeWidth={7}
            />
          </G>
        ) : (
          <Rect
            x={75}
            y={106}
            width={20}
            height={16}
            rx={3}
            fill={tokens.gold}
            stroke={tokens.night}
            strokeWidth={3}
          />
        )}
      </Svg>

      {state === "open" ? (
        <Animated.View
          style={[
            {
              position: "absolute",
              left: 40 * s,
              top: 64 * s,
              width: 90 * s,
              height: 38 * s,
              transformOrigin: "left bottom",
            },
            lidStyle,
          ]}
        >
          <Svg width={90 * s} height={38 * s} viewBox="0 0 90 38">
            <Path
              d="M0 36c0-20 14-32 45-32s45 12 45 32z"
              fill={WOOD_LIGHT}
              stroke={tokens.night}
              strokeWidth={4}
            />
            <Path d="M20 36V10M70 36V10" stroke={tokens.gold} strokeWidth={7} />
          </Svg>
        </Animated.View>
      ) : (
        <Animated.View
          style={[
            {
              position: "absolute",
              left: 69 * s,
              top: 80 * s,
              width: 32 * s,
              height: 40 * s,
              transformOrigin: "center top",
            },
            lockStyle,
          ]}
        >
          <Svg width={32 * s} height={40 * s} viewBox="0 0 32 40">
            <Path
              d="M9 18v-6a7 7 0 0 1 14 0v6"
              fill="none"
              stroke={tokens.night}
              strokeWidth={4}
            />
            <Rect
              x={3}
              y={16}
              width={26}
              height={22}
              rx={5}
              fill={tokens.gold}
              stroke={tokens.night}
              strokeWidth={3.5}
            />
            <Circle cx={16} cy={26} r={3} fill={tokens.night} />
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}
