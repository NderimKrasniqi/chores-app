import { useState } from "react";
import { View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, G, Line, Path } from "react-native-svg";

import { useTheme } from "@/design-system/theme";

import { CargoPod } from "./cargo-pod";
import { HomePlanet } from "./home-planet";
import { useLoop } from "./motion";

const HEIGHT = 104;
const HOME = 56;
const PAYDAY = 36;
const POD = 46;
const ROCKET = 28;

type Point = { x: number; y: number };

/** A point on the flight arc (quadratic curve), t = 0 … 1. */
function arcAt(
  a: Point,
  c: Point,
  b: Point,
  t: number,
): Point & { angle: number } {
  const u = 1 - t;
  const x = u * u * a.x + 2 * u * t * c.x + t * t * b.x;
  const y = u * u * a.y + 2 * u * t * c.y + t * t * b.y;
  const dx = 2 * u * (c.x - a.x) + 2 * t * (b.x - c.x);
  const dy = 2 * u * (c.y - a.y) + 2 * t * (b.y - c.y);
  return { x, y, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
}

/**
 * The pay week as one flight: your home planet (your money) on the left,
 * payday's gold planet on the right, and the rocket on the arc between them
 * at today's spot, towing the cargo pod with this week's coins. Coins that
 * arrived since the last visit drop into the pod; the rocket only bobs.
 */
export function PaydayFlight({
  balance,
  weekProgress,
  drops = 0,
  dropKey,
}: {
  balance: number;
  /** 0 = just after the last payday … 1 = payday. */
  weekProgress: number;
  drops?: number;
  dropKey?: string;
}) {
  const { tokens } = useTheme();
  const [width, setWidth] = useState(0);
  const bob = useLoop({ duration: 2600, reverse: true, rest: 0.5 });
  const bobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(bob.get(), [0, 1], [-2, 2]) }],
  }));

  const progress = Math.max(0, Math.min(1, weekProgress));
  const a = { x: HOME * 0.62, y: HEIGHT - HOME * 0.62 };
  const b = { x: width - PAYDAY * 0.7, y: HEIGHT - PAYDAY * 0.9 };
  const c = { x: width / 2, y: -HEIGHT * 0.3 };
  const rocket = arcAt(a, c, b, 0.08 + progress * 0.84);
  const pod = arcAt(a, c, b, Math.max(0.02, 0.08 + progress * 0.84 - 0.2));

  // The flown part of the arc, as a sampled path.
  const flown: string[] = [];
  const steps = 24;
  for (let i = 0; i <= steps; i += 1) {
    const p = arcAt(a, c, b, (i / steps) * (0.08 + progress * 0.84));
    flown.push(`${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
  }

  return (
    <View
      style={{ height: HEIGHT }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      pointerEvents="none"
      accessible={false}
    >
      {width > 0 ? (
        <>
          <Svg width={width} height={HEIGHT} style={{ position: "absolute" }}>
            <Path
              d={`M${a.x} ${a.y} Q${c.x} ${c.y} ${b.x} ${b.y}`}
              stroke={tokens.nightRaised}
              strokeWidth={3}
              strokeDasharray="2 9"
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d={flown.join(" ")}
              stroke={tokens.gold}
              strokeWidth={3}
              strokeLinecap="round"
              fill="none"
              opacity={0.85}
            />
            {/* tow line from rocket to pod */}
            <Line
              x1={pod.x}
              y1={pod.y}
              x2={rocket.x}
              y2={rocket.y}
              stroke={tokens.inkMuted}
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
            {/* payday: the gold planet with a flag */}
            <G>
              <Circle
                cx={b.x}
                cy={b.y}
                r={PAYDAY / 2 + 6}
                fill={tokens.gold}
                opacity={0.15}
              />
              <Circle cx={b.x} cy={b.y} r={PAYDAY / 2} fill={tokens.gold} />
              <Path
                d={`M${b.x} ${b.y + PAYDAY / 2} A${PAYDAY / 2} ${PAYDAY / 2} 0 0 0 ${b.x} ${b.y - PAYDAY / 2} A${PAYDAY * 0.28} ${PAYDAY / 2} 0 0 1 ${b.x} ${b.y + PAYDAY / 2} Z`}
                fill={tokens.goldShade}
                opacity={0.6}
                transform={`rotate(35 ${b.x} ${b.y})`}
              />
              <Ellipse
                cx={b.x}
                cy={b.y}
                rx={PAYDAY * 0.72}
                ry={PAYDAY * 0.16}
                stroke={tokens.goldShade}
                strokeWidth={2.5}
                fill="none"
                transform={`rotate(-14 ${b.x} ${b.y})`}
              />
              <Line
                x1={b.x}
                y1={b.y - PAYDAY / 2}
                x2={b.x}
                y2={b.y - PAYDAY / 2 - 14}
                stroke={tokens.star}
                strokeWidth={2}
                strokeLinecap="round"
              />
              <Path
                d={`M${b.x} ${b.y - PAYDAY / 2 - 14} L${b.x + 11} ${b.y - PAYDAY / 2 - 10} L${b.x} ${b.y - PAYDAY / 2 - 6} Z`}
                fill={tokens.pink}
              />
            </G>
          </Svg>

          {/* home planet: your money */}
          <View
            style={{
              position: "absolute",
              left: a.x - (HOME * 1.28 + 24) / 2,
              top: a.y - (HOME * 1.28 + 24) / 2,
            }}
          >
            <HomePlanet size={HOME} balance={balance} />
          </View>

          <View
            style={{
              position: "absolute",
              left: pod.x - POD / 2,
              top: pod.y - (POD * 0.8 + 14 * (POD / 120)) / 2 - 4,
            }}
          >
            <CargoPod
              size={POD}
              balance={balance}
              drops={drops}
              dropKey={dropKey}
            />
          </View>

          <Animated.View
            style={[
              {
                position: "absolute",
                left: rocket.x - ROCKET / 2,
                top: rocket.y - ROCKET / 2,
                width: ROCKET,
                height: ROCKET,
                transform: [{ rotate: `${rocket.angle + 90}deg` }],
              },
            ]}
          >
            <Animated.View style={bobStyle}>
              <Svg width={ROCKET} height={ROCKET} viewBox="0 0 40 40">
                <Path
                  d="M20 3 C28 10 28 24 25 30 L15 30 C12 24 12 10 20 3 Z"
                  fill={tokens.star}
                  stroke={tokens.night}
                  strokeWidth={2}
                />
                <Circle
                  cx={20}
                  cy={15}
                  r={3.6}
                  fill={tokens.nightRaised}
                  stroke={tokens.night}
                  strokeWidth={1.5}
                />
                <Path d="M15 22 L9 30 L15 29 Z" fill={tokens.pink} />
                <Path d="M25 22 L31 30 L25 29 Z" fill={tokens.pink} />
                <Path d="M17 30 L20 38 L23 30 Z" fill={tokens.accent} />
              </Svg>
            </Animated.View>
          </Animated.View>
        </>
      ) : null}
    </View>
  );
}
