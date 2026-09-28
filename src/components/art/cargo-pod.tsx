import type { ReactNode } from "react";
import { View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from "react-native-svg";

import { useTheme } from "@/design-system/theme";

import { Easings, useEntrance, useLoop } from "./motion";

const VIEW_W = 120;
const VIEW_H = 80;

/** Porthole centres along the pod. */
const PORTS = [34, 60, 86];
const PORT_R = 10;

/** How full the pod looks: one lit porthole per step, up to all three. */
function portsFilled(balance: number) {
  if (balance <= 0) return 0;
  if (balance < 60) return 1;
  if (balance < 200) return 2;
  return 3;
}

const COIN_DELAY = 260;
const COIN_MS = 560;

/**
 * The kid's money as a cargo pod that rides with their rocket: a glass
 * capsule whose portholes fill with stacked gold coins as the balance grows.
 * New coins (since the last visit) fly in through the hatch and the pod
 * nudges as each lands. Below zero the portholes go dark and a small
 * warning light blinks. Calm otherwise: a gentle hover, nothing more.
 */
export function CargoPod({
  size = 96,
  balance,
  drops = 0,
  dropKey = "0",
}: {
  size?: number;
  balance: number;
  /** Coins to fly in (0–3). */
  drops?: number;
  /** Change it to replay the drops. */
  dropKey?: string;
}) {
  const { tokens } = useTheme();
  const scale = size / VIEW_W;
  const height = VIEW_H * scale;
  const negative = balance < 0;
  const filled = portsFilled(balance);
  const coins = Math.max(0, Math.min(3, drops));
  const hover = useLoop({ duration: 3200, reverse: true, rest: 0.5 });

  const hoverStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(hover.get(), [0, 1], [-2, 2]) }],
  }));

  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={{ width: size, height: height + 14 * scale }}
    >
      <Animated.View style={[{ marginTop: 14 * scale }, hoverStyle]}>
        <Nudge key={dropKey} count={coins}>
          <Svg width={size} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
            <Defs>
              {PORTS.map((x, i) => (
                <ClipPath key={i} id={`port-${i}`}>
                  <Circle cx={x} cy={40} r={PORT_R} />
                </ClipPath>
              ))}
            </Defs>
            {/* tail fins */}
            <Path d="M14 28 L2 18 L6 40 Z" fill={tokens.pink} />
            <Path d="M14 52 L2 62 L6 40 Z" fill={tokens.pink} />
            {/* hull */}
            <Rect
              x={10}
              y={20}
              width={100}
              height={40}
              rx={20}
              fill={tokens.star}
              stroke={tokens.night}
              strokeWidth={3}
            />
            <Rect
              x={18}
              y={25}
              width={60}
              height={5}
              rx={2.5}
              fill={tokens.white}
              opacity={0.35}
            />
            {/* nose cap */}
            <Path
              d="M98 22 C114 26 114 54 98 58 Z"
              fill={tokens.accent}
              stroke={tokens.night}
              strokeWidth={3}
              strokeLinejoin="round"
            />
            {/* hatch on top where coins go in */}
            <Rect
              x={52}
              y={14}
              width={16}
              height={8}
              rx={3}
              fill={tokens.night}
            />
            {PORTS.map((x, i) => {
              const lit = !negative && i < filled;
              return (
                <G key={i}>
                  <Circle
                    cx={x}
                    cy={40}
                    r={PORT_R}
                    fill={lit ? tokens.nightRaised : tokens.night}
                    stroke={tokens.night}
                    strokeWidth={3}
                  />
                  {lit ? (
                    <G clipPath={`url(#port-${i})`}>
                      {/* a little stack of coins behind the glass */}
                      <Rect
                        x={x - 9}
                        y={42}
                        width={18}
                        height={4}
                        rx={2}
                        fill={tokens.gold}
                      />
                      <Rect
                        x={x - 8}
                        y={38}
                        width={16}
                        height={4}
                        rx={2}
                        fill={tokens.goldShade}
                      />
                      <Rect
                        x={x - 9}
                        y={34}
                        width={18}
                        height={4}
                        rx={2}
                        fill={tokens.gold}
                      />
                      <Rect
                        x={x - 9}
                        y={46}
                        width={18}
                        height={6}
                        rx={2}
                        fill={tokens.goldShade}
                      />
                    </G>
                  ) : null}
                  <Path
                    d={`M${x - 5} ${34} A7 7 0 0 1 ${x + 3} ${32}`}
                    stroke={tokens.white}
                    strokeWidth={2}
                    strokeLinecap="round"
                    opacity={0.5}
                    fill="none"
                  />
                </G>
              );
            })}
          </Svg>
          {negative ? <WarningLight scale={scale} color={tokens.pink} /> : null}
        </Nudge>
      </Animated.View>

      {Array.from({ length: coins }, (_, index) => (
        <FlyingCoin
          key={`${dropKey}-${index}`}
          index={index}
          scale={scale}
          color={tokens.gold}
          rim={tokens.goldShade}
        />
      ))}
    </View>
  );
}

/** The pod gives a small downward nudge as each coin lands. */
function Nudge({ count, children }: { count: number; children: ReactNode }) {
  const total = count * COIN_DELAY + COIN_MS;
  const t = useEntrance({ duration: count > 0 ? total : 1, delay: 200 });
  const style = useAnimatedStyle(() => {
    if (count === 0) return {};
    let dip = 0;
    for (let i = 0; i < count; i += 1) {
      const land = (i * COIN_DELAY + COIN_MS * 0.9) / total;
      dip = Math.max(dip, Math.max(0, 1 - Math.abs(t.get() - land) * 18));
    }
    return { transform: [{ translateY: dip * 3 }] };
  });
  return <Animated.View style={style}>{children}</Animated.View>;
}

/** A coin that arcs in from above and drops through the hatch. */
function FlyingCoin({
  index,
  scale,
  color,
  rim,
}: {
  index: number;
  scale: number;
  color: string;
  rim: string;
}) {
  const t = useEntrance({ duration: COIN_MS, delay: 200 + index * COIN_DELAY });
  const coin = 13 * scale;
  const style = useAnimatedStyle(() => {
    const p = t.get();
    return {
      opacity: interpolate(p, [0, 0.1, 0.85, 1], [0, 1, 1, 0]),
      transform: [
        { translateX: interpolate(p, [0, 1], [26 * scale, 0]) },
        {
          translateY: interpolate(
            p,
            [0, 0.4, 1],
            [-4 * scale, -10 * scale, 26 * scale],
          ),
        },
        { scaleX: interpolate(p, [0, 0.75, 1], [1, 1, 0.3]) },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: 60 * scale - coin / 2,
          top: 0,
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

/** Below zero: a small blinking light on the nose, nothing dramatic. */
function WarningLight({ scale, color }: { scale: number; color: string }) {
  const blink = useLoop({
    duration: 1200,
    reverse: true,
    rest: 1,
    easing: Easings.inOut,
  });
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(blink.get(), [0, 1], [0.3, 1]),
  }));
  const dot = 9 * scale;
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: 104 * scale - dot / 2,
          top: 36 * scale,
          width: dot,
          height: dot,
          borderRadius: dot / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}
