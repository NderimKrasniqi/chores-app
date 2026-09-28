import { memo, useState } from "react";
import { View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Circle, Path, Polyline } from "react-native-svg";

import { AppText } from "@/design-system";
import { useTheme } from "@/design-system/theme";

import { useEntrance } from "./motion";

export type SkyStar = { id: string; color: string; isNew: boolean };

export type SkyDay = {
  key: string;
  /** Short weekday, e.g. "M". */
  label: string;
  isToday: boolean;
  stars: SkyStar[];
};

const HEIGHT = 112;
const LABELS = 22;
const STAR = 12;
const STEP = 13;
/** Stars a day shows before "+N". */
const PER_DAY = 5;
const SIDE = 14;

function starPath(cx: number, cy: number, outer: number) {
  const inner = outer * 0.45;
  let d = "";
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    d += `${i === 0 ? "M" : "L"}${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}`;
  }
  return `${d}Z`;
}

/** A small, stable wobble per star so the columns don't look like a grid. */
function jitter(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 100) / 100 - 0.5) * 12;
}

/**
 * The family's week as a constellation: seven columns of sky, oldest day on
 * the left and today on the right. Every approved chore lights a star in
 * its day, in that kid's colour, and each kid's stars are joined in order —
 * so the week draws a shape. Calm on purpose: only stars that are new since
 * the last visit twinkle in, once.
 */
export const Constellation = memo(function Constellation({
  days,
}: {
  days: SkyDay[];
}) {
  const { tokens } = useTheme();
  const [width, setWidth] = useState(0);
  const total = days.reduce((sum, day) => sum + day.stars.length, 0);
  const colW = width > 0 ? (width - SIDE * 2) / days.length : 0;
  const floor = HEIGHT - LABELS - STAR;

  const placed = days.flatMap((day, d) =>
    day.stars.slice(0, PER_DAY).map((star, i) => ({
      ...star,
      x: SIDE + colW * (d + 0.5) + jitter(star.id),
      y: floor - i * STEP - (d % 2) * 6,
    })),
  );
  const lines = new Map<string, string>();
  for (const star of placed) {
    lines.set(
      star.color,
      `${lines.get(star.color) ?? ""} ${star.x.toFixed(1)},${star.y.toFixed(1)}`,
    );
  }
  let newIndex = 0;

  return (
    <View
      className="overflow-hidden rounded-large bg-surface"
      style={{ height: HEIGHT }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessible
      accessibilityLabel={`This week's sky: ${total} ${total === 1 ? "star" : "stars"}.`}
    >
      {width > 0 ? (
        <>
          <Svg width={width} height={HEIGHT} style={{ position: "absolute" }}>
            {/* today's column glows a little */}
            {days.map((day, d) =>
              day.isToday ? (
                <Path
                  key={day.key}
                  d={`M${SIDE + colW * d + 4} 10 H${SIDE + colW * (d + 1) - 4} V${HEIGHT - 6} H${SIDE + colW * d + 4} Z`}
                  fill={tokens.nightRaised}
                  opacity={0.45}
                />
              ) : null,
            )}
            {/* faint background stars */}
            {[0.12, 0.33, 0.58, 0.81, 0.93].map((fx, i) => (
              <Circle
                key={fx}
                cx={width * fx}
                cy={18 + ((i * 37) % 70)}
                r={1}
                fill={tokens.inkMuted}
                opacity={0.5}
              />
            ))}
            {[...lines.entries()].map(([color, points]) => (
              <Polyline
                key={color}
                points={points.trim()}
                stroke={color}
                strokeWidth={1.5}
                strokeOpacity={0.45}
                strokeLinejoin="round"
                fill="none"
              />
            ))}
            {placed
              .filter((star) => !star.isNew)
              .map((star) => (
                <Path
                  key={star.id}
                  d={starPath(star.x, star.y, STAR / 2)}
                  fill={star.color}
                  stroke={tokens.night}
                  strokeWidth={1}
                />
              ))}
          </Svg>

          {placed
            .filter((star) => star.isNew)
            .map((star) => (
              <NewStar
                key={star.id}
                x={star.x}
                y={star.y}
                color={star.color}
                outline={tokens.night}
                delay={300 + newIndex++ * 140}
              />
            ))}

          {days.map((day, d) =>
            day.stars.length > PER_DAY ? (
              <AppText
                key={`more-${day.key}`}
                variant="caption"
                color="ink-muted"
                style={{
                  position: "absolute",
                  left: SIDE + colW * d,
                  width: colW,
                  top: floor - PER_DAY * STEP - 10,
                  textAlign: "center",
                  fontSize: 11,
                }}
              >
                +{day.stars.length - PER_DAY}
              </AppText>
            ) : null,
          )}

          <View
            style={{
              position: "absolute",
              left: SIDE,
              right: SIDE,
              bottom: 6,
              flexDirection: "row",
            }}
          >
            {days.map((day) => (
              <AppText
                key={day.key}
                variant="caption"
                color={day.isToday ? "primary" : "ink-muted"}
                className={day.isToday ? "font-body-heavy" : ""}
                style={{ flex: 1, textAlign: "center" }}
              >
                {day.label}
              </AppText>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
});

/** A star that's new since the last visit: it grows in and twinkles once. */
function NewStar({
  x,
  y,
  color,
  outline,
  delay,
}: {
  x: number;
  y: number;
  color: string;
  outline: string;
  delay: number;
}) {
  const t = useEntrance({ duration: 700, delay });
  const style = useAnimatedStyle(() => {
    const p = t.get();
    return {
      opacity: interpolate(p, [0, 0.3, 1], [0, 1, 1]),
      transform: [
        { scale: interpolate(p, [0, 0.55, 1], [0.6, 1.35, 1]) },
        { rotate: `${interpolate(p, [0, 1], [-40, 0])}deg` },
      ],
    };
  });
  const size = STAR + 4;
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: x - size / 2,
          top: y - size / 2,
          width: size,
          height: size,
        },
        style,
      ]}
    >
      <Svg width={size} height={size}>
        <Path
          d={starPath(size / 2, size / 2, STAR / 2)}
          fill={color}
          stroke={outline}
          strokeWidth={1}
        />
      </Svg>
    </Animated.View>
  );
}
