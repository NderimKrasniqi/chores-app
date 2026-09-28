import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LayoutChangeEvent } from "react-native";
import { Pressable, View } from "react-native";
import Animated, {
  FadeIn,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, G, Path } from "react-native-svg";

import { Icon } from "@/components/ui/icon";
import { amountFontSize } from "@/lib/amount-size";
import { AppText } from "@/design-system/text";
import { useCelebrationsHeld } from "@/lib/celebration-gate";
import { useTheme } from "@/design-system/theme";

import { Easings, PRESS, pressTransition, useLoop } from "./motion";

export type QuestStopStatus =
  "done" | "review" | "current" | "todo" | "redo" | "missed" | "unlock";

export type QuestStop = {
  key: string;
  title: string;
  subtitle?: string;
  status: QuestStopStatus;
  reward?: number;
  eyebrow?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  trailing?: ReactNode;
};

type Tokens = ReturnType<typeof useTheme>["tokens"];
type Point = { x: number; y: number };

const SIDE_PADDING = 28;
const GAP = 34;
const ROCKET = 40;

function planetSize(status: QuestStopStatus) {
  switch (status) {
    case "current":
      return 88;
    case "done":
    case "missed":
      return 46;
    default:
      return 60;
  }
}

/* ------------------------------------------------------------------ */
/* Planets                                                             */
/* ------------------------------------------------------------------ */

/** A round body with a soft terminator shadow and a couple of craters. */
function Body({
  size,
  fill,
  shade,
  craters = true,
  outline,
  dashed = false,
}: {
  size: number;
  fill: string;
  shade: string;
  craters?: boolean;
  outline?: string;
  dashed?: boolean;
}) {
  const r = size / 2;
  return (
    <Svg width={size} height={size} style={{ position: "absolute" }}>
      <Circle
        cx={r}
        cy={r}
        r={r - (outline ? 1.5 : 0)}
        fill={fill}
        stroke={outline}
        strokeWidth={outline ? 3 : 0}
        strokeDasharray={dashed ? "5 5" : undefined}
      />
      {/* night side */}
      <Path
        d={`M${r} ${size} A${r} ${r} 0 0 0 ${r} 0 A${r * 0.55} ${r} 0 0 1 ${r} ${size} Z`}
        fill={shade}
        opacity={0.35}
        transform={`rotate(35 ${r} ${r})`}
      />
      {craters ? (
        <G opacity={0.28}>
          <Circle cx={r * 0.62} cy={r * 0.7} r={r * 0.14} fill={shade} />
          <Circle cx={r * 1.3} cy={r * 1.35} r={r * 0.1} fill={shade} />
          <Circle cx={r * 0.78} cy={r * 1.45} r={r * 0.07} fill={shade} />
        </G>
      ) : null}
    </Svg>
  );
}

/** A little satellite circling a planet while a Parent checks the work. */
function Satellite({ size, color }: { size: number; color: string }) {
  const spin = useLoop({ duration: 5200, easing: Easings.linear, rest: 0.15 });
  const style = useAnimatedStyle(() => {
    const a = spin.get() * Math.PI * 2;
    return {
      transform: [
        { translateX: Math.cos(a) * (size / 2 + 8) },
        { translateY: Math.sin(a) * (size / 2 + 4) * 0.45 },
      ],
      opacity: Math.sin(a) < -0.2 ? 0.45 : 1,
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: size / 2 - 6,
          top: size / 2 - 5,
          width: 12,
          height: 10,
        },
        style,
      ]}
    >
      <Svg width={12} height={10} viewBox="0 0 12 10">
        <Path d="M0 3 H4 V7 H0 Z M8 3 H12 V7 H8 Z" fill={color} />
        <Circle cx={6} cy={5} r={2.6} fill={color} />
      </Svg>
    </Animated.View>
  );
}

/** A small beacon that blinks on a planet that needs a redo. */
function Beacon({ color }: { color: string }) {
  const blink = useLoop({ duration: 1100, reverse: true, rest: 1 });
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(blink.get(), [0, 1], [0.35, 1]),
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          top: -6,
          right: 4,
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

function Planet({ stop, tokens }: { stop: QuestStop; tokens: Tokens }) {
  const size = planetSize(stop.status);
  const center = {
    width: size,
    height: size,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };

  switch (stop.status) {
    case "done":
      return (
        <View style={center}>
          <Body size={size} fill={tokens.primary} shade={tokens.night} />
          <Icon name="check" color={tokens.night} size={22} />
        </View>
      );
    case "missed":
      return (
        <View style={center}>
          <Body size={size} fill={tokens.nightTrack} shade={tokens.night} />
          <Icon name="minus" color={tokens.inkMuted} size={20} />
        </View>
      );
    case "review":
      return (
        <View style={center}>
          <Body
            size={size}
            fill={tokens.nightRaised}
            shade={tokens.night}
            outline={tokens.inkMuted}
            dashed
          />
          <Icon name="hourglass" color={tokens.star} size={24} />
          <Satellite size={size} color={tokens.star} />
        </View>
      );
    case "redo":
      return (
        <View style={center}>
          <Body size={size} fill={tokens.pink} shade={tokens.night} />
          <Icon name="redo" color={tokens.night} size={24} />
          <Beacon color={tokens.gold} />
        </View>
      );
    case "unlock":
      return (
        <View style={center}>
          <Svg
            width={size + 26}
            height={size}
            style={{ position: "absolute", left: -13 }}
          >
            <Ellipse
              cx={(size + 26) / 2}
              cy={size / 2}
              rx={(size + 20) / 2}
              ry={size * 0.16}
              fill="none"
              stroke={tokens.goldShade}
              strokeWidth={3}
              transform={`rotate(-14 ${(size + 26) / 2} ${size / 2})`}
            />
          </Svg>
          <Body size={size} fill={tokens.gold} shade={tokens.night} />
          <Icon name="lock" color={tokens.night} size={24} />
        </View>
      );
    case "current":
      return (
        <View style={center}>
          <CurrentGlow size={size} color={tokens.accent} />
          <Svg
            width={size + 40}
            height={size}
            style={{ position: "absolute", left: -20 }}
          >
            <Ellipse
              cx={(size + 40) / 2}
              cy={size / 2}
              rx={(size + 34) / 2}
              ry={size * 0.17}
              fill="none"
              stroke={tokens.gold}
              strokeWidth={4}
              strokeOpacity={0.9}
              transform={`rotate(-14 ${(size + 40) / 2} ${size / 2})`}
            />
          </Svg>
          <Body size={size} fill={tokens.accent} shade={tokens.night} />
          {stop.reward !== undefined ? (
            <AppText
              numberOfLines={1}
              className="font-display text-night"
              style={{
                fontSize: amountFontSize(stop.reward, 24, 3),
                lineHeight: 30,
              }}
            >
              +{stop.reward}
              <AppText
                className="font-body-heavy text-night"
                style={{ fontSize: 12 }}
              >
                {" "}
                kr
              </AppText>
            </AppText>
          ) : (
            <Icon name="star" color={tokens.night} size={30} />
          )}
        </View>
      );
    default:
      return (
        <View style={center}>
          <Body
            size={size}
            fill={tokens.nightSurface}
            shade={tokens.night}
            outline={tokens.nightRaised}
            craters={false}
          />
          {stop.reward !== undefined ? (
            <AppText
              numberOfLines={1}
              className="font-display text-ink"
              style={{ fontSize: 16, lineHeight: 20 }}
            >
              +{stop.reward}
              <AppText
                className="font-body-heavy text-ink"
                style={{ fontSize: 10 }}
              >
                {" "}
                kr
              </AppText>
            </AppText>
          ) : (
            <Icon name="star" color={tokens.inkMuted} size={22} />
          )}
        </View>
      );
  }
}

/** A slow breathing halo behind the planet the rocket is docked at. */
function CurrentGlow({ size, color }: { size: number; color: string }) {
  const breathe = useLoop({ duration: 2600, reverse: true, rest: 0.5 });
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(breathe.get(), [0, 1], [0.12, 0.32]),
    transform: [{ scale: interpolate(breathe.get(), [0, 1], [1.12, 1.32]) }],
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
        },
        style,
      ]}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Trail and rocket                                                     */
/* ------------------------------------------------------------------ */

function trailPath(points: Point[]) {
  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const pull = (b.y - a.y) * 0.5;
    d += ` C ${a.x} ${a.y + pull}, ${b.x} ${b.y - pull}, ${b.x} ${b.y}`;
  }
  return d;
}

/**
 * The flight line between planets: bright dots up to where the rocket is,
 * faint ones beyond. Drawn under the planets.
 */
function Trail({
  points,
  flownTo,
  width,
  tokens,
}: {
  points: Point[];
  flownTo: number;
  width: number;
  tokens: Tokens;
}) {
  if (points.length < 2) return null;
  const height = points[points.length - 1].y + 20;
  const flown = points.slice(0, Math.max(1, flownTo + 1));
  const ahead = points.slice(Math.max(0, flownTo));
  return (
    <Svg
      pointerEvents="none"
      width={width}
      height={height}
      style={{ position: "absolute", left: 0, top: 0 }}
    >
      {ahead.length > 1 ? (
        <Path
          d={trailPath(ahead)}
          stroke={tokens.nightDash}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray="1 12"
          fill="none"
          opacity={0.8}
        />
      ) : null}
      {flown.length > 1 ? (
        <Path
          d={trailPath(flown)}
          stroke={tokens.gold}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray="1 10"
          fill="none"
        />
      ) : null}
    </Svg>
  );
}

function RocketArt({
  tokens,
  flying,
}: {
  tokens: Tokens;
  flying: SharedValue<number>;
}) {
  const flicker = useLoop({ duration: 260, reverse: true, rest: 0.5 });
  const flameStyle = useAnimatedStyle(() => {
    const t = flying.get();
    const boost = t > 0 && t < 1 ? 2.2 : 1;
    return {
      transform: [
        { scaleY: interpolate(flicker.get(), [0, 1], [0.75, 1.15]) * boost },
      ],
    };
  });
  return (
    <View style={{ width: ROCKET, height: ROCKET }}>
      <Animated.View
        style={[
          {
            position: "absolute",
            left: ROCKET / 2 - 5,
            top: ROCKET - 12,
            width: 10,
            height: 14,
            transformOrigin: "center top",
          },
          flameStyle,
        ]}
      >
        <Svg width={10} height={14} viewBox="0 0 10 14">
          <Path d="M0 0 Q5 16 10 0 Z" fill={tokens.accent} />
          <Path d="M2.5 0 Q5 9 7.5 0 Z" fill={tokens.gold} />
        </Svg>
      </Animated.View>
      <Svg width={ROCKET} height={ROCKET} viewBox="0 0 40 40">
        <Path d="M11 24 L6 32 L14 29 Z" fill={tokens.pink} />
        <Path d="M29 24 L34 32 L26 29 Z" fill={tokens.pink} />
        <Path
          d="M20 2 C28 8 29 20 26 29 H14 C11 20 12 8 20 2 Z"
          fill={tokens.star}
          stroke={tokens.night}
          strokeWidth={2}
        />
        <Circle
          cx={20}
          cy={15}
          r={4.2}
          fill={tokens.info}
          stroke={tokens.night}
          strokeWidth={2}
        />
        <Path d="M14 29 H26 L24 32 H16 Z" fill={tokens.nightRaised} />
      </Svg>
    </View>
  );
}

type Flight = { ax: number; ay: number; bx: number; by: number };

/** A point on the same S-curve the trail uses between two stops. */
function curveAt(f: Flight, t: number) {
  "worklet";
  const pull = (f.by - f.ay) * 0.5;
  const c1x = f.ax;
  const c1y = f.ay + pull;
  const c2x = f.bx;
  const c2y = f.by - pull;
  const u = 1 - t;
  const x =
    u * u * u * f.ax +
    3 * u * u * t * c1x +
    3 * u * t * t * c2x +
    t * t * t * f.bx;
  const y =
    u * u * u * f.ay +
    3 * u * u * t * c1y +
    3 * u * t * t * c2y +
    t * t * t * f.by;
  // Tangent, for pointing the nose along the curve.
  const dx =
    3 * u * u * (c1x - f.ax) +
    6 * u * t * (c2x - c1x) +
    3 * t * t * (f.bx - c2x);
  const dy =
    3 * u * u * (c1y - f.ay) +
    6 * u * t * (c2y - c1y) +
    3 * t * t * (f.by - c2y);
  return { x, y, angle: (Math.atan2(dy, dx) * 180) / Math.PI + 90 };
}

const FLIGHT_MS = 1500;
const SPARKS = [0.05, 0.1, 0.15, 0.21, 0.28];

/**
 * The kid's rocket, docked at the next thing to do. When that moves on, it
 * takes off along the dotted trail — nose following the bends, flame long,
 * a tail of sparks — and lands with a little bump. It waits while a quest
 * card covers the map so the kid actually sees it.
 */
function Rocket({
  targetKey,
  targetX,
  targetY,
  tokens,
}: {
  /** The stop it docks at; it only flies when this changes. */
  targetKey: string;
  targetX: number;
  targetY: number;
  tokens: Tokens;
}) {
  const reducedMotion = useReducedMotion();
  const held = useCelebrationsHeld();
  const flight = useSharedValue<Flight>({
    ax: targetX,
    ay: targetY,
    bx: targetX,
    by: targetY,
  });
  const progress = useSharedValue(1);
  const land = useSharedValue(1);
  const last = useRef({ key: targetKey, x: targetX, y: targetY });
  const bob = useLoop({ duration: 2400, reverse: true, rest: 0.5 });

  useEffect(() => {
    if (held) return;
    const from = last.current;
    if (from.key === targetKey && from.x === targetX && from.y === targetY) {
      return;
    }
    last.current = { key: targetKey, x: targetX, y: targetY };
    flight.set({ ax: from.x, ay: from.y, bx: targetX, by: targetY });
    if (reducedMotion) {
      progress.set(1);
      return;
    }
    if (from.key === targetKey) {
      // Same stop, the map just moved: re-seat quietly instead of flying.
      progress.set(1);
      return;
    }
    if (from.x === targetX && from.y === targetY) {
      // The next quest slid into the spot the rocket was already at (the
      // last one folded into the belt): a little hop says "on to this one".
      progress.set(1);
      land.set(
        withSequence(
          withTiming(0.82, { duration: 110 }),
          withSpring(1, { duration: 450, dampingRatio: 0.5 }),
        ),
      );
      return;
    }
    progress.set(0);
    progress.set(
      withDelay(
        350,
        withTiming(1, { duration: FLIGHT_MS, easing: Easings.inOut }),
      ),
    );
    land.set(
      withDelay(
        350 + FLIGHT_MS,
        withSequence(
          withTiming(0.82, { duration: 110 }),
          withSpring(1, { duration: 450, dampingRatio: 0.5 }),
        ),
      ),
    );
  }, [
    flight,
    held,
    land,
    progress,
    reducedMotion,
    targetKey,
    targetX,
    targetY,
  ]);

  const rocketStyle = useAnimatedStyle(() => {
    const t = progress.get();
    const flying = t > 0 && t < 1;
    const p = curveAt(flight.get(), t);
    // Upright when docked; nose along the curve in flight, easing back
    // upright over the last stretch.
    const lean = flying ? Math.min(1, Math.min(t, 1 - t) * 6) : 0;
    const bobY = flying ? 0 : interpolate(bob.get(), [0, 1], [-3, 3]);
    return {
      transform: [
        { translateX: p.x - ROCKET / 2 },
        { translateY: p.y - ROCKET / 2 + bobY },
        { rotate: `${p.angle * lean}deg` },
        { scaleY: land.get() },
        { scaleX: 2 - land.get() },
      ],
    };
  });

  return (
    <>
      {SPARKS.map((lag, index) => (
        <Spark
          key={index}
          lag={lag}
          flight={flight}
          progress={progress}
          color={index % 2 ? tokens.gold : tokens.accent}
        />
      ))}
      <Animated.View
        pointerEvents="none"
        accessible={false}
        style={[{ position: "absolute", left: 0, top: 0 }, rocketStyle]}
      >
        <RocketArt tokens={tokens} flying={progress} />
      </Animated.View>
    </>
  );
}

/** One spark in the rocket's wake, a little behind it on the curve. */
function Spark({
  lag,
  flight,
  progress,
  color,
}: {
  lag: number;
  flight: SharedValue<Flight>;
  progress: SharedValue<number>;
  color: string;
}) {
  const style = useAnimatedStyle(() => {
    const t = progress.get();
    const at = t - lag;
    if (t <= 0 || t >= 1 || at <= 0) return { opacity: 0 };
    const p = curveAt(flight.get(), at);
    const fade = 1 - lag / 0.3;
    return {
      opacity: fade,
      transform: [
        { translateX: p.x - 4 },
        { translateY: p.y + ROCKET * 0.35 - 4 },
        { scale: 0.5 + fade },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: 0,
          top: 0,
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Rows                                                                */
/* ------------------------------------------------------------------ */

function PlanetRow({
  stop,
  side,
  tokens,
  headroom,
}: {
  stop: QuestStop;
  side: "left" | "right";
  tokens: Tokens;
  headroom: number;
}) {
  const eyebrowColor =
    stop.status === "current"
      ? tokens.accent
      : stop.status === "redo"
        ? tokens.pink
        : stop.status === "unlock"
          ? tokens.gold
          : tokens.inkMuted;
  const subtitleColor =
    stop.status === "unlock"
      ? tokens.gold
      : stop.status === "done"
        ? tokens.primary
        : tokens.inkMuted;
  const textAlign = side === "left" ? "left" : "right";
  const size = planetSize(stop.status);

  return (
    <Pressable
      disabled={!stop.onPress}
      onPress={stop.onPress}
      pressRetentionOffset={16}
      accessibilityRole={stop.onPress ? "button" : undefined}
      accessibilityLabel={
        stop.accessibilityLabel ??
        [stop.title, stop.subtitle].filter(Boolean).join(", ")
      }
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            {
              flexDirection: side === "left" ? "row" : "row-reverse",
              alignItems: "center",
              // The current planet's ring reaches past its body.
              gap: stop.status === "current" ? 26 : 16,
              paddingHorizontal: SIDE_PADDING,
              paddingTop: headroom,
              transform: [{ scale: pressed ? PRESS.scale : 1 }],
            },
            pressTransition,
          ]}
        >
          <View
            style={{
              width: planetSize("current"),
              alignItems: side === "left" ? "flex-start" : "flex-end",
            }}
          >
            <View
              style={{
                marginHorizontal: (planetSize("current") - size) / 2,
              }}
            >
              <Planet stop={stop} tokens={tokens} />
            </View>
          </View>
          <View
            style={{
              flex: 1,
              alignItems: side === "left" ? "flex-start" : "flex-end",
            }}
          >
            {stop.eyebrow ? (
              <AppText
                className="font-body-heavy uppercase tracking-[1.2px]"
                style={{ color: eyebrowColor, textAlign, fontSize: 12 }}
              >
                {stop.eyebrow}
              </AppText>
            ) : null}
            <AppText
              numberOfLines={2}
              className={
                stop.status === "current"
                  ? "font-display-medium"
                  : "font-body-heavy"
              }
              style={{
                textAlign,
                fontSize: stop.status === "current" ? 22 : 16,
                lineHeight: stop.status === "current" ? 27 : 21,
                color:
                  stop.status === "done" || stop.status === "missed"
                    ? tokens.inkMuted
                    : tokens.ink,
                textDecorationLine:
                  stop.status === "done" ? "line-through" : "none",
              }}
            >
              {stop.title}
            </AppText>
            {stop.subtitle ? (
              <AppText
                className="font-body-bold"
                style={{
                  color: subtitleColor,
                  textAlign,
                  fontSize: 13,
                  lineHeight: 17,
                }}
              >
                {stop.subtitle}
              </AppText>
            ) : null}
            {stop.trailing ? (
              <View style={{ marginTop: 8 }}>{stop.trailing}</View>
            ) : null}
          </View>
        </Animated.View>
      )}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Asteroid belt                                                       */
/* ------------------------------------------------------------------ */

const BELT_H = 30;
const BELT_ROCKS = 10;

/** A lumpy little rock, so the belt doesn't read as a row of dots. */
function rockPath(cx: number, cy: number, r: number, seed: number) {
  const points = 7;
  let d = "";
  for (let i = 0; i < points; i += 1) {
    const angle = (i / points) * Math.PI * 2;
    const wobble = 0.78 + (((seed * 7 + i * 13) % 10) / 10) * 0.32;
    const x = cx + Math.cos(angle) * r * wobble;
    const y = cy + Math.sin(angle) * r * wobble;
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  return `${d}Z`;
}

function rockLook(status: QuestStopStatus, tokens: Tokens) {
  if (status === "done") return { fill: tokens.primary, stroke: tokens.night };
  if (status === "review") {
    return { fill: tokens.nightRaised, stroke: tokens.inkMuted };
  }
  return { fill: tokens.nightTrack, stroke: tokens.night };
}

/**
 * Today's finished and sent quests, folded into an asteroid belt where the trip
 * started: one rock per quest (green done, dashed while a Parent checks,
 * grey missed), so the map only holds what's next. Tap to see them; each opens its quest card.
 */
function Belt({
  finished,
  tokens,
  spaced,
}: {
  finished: QuestStop[];
  tokens: Tokens;
  spaced: boolean;
}) {
  const [open, setOpen] = useState(false);
  const done = finished.filter((stop) => stop.status === "done");
  const checking = finished.filter((stop) => stop.status === "review");
  const missed = finished.length - done.length - checking.length;
  const rocks = finished.slice(-BELT_ROCKS);
  const label = [
    done.length > 0 ? `${done.length} done` : null,
    checking.length > 0 ? `${checking.length} being checked` : null,
    missed > 0 ? `${missed} missed` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const rockW = 18;

  return (
    <View
      style={{ paddingHorizontal: SIDE_PADDING, marginBottom: spaced ? 22 : 0 }}
    >
      <Pressable
        onPress={() => setOpen((value) => !value)}
        pressRetentionOffset={16}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${label}. ${open ? "Hide" : "Show"} them`}
      >
        {({ pressed }) => (
          <Animated.View
            style={[
              {
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                transform: [{ scale: pressed ? PRESS.scale : 1 }],
              },
              pressTransition,
            ]}
          >
            <Svg width={rocks.length * rockW + 6} height={BELT_H}>
              {/* faint dust band the rocks drift in */}
              <Path
                d={`M0 ${BELT_H * 0.62} Q${(rocks.length * rockW) / 2} ${BELT_H * 0.3} ${rocks.length * rockW + 6} ${BELT_H * 0.62}`}
                stroke={tokens.inkMuted}
                strokeWidth={6}
                strokeLinecap="round"
                opacity={0.12}
                fill="none"
              />
              {rocks.map((stop, index) => {
                const cx = 3 + index * rockW + rockW / 2;
                const cy = BELT_H / 2 + (index % 2 === 0 ? 2 : -3);
                const r = stop.status === "missed" ? 5.5 : 7;
                const look = rockLook(stop.status, tokens);
                return (
                  <Path
                    key={stop.key}
                    d={rockPath(cx, cy, r, index + 1)}
                    fill={look.fill}
                    stroke={look.stroke}
                    strokeWidth={1.5}
                    strokeDasharray={
                      stop.status === "review" ? "2.5 2.5" : undefined
                    }
                    strokeLinejoin="round"
                  />
                );
              })}
            </Svg>
            <View style={{ flex: 1 }}>
              <AppText
                className="font-body-heavy"
                style={{ fontSize: 14, lineHeight: 19, color: tokens.ink }}
                numberOfLines={1}
              >
                {label}
              </AppText>
            </View>
            <View
              style={{ transform: [{ rotate: open ? "-90deg" : "90deg" }] }}
            >
              <Icon name="chevron" color={tokens.inkMuted} size={16} />
            </View>
          </Animated.View>
        )}
      </Pressable>

      {open ? <StopList stops={finished} tokens={tokens} /> : null}
    </View>
  );
}

/** The icon a quest gets in a folded list: the rock or planet it'd be. */
function MiniPlanet({ stop, tokens }: { stop: QuestStop; tokens: Tokens }) {
  const dashed = stop.status === "review" || stop.status === "todo";
  const fill =
    stop.status === "unlock"
      ? tokens.gold
      : stop.status === "todo"
        ? tokens.nightRaised
        : rockLook(stop.status, tokens).fill;
  const icon =
    stop.status === "done"
      ? "check"
      : stop.status === "review"
        ? "hourglass"
        : stop.status === "missed"
          ? "minus"
          : stop.status === "unlock"
            ? "lock"
            : null;
  return (
    <View
      style={{
        width: 28,
        height: 28,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Body
        size={28}
        fill={fill}
        shade={tokens.night}
        craters={false}
        outline={dashed ? tokens.inkMuted : undefined}
        dashed={stop.status === "review"}
      />
      {icon ? (
        <Icon
          name={icon}
          color={
            stop.status === "done" || stop.status === "unlock"
              ? tokens.night
              : tokens.inkMuted
          }
          size={14}
        />
      ) : null}
    </View>
  );
}

/** A folded group of quests, opened from the belt or the "+N more" pill. */
function StopList({ stops, tokens }: { stops: QuestStop[]; tokens: Tokens }) {
  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      style={{
        marginTop: 12,
        borderRadius: 20,
        backgroundColor: tokens.nightSurface,
        paddingVertical: 6,
      }}
    >
      {stops.map((stop) => (
        <Pressable
          key={stop.key}
          disabled={!stop.onPress}
          onPress={stop.onPress}
          accessibilityRole={stop.onPress ? "button" : undefined}
          accessibilityLabel={[stop.title, stop.eyebrow, stop.subtitle]
            .filter(Boolean)
            .join(", ")}
          accessibilityHint={stop.onPress ? "Opens the quest" : undefined}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 14,
            paddingVertical: 8,
          }}
        >
          <MiniPlanet stop={stop} tokens={tokens} />
          <View style={{ flex: 1 }}>
            <AppText
              className="font-body-heavy"
              style={{ fontSize: 15, lineHeight: 20, color: tokens.ink }}
              numberOfLines={1}
            >
              {stop.title}
            </AppText>
            {stop.subtitle ? (
              <AppText
                className="font-body-bold"
                style={{
                  fontSize: 12,
                  lineHeight: 16,
                  color:
                    stop.status === "done"
                      ? tokens.primary
                      : stop.status === "unlock"
                        ? tokens.gold
                        : tokens.inkMuted,
                }}
              >
                {stop.subtitle}
              </AppText>
            ) : null}
          </View>
        </Pressable>
      ))}
    </Animated.View>
  );
}

/** Quests past the next few, folded behind one pill that opens a list. */
function MoreStops({
  stops,
  label,
  tokens,
}: {
  stops: QuestStop[];
  label: string;
  tokens: Tokens;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ paddingHorizontal: SIDE_PADDING, marginTop: 20 }}>
      <Pressable
        onPress={() => setOpen((value) => !value)}
        pressRetentionOffset={16}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${label}. ${open ? "Hide" : "Show"} them`}
        style={{ alignSelf: "center" }}
      >
        {({ pressed }) => (
          <Animated.View
            style={[
              {
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                borderRadius: 999,
                paddingHorizontal: 16,
                paddingVertical: 8,
                backgroundColor: tokens.nightSurface,
                transform: [{ scale: pressed ? PRESS.scale : 1 }],
              },
              pressTransition,
            ]}
          >
            <Icon name="star" color={tokens.inkMuted} size={14} />
            <AppText variant="caption" color="ink-muted">
              {label}
            </AppText>
            <View
              style={{ transform: [{ rotate: open ? "-90deg" : "90deg" }] }}
            >
              <Icon name="chevron" color={tokens.inkMuted} size={12} />
            </View>
          </Animated.View>
        )}
      </Pressable>
      {open ? <StopList stops={stops} tokens={tokens} /> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Star map                                                            */
/* ------------------------------------------------------------------ */

/**
 * The kid's day as a trip through space: every chore is a planet on a fixed
 * route in deadline order, so nothing reshuffles — a planet just changes
 * look as its chore moves on (to do → being checked → done moon). The
 * rocket docks at the next thing to do and flies there along the trail.
 */
export function StarMap({
  stops,
  finished = [],
  more = [],
  moreLabel,
}: {
  /** Planets in route order (deadline order). */
  stops: QuestStop[];
  /** Today's finished quests, folded into the asteroid belt up top. */
  finished?: QuestStop[];
  /** Upcoming quests not drawn as planets, folded behind a pill. */
  more?: QuestStop[];
  /** The pill's words, e.g. "+2 more today · +4 later this week". */
  moreLabel?: string;
}) {
  const { tokens } = useTheme();
  const [width, setWidth] = useState(0);
  const [blocks, setBlocks] = useState<Record<string, number>>({});
  const [rows, setRows] = useState<Record<string, { y: number; h: number }>>(
    {},
  );

  const planets = stops;
  // Dock at the next thing to do: a redo or the chore up next.
  let rocketIndex = planets.findIndex(
    (stop) => stop.status === "current" || stop.status === "redo",
  );
  // Nothing to do right now: wait at the first planet still ahead.
  if (rocketIndex < 0 && planets.length > 0) rocketIndex = 0;
  const headroomFor = (index: number) => (index === rocketIndex ? 30 : 0);
  const flownTo = Math.max(0, rocketIndex);

  const centerX = (index: number) => {
    const slot = planetSize("current");
    return index % 2 === 0
      ? SIDE_PADDING + slot / 2
      : width - SIDE_PADDING - slot / 2;
  };

  const points: Point[] = [];
  for (let index = 0; index < planets.length; index += 1) {
    const key = planets[index].key;
    const blockY = blocks[key];
    const row = rows[key];
    if (blockY === undefined || row === undefined || width === 0) break;
    const pad = headroomFor(index);
    points.push({
      x: centerX(index),
      y: blockY + row.y + pad + (row.h - pad) / 2,
    });
  }
  const measured = points.length === planets.length;
  const rocketPoint =
    measured && rocketIndex >= 0
      ? {
          x:
            points[rocketIndex].x +
            (rocketIndex % 2 === 0 ? 1 : -1) * (planetSize("current") / 2 - 4),
          y: points[rocketIndex].y - planetSize("current") / 2 - 6,
        }
      : null;

  // While a stop that just joined the route is being measured, the rocket
  // stays where it was (mounted), so it can fly on once the spot is known.
  const [dock, setDock] = useState<{ key: string; x: number; y: number }>();
  const rocketKey = rocketIndex >= 0 ? planets[rocketIndex].key : undefined;
  if (
    rocketPoint &&
    rocketKey &&
    (dock?.key !== rocketKey ||
      dock.x !== rocketPoint.x ||
      dock.y !== rocketPoint.y)
  ) {
    setDock({ key: rocketKey, ...rocketPoint });
  }
  const shownDock =
    rocketPoint && rocketKey
      ? { key: rocketKey, ...rocketPoint }
      : planets.length > 0
        ? dock
        : undefined;

  const onBlock = (key: string) => (event: LayoutChangeEvent) => {
    const y = event.nativeEvent.layout.y;
    setBlocks((current) =>
      current[key] === y ? current : { ...current, [key]: y },
    );
  };
  const onRow = (key: string) => (event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    setRows((current) =>
      current[key]?.y === y && current[key]?.h === height
        ? current
        : { ...current, [key]: { y, h: height } },
    );
  };

  return (
    <View>
      {finished.length > 0 ? (
        <Belt finished={finished} tokens={tokens} spaced={planets.length > 0} />
      ) : null}
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {measured ? (
          <Trail
            points={points}
            flownTo={flownTo}
            width={width}
            tokens={tokens}
          />
        ) : null}
        {planets.map((stop, index) => (
          <View key={stop.key} onLayout={onBlock(stop.key)}>
            {index > 0 ? <View style={{ height: GAP }} /> : null}
            <View onLayout={onRow(stop.key)}>
              <PlanetRow
                stop={stop}
                side={index % 2 === 0 ? "left" : "right"}
                tokens={tokens}
                headroom={headroomFor(index)}
              />
            </View>
          </View>
        ))}
        {shownDock ? (
          <Rocket
            targetKey={shownDock.key}
            targetX={shownDock.x}
            targetY={shownDock.y}
            tokens={tokens}
          />
        ) : null}
      </View>
      {more.length > 0 && moreLabel ? (
        <MoreStops stops={more} label={moreLabel} tokens={tokens} />
      ) : null}
    </View>
  );
}
