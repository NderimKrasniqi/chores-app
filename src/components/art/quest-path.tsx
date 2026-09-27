import { useState, type ReactNode } from "react";
import type { LayoutChangeEvent } from "react-native";
import { Pressable, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { Icon } from "@/components/ui/icon";
import { AppText } from "@/design-system/text";
import { useTheme } from "@/design-system/theme";

import { Easings, PRESS, pressTransition, useLoop } from "./motion";
import { PulseRings } from "./pieces";
import { StarBuddy } from "./star-buddy";

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

const AnimatedPath = Animated.createAnimatedComponent(Path);

const SIDE_PADDING = 28;
// Vertical room between stops: enough for the road to swing, not sprawl.
const CONNECTOR_HEIGHT = 44;
const ROAD_WIDTH = 30;
// A night-sky ring around each stop so it sits on the road, not in it.
const HALO = 5;

function nodeSize(status: QuestStopStatus) {
  return status === "current" ? 84 : status === "unlock" ? 66 : 60;
}

type Point = { x: number; y: number };

/**
 * One continuous road through every stop's centre, drawn beneath the stops so
 * it flows under each circle instead of butting into it. Each segment leaves
 * a stop heading down and arrives at the next heading down, so the bends are
 * smooth S-curves. A dashed centre line drifts slowly along it.
 */
function Road({ points, width }: { points: Point[]; width: number }) {
  const { tokens } = useTheme();
  const progress = useLoop({ duration: 1800, easing: Easings.linear });
  const dashProps = useAnimatedProps(() => ({
    strokeDashoffset: -progress.get() * 40,
  }));
  if (points.length < 2) return null;

  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const pull = (b.y - a.y) * 0.55;
    d += ` C ${a.x} ${a.y + pull}, ${b.x} ${b.y - pull}, ${b.x} ${b.y}`;
  }
  const height = points[points.length - 1].y + ROAD_WIDTH;

  return (
    <Svg
      pointerEvents="none"
      width={width}
      height={height}
      style={{ position: "absolute", left: 0, top: 0 }}
    >
      <Path
        d={d}
        stroke={tokens.nightRaised}
        strokeOpacity={0.55}
        strokeWidth={ROAD_WIDTH + 6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d={d}
        stroke={tokens.nightTrack}
        strokeWidth={ROAD_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <AnimatedPath
        d={d}
        stroke={tokens.nightDash}
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray="6 14"
        fill="none"
        animatedProps={dashProps}
      />
    </Svg>
  );
}

function FlippingHourglass({ color }: { color: string }) {
  const progress = useLoop({ duration: 3000, easing: Easings.linear });
  const style = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(progress.get(), [0, 0.45, 0.55, 1], [0, 0, 180, 180])}deg`,
      },
    ],
  }));
  return (
    <Animated.View style={style}>
      <Icon name="hourglass" color={color} size={26} />
    </Animated.View>
  );
}

function Node({ stop, showBuddy }: { stop: QuestStop; showBuddy: boolean }) {
  const { tokens } = useTheme();
  const size = nodeSize(stop.status);
  const circle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };

  switch (stop.status) {
    case "done":
      return (
        <View
          style={[
            circle,
            {
              backgroundColor: tokens.primary,
              borderBottomWidth: 5,
              borderBottomColor: tokens.primaryShade,
            },
          ]}
        >
          <Icon name="check" color={tokens.night} size={28} />
        </View>
      );
    case "review":
      return (
        <View
          style={[
            circle,
            {
              backgroundColor: tokens.nightRaised,
              borderWidth: 3,
              borderStyle: "dashed",
              borderColor: tokens.inkMuted,
            },
          ]}
        >
          <FlippingHourglass color={tokens.star} />
        </View>
      );
    case "redo":
      return (
        <PulseRings size={size} color={tokens.pink}>
          <View
            style={[
              circle,
              {
                position: "absolute",
                backgroundColor: tokens.pink,
                borderBottomWidth: 5,
                borderBottomColor: tokens.urgencyPressed,
              },
            ]}
          >
            <Icon name="redo" color={tokens.night} size={26} />
          </View>
        </PulseRings>
      );
    case "missed":
      return (
        <View style={[circle, { backgroundColor: tokens.nightTrack }]}>
          <Icon name="minus" color={tokens.inkMuted} size={24} />
        </View>
      );
    case "unlock":
      return (
        <View
          style={[
            circle,
            {
              borderRadius: 22,
              backgroundColor: tokens.gold,
              borderBottomWidth: 5,
              borderBottomColor: tokens.goldShade,
            },
          ]}
        >
          <Icon name="lock" color={tokens.night} size={26} />
        </View>
      );
    case "current":
      return (
        <View style={{ width: size, height: size }}>
          <PulseRings size={size}>
            <View
              style={[
                circle,
                {
                  position: "absolute",
                  backgroundColor: tokens.accent,
                  borderBottomWidth: 7,
                  borderBottomColor: tokens.accentShade,
                },
              ]}
            >
              {stop.reward !== undefined ? (
                <>
                  <AppText className="font-display text-[24px] leading-[26px] text-night">
                    +{stop.reward}{" "}
                    <AppText className="font-body-heavy text-[12px] leading-[14px] text-night">
                      kr
                    </AppText>
                  </AppText>
                </>
              ) : (
                <Icon name="star" color={tokens.night} size={30} />
              )}
            </View>
          </PulseRings>
          {showBuddy ? (
            <View
              style={{ position: "absolute", top: -42, left: size / 2 - 22 }}
            >
              <StarBuddy size={44} mood="hop" />
            </View>
          ) : null}
        </View>
      );
    default:
      return (
        <View
          style={[
            circle,
            {
              backgroundColor: tokens.nightSurface,
              borderWidth: 3,
              borderColor: tokens.nightRaised,
            },
          ]}
        >
          {stop.reward !== undefined ? (
            <AppText className="font-display text-[17px] text-ink">
              +{stop.reward}
              <AppText className="font-body-heavy text-[10px] text-ink">
                {" "}
                kr
              </AppText>
            </AppText>
          ) : (
            <Icon name="star" color={tokens.inkMuted} size={24} />
          )}
        </View>
      );
  }
}

function StopRow({
  stop,
  side,
  showBuddy,
}: {
  stop: QuestStop;
  side: "left" | "right";
  showBuddy: boolean;
}) {
  const { tokens } = useTheme();
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
  const align = side === "left" ? "flex-start" : "flex-end";

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
              gap: 14,
              paddingHorizontal: SIDE_PADDING,
              transform: [{ scale: pressed ? PRESS.scale : 1 }],
            },
            pressTransition,
          ]}
        >
          <View
            style={{
              padding: HALO,
              borderRadius: nodeSize(stop.status) / 2 + HALO,
              backgroundColor: tokens.canvas,
            }}
          >
            <Node stop={stop} showBuddy={showBuddy} />
          </View>
          <View style={{ flex: 1, alignItems: align }}>
            {stop.eyebrow ? (
              <AppText
                className="font-body-heavy text-[12px] uppercase tracking-[1.2px]"
                style={{
                  color: eyebrowColor,
                  textAlign: side === "left" ? "left" : "right",
                }}
              >
                {stop.eyebrow}
              </AppText>
            ) : null}
            <AppText
              className={
                stop.status === "current"
                  ? "font-display-medium text-[22px] leading-[27px]"
                  : "font-body-heavy text-[16px] leading-[21px]"
              }
              style={{
                color:
                  stop.status === "done" || stop.status === "missed"
                    ? tokens.inkMuted
                    : tokens.ink,
                textDecorationLine:
                  stop.status === "done" ? "line-through" : "none",
                textAlign: side === "left" ? "left" : "right",
              }}
              numberOfLines={2}
            >
              {stop.title}
            </AppText>
            {stop.subtitle ? (
              <AppText
                className="font-body-bold text-[13px] leading-[17px]"
                style={{
                  color: subtitleColor,
                  textAlign: side === "left" ? "left" : "right",
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

/**
 * The Child's day drawn as a winding quest: stops alternate sides and are
 * joined by a flowing dashed path. The first "current" stop gets the buddy.
 */
export function QuestPath({ stops }: { stops: QuestStop[] }) {
  const [width, setWidth] = useState(0);
  // Measured per stop: the block's top in the path, and the row inside it.
  const [blocks, setBlocks] = useState<Record<string, number>>({});
  const [rows, setRows] = useState<Record<string, { y: number; h: number }>>(
    {},
  );
  const firstCurrent = stops.findIndex((stop) => stop.status === "current");
  const buddyPadding = (index: number) =>
    stops[index].status === "current" && index === firstCurrent ? 36 : 0;

  const centerX = (index: number) => {
    const size = nodeSize(stops[index].status);
    return index % 2 === 0
      ? SIDE_PADDING + HALO + size / 2
      : width - SIDE_PADDING - HALO - size / 2;
  };

  const points: Point[] = [];
  for (let index = 0; index < stops.length; index += 1) {
    const key = stops[index].key;
    const blockY = blocks[key];
    const row = rows[key];
    if (blockY === undefined || row === undefined || width === 0) break;
    // Rows centre their node vertically below any top padding (the buddy's
    // headroom), so the node sits in the middle of what's left.
    const pad = buddyPadding(index);
    points.push({
      x: centerX(index),
      y: blockY + row.y + pad + (row.h - pad) / 2,
    });
  }
  const measured = points.length === stops.length;

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
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {measured ? <Road points={points} width={width} /> : null}
      {stops.map((stop, index) => (
        <View key={stop.key} onLayout={onBlock(stop.key)}>
          {index > 0 ? <View style={{ height: CONNECTOR_HEIGHT }} /> : null}
          <View
            onLayout={onRow(stop.key)}
            style={{
              paddingTop: buddyPadding(index),
            }}
          >
            <StopRow
              stop={stop}
              side={index % 2 === 0 ? "left" : "right"}
              showBuddy={index === firstCurrent}
            />
          </View>
        </View>
      ))}
    </View>
  );
}
