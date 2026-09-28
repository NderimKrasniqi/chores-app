import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, G, Line, Path } from "react-native-svg";

import { useTheme } from "@/design-system/theme";

import { Easings } from "./motion";

/** Milestones the planet grows as the balance does. */
const FLAG_AT = 100;
const DOME_AT = 250;
/** Room around the planet for its atmosphere, flag and dome. */
const PAD = 20;

function starPath(cx: number, cy: number, outer: number) {
  const inner = outer * 0.45;
  let d = "";
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    d += `${i === 0 ? "M" : "L"}${(cx + Math.cos(a) * r).toFixed(1)} ${(
      cy +
      Math.sin(a) * r
    ).toFixed(1)} `;
  }
  return `${d}Z`;
}

function arcPath(cx: number, cy: number, r: number, from: number, to: number) {
  const x1 = cx + Math.cos(from) * r;
  const y1 = cy + Math.sin(from) * r;
  const x2 = cx + Math.cos(to) * r;
  const y2 = cy + Math.sin(to) * r;
  const large = to - from > Math.PI ? 1 : 0;
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

/**
 * The kid's home planet, big enough to be a place rather than a badge: it
 * sits half off the edge of the money card, and grows a flag at 100 kr and
 * a little dome base at 250 kr. A pink moon climbs its orbit from just after
 * payday (bottom) to the gold star (payday, top), on the side facing the
 * card. When money arrives a coin arcs in and the planet gives a small
 * bounce. Otherwise it's still — the kid sees it many times a day.
 */
export function HomePlanet({
  size = 150,
  balance,
  weekProgress,
  celebrateKey,
}: {
  /** Planet diameter; the orbit reaches a bit past it. */
  size?: number;
  balance: number;
  /** 0 = just after payday … 1 = payday. */
  weekProgress?: number;
  /** Bump it to play the coin-lands moment. */
  celebrateKey?: number;
}) {
  const { tokens } = useTheme();
  const reducedMotion = useReducedMotion();
  const bounce = useSharedValue(1);
  const coin = useSharedValue(1);

  const r = size / 2;
  const orbitR = size * 0.64;
  const box = orbitR * 2 + 24;
  const c = box / 2;
  const negative = balance < 0;
  const body = negative ? tokens.nightTrack : tokens.primary;
  const shade = negative ? tokens.night : tokens.primaryShade;

  useEffect(() => {
    if (!celebrateKey || reducedMotion) return;
    coin.set(0);
    coin.set(withTiming(1, { duration: 650, easing: Easings.inOut }));
    bounce.set(
      withDelay(
        600,
        withSequence(
          withTiming(1.06, { duration: 140, easing: Easings.out }),
          withSpring(1, { duration: 500, dampingRatio: 0.5 }),
        ),
      ),
    );
  }, [bounce, celebrateKey, coin, reducedMotion]);

  const planetStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bounce.get() }],
  }));
  const coinStyle = useAnimatedStyle(() => {
    const t = coin.get();
    return {
      opacity: interpolate(t, [0, 0.1, 0.85, 1], [0, 1, 1, 0]),
      transform: [
        { translateX: interpolate(t, [0, 1], [-size * 0.75, -r * 0.35]) },
        {
          translateY: interpolate(
            t,
            [0, 0.45, 1],
            [-size * 0.15, -size * 0.5, 0],
          ),
        },
        { scale: interpolate(t, [0, 0.8, 1], [1, 0.9, 0.4]) },
      ],
    };
  });

  // The moon climbs the left (card-facing) half: bottom → left → top.
  const progress = Math.max(0, Math.min(1, weekProgress ?? 0));
  const start = Math.PI / 2;
  const moonAngle = start + progress * Math.PI;
  const moonX = c + Math.cos(moonAngle) * orbitR;
  const moonY = c + Math.sin(moonAngle) * orbitR;

  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={{ width: box, height: box }}
    >
      <Svg width={box} height={box} style={{ position: "absolute" }}>
        {/* orbit, and the part the moon has already travelled */}
        <Circle
          cx={c}
          cy={c}
          r={orbitR}
          stroke={tokens.nightRaised}
          strokeWidth={2}
          strokeDasharray="5 6"
          fill="none"
        />
        {weekProgress !== undefined && progress > 0.02 ? (
          <Path
            d={arcPath(c, c, orbitR, start, moonAngle)}
            stroke={tokens.pink}
            strokeWidth={2.5}
            strokeLinecap="round"
            opacity={0.55}
            fill="none"
          />
        ) : null}
        {weekProgress !== undefined ? (
          <>
            <Path
              d={starPath(c, c - orbitR, 9)}
              fill={tokens.gold}
              stroke={tokens.goldShade}
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
            <Circle
              cx={moonX}
              cy={moonY}
              r={7.5}
              fill={tokens.pink}
              stroke={tokens.nightSurface}
              strokeWidth={2.5}
            />
          </>
        ) : null}
      </Svg>

      <Animated.View
        style={[
          { position: "absolute", left: c - r - PAD, top: c - r - PAD },
          planetStyle,
        ]}
      >
        <Svg width={size + PAD * 2} height={size + PAD * 2}>
          <G transform={`translate(${PAD} ${PAD})`}>
            {/* soft atmosphere */}
            <Circle cx={r} cy={r} r={r + 7} fill={body} opacity={0.14} />
            <Circle cx={r} cy={r} r={r} fill={body} />
            {/* continents */}
            <G opacity={negative ? 0.4 : 0.55}>
              <Path
                d={`M${r * 0.35} ${r * 0.62} C${r * 0.55} ${r * 0.38} ${r * 0.95} ${r * 0.45} ${r * 0.92} ${r * 0.72} C${r * 0.9} ${r * 0.95} ${r * 0.6} ${r * 0.88} ${r * 0.52} ${r * 1.05} C${r * 0.42} ${r * 1.22} ${r * 0.22} ${r * 1.02} ${r * 0.35} ${r * 0.62} Z`}
                fill={shade}
              />
              <Path
                d={`M${r * 1.05} ${r * 1.3} C${r * 1.25} ${r * 1.15} ${r * 1.55} ${r * 1.25} ${r * 1.48} ${r * 1.45} C${r * 1.4} ${r * 1.65} ${r * 1.12} ${r * 1.62} ${r * 1.05} ${r * 1.3} Z`}
                fill={shade}
              />
            </G>
            {/* craters */}
            <G opacity={0.35}>
              <Circle cx={r * 1.3} cy={r * 0.62} r={r * 0.1} fill={shade} />
              <Circle cx={r * 0.72} cy={r * 1.5} r={r * 0.07} fill={shade} />
            </G>
            {/* night side */}
            <Path
              d={`M${r} ${size} A${r} ${r} 0 0 0 ${r} 0 A${r * 0.55} ${r} 0 0 1 ${r} ${size} Z`}
              fill={tokens.night}
              opacity={0.3}
              transform={`rotate(35 ${r} ${r})`}
            />
            {/* a highlight on the lit edge */}
            <Path
              d={`M${r * 0.28} ${r * 0.55} A${r * 0.85} ${r * 0.85} 0 0 1 ${r * 0.7} ${r * 0.2}`}
              stroke={tokens.white}
              strokeWidth={3}
              strokeLinecap="round"
              opacity={0.35}
              fill="none"
            />

            {/* milestones on the card-facing, upper-left limb */}
            {balance >= FLAG_AT ? (
              <G transform={`rotate(-38 ${r} ${r})`}>
                <Line
                  x1={r}
                  y1={1}
                  x2={r}
                  y2={-15}
                  stroke={tokens.star}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                <Path
                  d={`M${r} ${-15} L${r - 12} ${-11} L${r} ${-7} Z`}
                  fill={tokens.pink}
                />
              </G>
            ) : null}
            {balance >= DOME_AT ? (
              <G transform={`rotate(-72 ${r} ${r})`}>
                <Path
                  d={`M${r - 10} 2 A10 10 0 0 1 ${r + 10} 2 Z`}
                  fill={tokens.star}
                  stroke={tokens.night}
                  strokeWidth={1.5}
                  opacity={0.95}
                />
                <Circle cx={r} cy={-3} r={2.5} fill={tokens.accent} />
              </G>
            ) : null}
          </G>
        </Svg>
      </Animated.View>

      <Animated.View
        style={[
          {
            position: "absolute",
            left: c - 10,
            top: c - 10,
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: tokens.gold,
            borderWidth: 3,
            borderColor: tokens.goldShade,
            opacity: 0,
          },
          coinStyle,
        ]}
      />
    </View>
  );
}
