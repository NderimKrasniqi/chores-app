import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LayoutChangeEvent } from "react-native";
import { Pressable, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, G, Path } from "react-native-svg";

import { Icon } from "@/components/ui/icon";
import { amountFontSize } from "@/lib/amount-size";
import { AppText } from "@/design-system/text";
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

function RocketArt({ tokens }: { tokens: Tokens }) {
  const flicker = useLoop({ duration: 260, reverse: true, rest: 0.5 });
  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: interpolate(flicker.get(), [0, 1], [0.75, 1.15]) }],
  }));
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

/**
 * The kid's rocket, docked beside the current planet. When the current
 * planet changes (a chore got approved), it flies along to the new one —
 * the map's one big moment. Otherwise it only bobs.
 */
function Rocket({
  targetX,
  targetY,
  tokens,
}: {
  targetX: number;
  targetY: number;
  tokens: Tokens;
}) {
  const reducedMotion = useReducedMotion();
  const x = useSharedValue(targetX);
  const y = useSharedValue(targetY);
  const tilt = useSharedValue(0);
  const last = useRef({ x: targetX, y: targetY });
  const bob = useLoop({ duration: 2400, reverse: true, rest: 0.5 });

  useEffect(() => {
    const from = last.current;
    last.current = { x: targetX, y: targetY };
    if (from.x === targetX && from.y === targetY) return;
    if (reducedMotion) {
      x.set(targetX);
      y.set(targetY);
      return;
    }
    // Lean into the flight, then straighten up on arrival.
    tilt.set(targetX > from.x ? 28 : -28);
    x.set(withTiming(targetX, { duration: 950, easing: Easings.inOut }));
    y.set(withTiming(targetY, { duration: 950, easing: Easings.inOut }));
    tilt.set(withTiming(0, { duration: 1300, easing: Easings.out }));
  }, [reducedMotion, targetX, targetY, tilt, x, y]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.get() - ROCKET / 2 },
      {
        translateY:
          y.get() - ROCKET / 2 + interpolate(bob.get(), [0, 1], [-3, 3]),
      },
      { rotate: `${tilt.get()}deg` },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      accessible={false}
      style={[{ position: "absolute", left: 0, top: 0 }, style]}
    >
      <RocketArt tokens={tokens} />
    </Animated.View>
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

/** Today's finished chores as a little cluster of moons you can open. */
function DoneCluster({
  done,
  open,
  onToggle,
  tokens,
}: {
  done: QuestStop[];
  open: boolean;
  onToggle: () => void;
  tokens: Tokens;
}) {
  const approved = done.filter((stop) => stop.status === "done").length;
  const label =
    approved === done.length
      ? `${done.length} done today`
      : `${approved} done · ${done.length - approved} missed today`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`${label}. ${open ? "Hide" : "Show"}`}
      onPress={onToggle}
      className="mx-5 mb-4 flex-row items-center gap-3 self-start rounded-full py-2 pl-2 pr-4"
      style={{ backgroundColor: tokens.nightSurface }}
    >
      <View className="flex-row">
        {done.slice(0, 4).map((stop, index) => (
          <View
            key={stop.key}
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              marginLeft: index === 0 ? 0 : -8,
              borderWidth: 2,
              borderColor: tokens.nightSurface,
              backgroundColor:
                stop.status === "done" ? tokens.primary : tokens.nightTrack,
            }}
          />
        ))}
      </View>
      <AppText variant="label">{label}</AppText>
      <Icon
        name={open ? "chevronDown" : "chevron"}
        color={tokens.inkMuted}
        size={14}
      />
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Star map                                                            */
/* ------------------------------------------------------------------ */

/**
 * The kid's day as a trip through space. Today's finished chores fold into
 * a cluster of moons at the top; the map starts at the rocket, docked at the
 * chore that's up next, with a short trail of planets ahead. When a chore is
 * approved the rocket flies to the next planet.
 */
export function StarMap({
  stops,
  done = [],
  moreLater = 0,
}: {
  /** Planets from the rocket onwards, in flight order. */
  stops: QuestStop[];
  /** Today's finished chores, folded into the cluster. */
  done?: QuestStop[];
  /** Upcoming chores not drawn, e.g. later this week. */
  moreLater?: number;
}) {
  const { tokens } = useTheme();
  const [width, setWidth] = useState(0);
  const [showDone, setShowDone] = useState(false);
  const [blocks, setBlocks] = useState<Record<string, number>>({});
  const [rows, setRows] = useState<Record<string, { y: number; h: number }>>(
    {},
  );

  const planets = showDone ? [...done, ...stops] : stops;
  const currentIndex = planets.findIndex((stop) => stop.status === "current");
  // The rocket docks at "up next", or at the first planet still in play.
  const rocketIndex =
    currentIndex >= 0
      ? currentIndex
      : planets.findIndex(
          (stop) => stop.status !== "done" && stop.status !== "missed",
        );
  const headroomFor = (index: number) => (index === rocketIndex ? 30 : 0);

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
      {done.length > 0 ? (
        <DoneCluster
          done={done}
          open={showDone}
          onToggle={() => setShowDone((value) => !value)}
          tokens={tokens}
        />
      ) : null}
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {measured ? (
          <Trail
            points={points}
            flownTo={Math.max(0, rocketIndex)}
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
        {rocketPoint ? (
          <Rocket
            targetX={rocketPoint.x}
            targetY={rocketPoint.y}
            tokens={tokens}
          />
        ) : null}
      </View>
      {moreLater > 0 ? (
        <View className="mt-5 items-center">
          <View
            className="flex-row items-center gap-2 rounded-full px-4 py-2"
            style={{ backgroundColor: tokens.nightSurface }}
          >
            <Icon name="star" color={tokens.inkMuted} size={14} />
            <AppText variant="caption" color="ink-muted">
              +{moreLater} more later this week
            </AppText>
          </View>
        </View>
      ) : null}
    </View>
  );
}
