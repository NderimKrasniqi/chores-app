import { memo, type ReactNode } from "react";
import { View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Path, Rect } from "react-native-svg";

import { AppText } from "@/design-system";
import { useTheme } from "@/design-system/theme";

import { useEntrance, useLoop } from "./motion";

export type ShelfStar = { id: string; color: string; isNew: boolean };

export type ShelfDay = {
  key: string;
  /** Short weekday, e.g. "M". */
  label: string;
  isToday: boolean;
  stars: ShelfStar[];
};

const JAR_W = 40;
const JAR_H = 62;
const STAR = 13;
/** Stars that fit in a jar before it shows "+N". */
const JAR_CAPACITY = 8;
const COLS = 2;

function starPath(size: number) {
  const c = size / 2;
  const inner = c * 0.45;
  let d = "";
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? c : inner;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    d += `${i === 0 ? "M" : "L"}${c + Math.cos(a) * r} ${c + Math.sin(a) * r}`;
  }
  return `${d}Z`;
}
const STAR_D = starPath(STAR);

/**
 * The family's week as a shelf of seven jars — oldest on the left, today on
 * the right. Every approved chore drops a star into its day's jar, in that
 * kid's colour, so "we did loads on Saturday" and "today's jar is still
 * empty" read at a glance. Calm on purpose: only stars that are new since
 * the last visit fall in; today's jar breathes softly.
 */
export const StarShelf = memo(function StarShelf({
  days,
}: {
  days: ShelfDay[];
}) {
  const { tokens } = useTheme();
  const total = days.reduce((sum, day) => sum + day.stars.length, 0);
  let newIndex = 0;

  return (
    <View
      accessible
      accessibilityLabel={`This week: ${total} ${total === 1 ? "win" : "wins"}. ${days
        .map(
          (day) => `${day.isToday ? "Today" : day.label} ${day.stars.length}`,
        )
        .join(", ")}`}
      className="overflow-hidden rounded-large px-3 pb-3 pt-4"
      style={{
        backgroundColor: tokens.night,
        borderWidth: 2,
        borderColor: tokens.nightRaised,
      }}
    >
      <View className="flex-row items-end justify-between px-1">
        {days.map((day) => {
          const visible = day.stars.slice(0, JAR_CAPACITY);
          const overflow = day.stars.length - visible.length;
          return (
            <View key={day.key} className="items-center">
              <Jar isToday={day.isToday} tokens={tokens}>
                {visible.map((star, i) => (
                  <JarStar
                    key={star.id}
                    index={i}
                    color={star.color}
                    outline={tokens.night}
                    dropOrder={star.isNew ? newIndex++ : -1}
                  />
                ))}
                {overflow > 0 ? (
                  <View className="absolute left-0 right-0 top-1 items-center">
                    <AppText
                      className="font-body-heavy text-[10px]"
                      style={{ color: tokens.star }}
                    >
                      +{overflow}
                    </AppText>
                  </View>
                ) : null}
              </Jar>
            </View>
          );
        })}
      </View>
      {/* The shelf itself */}
      <View
        className="mx-0 mt-1 h-2 rounded-full"
        style={{ backgroundColor: tokens.goldShade }}
      />
      <View className="mt-1.5 flex-row justify-between px-1">
        {days.map((day) => (
          <View key={day.key} style={{ width: JAR_W }} className="items-center">
            <AppText
              variant="caption"
              style={{
                color: day.isToday ? tokens.gold : tokens.inkMuted,
              }}
              className={day.isToday ? "font-body-heavy" : ""}
            >
              {day.label}
            </AppText>
            {day.isToday ? (
              <View
                className="mt-0.5 h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: tokens.gold }}
              />
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
});

function Jar({
  isToday,
  tokens,
  children,
}: {
  isToday: boolean;
  tokens: ReturnType<typeof useTheme>["tokens"];
  children: ReactNode;
}) {
  const breathe = useLoop({ duration: 2400, reverse: true, rest: 0.6 });
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(breathe.get(), [0, 1], [0.25, 0.7]),
  }));
  return (
    <View style={{ width: JAR_W, height: JAR_H + 10 }}>
      {isToday ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              left: -4,
              right: -4,
              top: 4,
              bottom: -4,
              borderRadius: 14,
              backgroundColor: tokens.gold,
            },
            glowStyle,
          ]}
        />
      ) : null}
      <Svg
        width={JAR_W}
        height={JAR_H + 10}
        viewBox={`0 0 ${JAR_W} ${JAR_H + 10}`}
        style={{ position: "absolute" }}
      >
        {/* lid */}
        <Rect
          x={9}
          y={2}
          width={JAR_W - 18}
          height={7}
          rx={2.5}
          fill={isToday ? tokens.gold : tokens.nightDash}
        />
        {/* glass */}
        <Path
          d={`M11 10 H${JAR_W - 11} V14 Q${JAR_W - 3} 16 ${JAR_W - 3} 24 V${JAR_H + 2} Q${JAR_W - 3} ${JAR_H + 8} ${JAR_W - 9} ${JAR_H + 8} H9 Q3 ${JAR_H + 8} 3 ${JAR_H + 2} V24 Q3 16 11 14 Z`}
          fill={tokens.nightRaised}
          fillOpacity={0.55}
          stroke={isToday ? tokens.gold : tokens.nightDash}
          strokeWidth={2}
        />
        {/* shine */}
        <Rect
          x={7}
          y={24}
          width={3}
          height={18}
          rx={1.5}
          fill={tokens.white}
          opacity={0.18}
        />
      </Svg>
      {children}
    </View>
  );
}

/** Stars sit two to a row from the bottom of the jar up. */
function JarStar({
  index,
  color,
  outline,
  dropOrder,
}: {
  index: number;
  color: string;
  outline: string;
  /** -1 = already seen (no drop); otherwise its place in the drop sequence. */
  dropOrder: number;
}) {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  const left = 7 + col * (STAR + 1) + (row % 2 ? 2 : 0);
  const bottom = 6 + row * (STAR - 1);
  const t = useEntrance({
    duration: dropOrder < 0 ? 1 : 520,
    delay: dropOrder < 0 ? 0 : 350 + dropOrder * 160,
    playful: dropOrder >= 0,
  });
  const style = useAnimatedStyle(() => ({
    opacity:
      dropOrder < 0 ? 1 : interpolate(t.get(), [0, 0.15], [0, 1], "clamp"),
    transform: [
      {
        translateY:
          dropOrder < 0
            ? 0
            : interpolate(t.get(), [0, 1], [-(JAR_H - bottom), 0]),
      },
      { rotate: `${((index * 37) % 40) - 20}deg` },
    ],
  }));
  return (
    <Animated.View
      style={[
        { position: "absolute", left, bottom, width: STAR, height: STAR },
        style,
      ]}
    >
      <Svg width={STAR} height={STAR} viewBox={`0 0 ${STAR} ${STAR}`}>
        <Path d={STAR_D} fill={color} stroke={outline} strokeWidth={0.8} />
      </Svg>
    </Animated.View>
  );
}
