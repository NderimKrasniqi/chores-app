import type { ReactNode } from "react";
import { View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";

import { useTheme } from "@/design-system/theme";

import { Easings, useEntrance, useLoop } from "./motion";

const VIEW_W = 120;
const VIEW_H = 100;

/**
 * The child's money as a piggy bank, side on: a slow tail wiggle while it
 * waits, coins that drop into the slot when new ones arrived since the last
 * visit (the pig squashes as each lands), and a little rain cloud when the
 * balance is below zero. Calm by default — the Money tab is opened often.
 */
export function PiggyBank({
  size = 84,
  negative = false,
  drops = 0,
  dropKey = "0",
}: {
  size?: number;
  negative?: boolean;
  /** Coins to drop in (0–3). */
  drops?: number;
  /** Change it to replay the drops. */
  dropKey?: string;
}) {
  const { tokens } = useTheme();
  const scale = size / VIEW_W;
  const height = VIEW_H * scale;
  const wag = useLoop({ duration: 1600, reverse: true, rest: 0.5 });
  const coins = Math.max(0, Math.min(3, drops));

  const tailStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(wag.get(), [0, 1], [-14, 14])}deg` }],
  }));

  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={{ width: size, height: height + (negative ? 26 * scale : 0) }}
    >
      {negative ? (
        <RainCloud
          scale={scale}
          color={tokens.nightRaised}
          rain={tokens.info}
        />
      ) : null}

      <View style={{ position: "absolute", left: 0, bottom: 0 }}>
        <Squash key={dropKey} count={coins} scale={scale}>
          <View style={{ width: size, height }}>
            <Animated.View
              style={[
                {
                  position: "absolute",
                  left: 4 * scale,
                  top: 40 * scale,
                  width: 20 * scale,
                  height: 18 * scale,
                  transformOrigin: "right center",
                },
                tailStyle,
              ]}
            >
              <Svg width={20 * scale} height={18 * scale} viewBox="0 0 20 18">
                <Path
                  d="M19 10 C12 12, 6 12, 5 7 C4 3, 10 2, 11 6 C12 9, 8 11, 5 13"
                  fill="none"
                  stroke={tokens.pink}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              </Svg>
            </Animated.View>
            <Svg
              width={size}
              height={height}
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              style={{ position: "absolute" }}
            >
              <G opacity={negative ? 0.75 : 1}>
                <Rect
                  x={36}
                  y={76}
                  width={11}
                  height={16}
                  rx={5}
                  fill={tokens.pink}
                />
                <Rect
                  x={72}
                  y={76}
                  width={11}
                  height={16}
                  rx={5}
                  fill={tokens.pink}
                />
                <Ellipse cx={60} cy={58} rx={40} ry={30} fill={tokens.pink} />
                <Ellipse
                  cx={52}
                  cy={46}
                  rx={18}
                  ry={8}
                  fill={tokens.white}
                  opacity={0.2}
                />
                <Path d="M76 34 L84 16 L92 36 Z" fill={tokens.pink} />
                <Path
                  d="M80 32 L84 22 L88 34 Z"
                  fill={tokens.night}
                  opacity={0.18}
                />
                <Rect
                  x={46}
                  y={28}
                  width={24}
                  height={5}
                  rx={2.5}
                  fill={tokens.night}
                />
                <Ellipse cx={100} cy={60} rx={10} ry={11} fill={tokens.pink} />
                <Ellipse
                  cx={100}
                  cy={60}
                  rx={7}
                  ry={8}
                  fill={tokens.white}
                  opacity={0.3}
                />
                <Ellipse
                  cx={98}
                  cy={60}
                  rx={1.8}
                  ry={2.8}
                  fill={tokens.night}
                />
                <Ellipse
                  cx={103}
                  cy={60}
                  rx={1.8}
                  ry={2.8}
                  fill={tokens.night}
                />
                <Circle cx={84} cy={49} r={3.5} fill={tokens.night} />
                <Circle cx={85} cy={48} r={1.2} fill={tokens.white} />
                <Circle
                  cx={90}
                  cy={62}
                  r={4}
                  fill={tokens.white}
                  opacity={0.18}
                />
              </G>
            </Svg>
          </View>
        </Squash>
      </View>

      {Array.from({ length: coins }, (_, index) => (
        <DropCoin
          key={`${dropKey}-${index}`}
          index={index}
          scale={scale}
          color={tokens.gold}
          rim={tokens.goldShade}
          top={negative ? 26 * scale : 0}
        />
      ))}
    </View>
  );
}

const COIN_DELAY = 260;
const COIN_MS = 520;

/** The pig dips a little as each coin lands. */
function Squash({
  count,
  scale,
  children,
}: {
  count: number;
  scale: number;
  children: ReactNode;
}) {
  const total = count * COIN_DELAY + COIN_MS;
  const t = useEntrance({ duration: count > 0 ? total : 1, delay: 200 });
  const style = useAnimatedStyle(() => {
    if (count === 0) return {};
    // A dip right after each coin's arrival.
    let dip = 0;
    for (let i = 0; i < count; i += 1) {
      const land = (i * COIN_DELAY + COIN_MS * 0.9) / total;
      const d = Math.abs(t.get() - land);
      dip = Math.max(dip, Math.max(0, 1 - d * 18));
    }
    return {
      transform: [
        { translateY: dip * 2 * scale },
        { scaleY: 1 - dip * 0.06 },
        { scaleX: 1 + dip * 0.04 },
      ],
    };
  });
  return (
    <Animated.View style={[{ transformOrigin: "center bottom" }, style]}>
      {children}
    </Animated.View>
  );
}

function DropCoin({
  index,
  scale,
  color,
  rim,
  top,
}: {
  index: number;
  scale: number;
  color: string;
  rim: string;
  top: number;
}) {
  const t = useEntrance({ duration: COIN_MS, delay: 200 + index * COIN_DELAY });
  const coin = 14 * scale;
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.get(), [0, 0.1, 0.85, 1], [0, 1, 1, 0]),
    transform: [
      { translateY: interpolate(t.get(), [0, 1], [-18 * scale, 26 * scale]) },
      { scaleX: interpolate(t.get(), [0, 0.7, 1], [1, 1, 0.35]) },
    ],
  }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: 58 * scale - coin / 2,
          top,
          width: coin,
          height: coin,
          borderRadius: coin / 2,
          backgroundColor: color,
          borderWidth: Math.max(1.5, coin * 0.16),
          borderColor: rim,
        },
        style,
      ]}
    />
  );
}

/** A small cloud with slow drops — the balance is below zero for now. */
function RainCloud({
  scale,
  color,
  rain: rainColor,
}: {
  scale: number;
  color: string;
  rain: string;
}) {
  const drift = useLoop({ duration: 5000, reverse: true, rest: 0.5 });
  const rain = useLoop({ duration: 1200, easing: Easings.linear, rest: 0.4 });
  const cloudStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(drift.get(), [0, 1], [-3, 3]) * scale },
    ],
  }));
  const dropStyle = (offset: number) => {
    "worklet";
    const p = (rain.get() + offset) % 1;
    return {
      opacity: interpolate(p, [0, 0.2, 0.8, 1], [0, 0.9, 0.9, 0]),
      transform: [{ translateY: p * 12 * scale }],
    };
  };
  const a = useAnimatedStyle(() => dropStyle(0));
  const b = useAnimatedStyle(() => dropStyle(0.5));
  return (
    <Animated.View
      style={[{ position: "absolute", left: 30 * scale, top: 0 }, cloudStyle]}
    >
      <Svg width={56 * scale} height={24 * scale} viewBox="0 0 56 24">
        <Circle cx={16} cy={15} r={9} fill={color} />
        <Circle cx={28} cy={11} r={11} fill={color} />
        <Circle cx={41} cy={15} r={9} fill={color} />
        <Rect x={10} y={14} width={38} height={10} rx={5} fill={color} />
      </Svg>
      {[a, b].map((style, i) => (
        <Animated.View
          key={i}
          style={[
            {
              position: "absolute",
              left: (20 + i * 14) * scale,
              top: 22 * scale,
              width: 3 * scale,
              height: 6 * scale,
              borderRadius: 2 * scale,
              backgroundColor: rainColor,
            },
            style,
          ]}
        />
      ))}
    </Animated.View>
  );
}
