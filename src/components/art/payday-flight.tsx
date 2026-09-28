import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

import { useTheme } from "@/design-system/theme";

import { CargoPod } from "./cargo-pod";
import { HomePlanet } from "./home-planet";
import { Easings, useLoop } from "./motion";

const HEIGHT = 108;
const HOME = 60;
const HOME_BOX = HOME * 1.28 + 24;
const POD = 44;
const ROCKET = 28;
const LAND_MS = 1400;
/** How far behind the rocket (in arc fraction) the towed pod rides. */
const TOW = 0.16;

type Point = { x: number; y: number };

/** A point on the flight arc (quadratic curve), t = 0 … 1. */
function arcAt(a: Point, c: Point, b: Point, t: number) {
  "worklet";
  const u = 1 - t;
  const x = u * u * a.x + 2 * u * t * c.x + t * t * b.x;
  const y = u * u * a.y + 2 * u * t * c.y + t * t * b.y;
  const dx = 2 * u * (c.x - a.x) + 2 * t * (b.x - c.x);
  const dy = 2 * u * (c.y - a.y) + 2 * t * (b.y - c.y);
  return { x, y, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
}

/**
 * This week's money as a delivery on its way to you. On the left, the
 * depot it set off from (last payday); on the right, your home planet —
 * the same one as on Quests — where it lands on payday. The rocket sits on
 * the arc at today's spot, towing the cargo pod that holds what will land.
 * Below zero the pod drags a pink debt crate.
 *
 * `landing` is the rare moment: after a Parent pays out, the rocket flies
 * the rest of the way, the pod reaches the planet and the planet catches
 * the coins. Otherwise only the rocket bobs.
 */
export function PaydayFlight({
  balance,
  weekProgress,
  drops = 0,
  dropKey,
  landing = false,
}: {
  balance: number;
  /** 0 = just after the last payday … 1 = payday. */
  weekProgress: number;
  drops?: number;
  dropKey?: string;
  /** Play the payday landing once (the caller decides "once"). */
  landing?: boolean;
}) {
  const { tokens } = useTheme();
  const reducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [landedKey, setLandedKey] = useState(0);
  const bob = useLoop({ duration: 2600, reverse: true, rest: 0.5 });

  const progress = Math.max(0, Math.min(1, weekProgress));
  const target = landing ? 1 : 0.06 + progress * 0.8;
  const t = useSharedValue(landing ? 0.78 : target);

  useEffect(() => {
    if (!landing) {
      t.set(target);
      return;
    }
    if (reducedMotion) {
      t.set(1);
      const timer = setTimeout(() => setLandedKey((key) => key + 1), 0);
      return () => clearTimeout(timer);
    }
    t.set(0.78);
    t.set(
      withDelay(
        450,
        withTiming(1, { duration: LAND_MS, easing: Easings.inOut }),
      ),
    );
    // The planet catches the coins as the pod arrives.
    const timer = setTimeout(
      () => setLandedKey((key) => key + 1),
      450 + LAND_MS - 150,
    );
    return () => clearTimeout(timer);
  }, [landing, reducedMotion, t, target]);

  const a = { x: 22, y: HEIGHT - 26 };
  const b = { x: width - HOME * 0.62, y: HEIGHT - HOME * 0.62 };
  const c = { x: width / 2, y: -HEIGHT * 0.3 };

  const rocketStyle = useAnimatedStyle(() => {
    const p = arcAt(a, c, b, t.get());
    const docked = t.get() >= 0.999;
    return {
      opacity: docked ? 0 : 1,
      transform: [
        { translateX: p.x - ROCKET / 2 },
        {
          translateY:
            p.y - ROCKET / 2 + interpolate(bob.get(), [0, 1], [-2, 2]),
        },
        { rotate: `${p.angle + 90}deg` },
      ],
    };
  });
  const podStyle = useAnimatedStyle(() => {
    const p = arcAt(a, c, b, Math.max(0.02, t.get() - TOW));
    const arriving = interpolate(t.get(), [0.93, 1], [1, 0], "clamp");
    return {
      opacity: arriving,
      transform: [
        { translateX: p.x - POD / 2 },
        { translateY: p.y - POD * 0.45 },
        { scale: interpolate(arriving, [0, 1], [0.6, 1]) },
      ],
    };
  });

  // The flown part of the arc (static; the landing draws over it).
  const flown: string[] = [];
  const steps = 24;
  for (let i = 0; i <= steps; i += 1) {
    const p = arcAt(a, c, b, (i / steps) * target);
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
            {/* the depot: where this week's delivery set off (last payday) */}
            <Rect
              x={a.x - 14}
              y={a.y + 4}
              width={28}
              height={6}
              rx={3}
              fill={tokens.nightRaised}
            />
            <Rect
              x={a.x - 9}
              y={a.y - 10}
              width={18}
              height={14}
              rx={3}
              fill={tokens.inkMuted}
              opacity={0.6}
            />
            <Line
              x1={a.x + 6}
              y1={a.y - 10}
              x2={a.x + 6}
              y2={a.y - 20}
              stroke={tokens.inkMuted}
              strokeWidth={2}
              strokeLinecap="round"
            />
            <Circle cx={a.x + 6} cy={a.y - 21} r={2.5} fill={tokens.gold} />
          </Svg>

          {/* your home planet: where the delivery lands on payday */}
          <View
            style={{
              position: "absolute",
              left: b.x - HOME_BOX / 2,
              top: b.y - HOME_BOX / 2,
            }}
          >
            <HomePlanet
              size={HOME}
              balance={balance}
              celebrateKey={landedKey}
            />
          </View>

          <Animated.View
            style={[{ position: "absolute", left: 0, top: 0 }, podStyle]}
          >
            <CargoPod
              size={POD}
              balance={balance}
              drops={landing ? 0 : drops}
              dropKey={dropKey}
            />
            {balance < 0 ? (
              // the carried debt, dragging behind
              <View
                style={{
                  position: "absolute",
                  left: -10,
                  top: POD * 0.42,
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  backgroundColor: tokens.pink,
                  borderWidth: 1.5,
                  borderColor: tokens.night,
                }}
              />
            ) : null}
          </Animated.View>

          <Animated.View
            style={[
              {
                position: "absolute",
                left: 0,
                top: 0,
                width: ROCKET,
                height: ROCKET,
              },
              rocketStyle,
            ]}
          >
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
        </>
      ) : null}
    </View>
  );
}
