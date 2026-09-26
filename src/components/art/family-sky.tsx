import { memo, useMemo, useState } from "react";
import { View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Circle, Path, Polyline } from "react-native-svg";

import { useTheme } from "@/design-system/theme";

import { seeded, useLoop } from "./motion";

export type SkyStar = {
  id: string;
  ownerId: string;
  approvedAt: number;
  valueSek: number;
  color: string;
};

const HEIGHT = 200;
const PAD = 22;
const BORDER = 2;
/** Box around the moon (from the top-right corner) that stars avoid. */
const MOON_CLEAR = 64;

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) || 1;
}

function starPath(size: number) {
  const c = size / 2;
  const outer = size / 2;
  const inner = outer * 0.45;
  let d = "";
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    d += `${i === 0 ? "M" : "L"}${c + Math.cos(a) * r} ${c + Math.sin(a) * r}`;
  }
  return `${d}Z`;
}

/**
 * The household's recent wins as a night sky: every approved chore lights a star in
 * its owner's colour, bigger for bigger rewards, and each person's stars join
 * into their own constellation. Calm on purpose — this tab is visited often:
 * slow twinkles, one soft pulse on the newest star.
 */
export const FamilySky = memo(function FamilySky({
  stars,
  owners,
}: {
  stars: SkyStar[];
  /** Owner ids in band order, left to right. */
  owners: string[];
}) {
  const { tokens } = useTheme();
  const [width, setWidth] = useState(0);

  const placed = useMemo(() => {
    if (width === 0) return [];
    const bands = Math.max(1, owners.length);
    const bandWidth = width / bands;
    return stars.map((star) => {
      const random = seeded(hash(star.id));
      const band = Math.max(0, owners.indexOf(star.ownerId));
      const size = 12 + (Math.min(star.valueSek, 60) / 60) * 10;
      const placedStar = {
        ...star,
        size,
        x: band * bandWidth + PAD + random() * Math.max(1, bandWidth - PAD * 2),
        y: PAD + random() * (HEIGHT - PAD * 2),
        // Stable per star, so a new approval doesn't restart every twinkle.
        delay: hash(star.id) % 3000,
      };
      // Keep clear of the moon in the top-right corner.
      if (placedStar.x > width - MOON_CLEAR && placedStar.y < MOON_CLEAR) {
        placedStar.y = MOON_CLEAR + random() * (HEIGHT - MOON_CLEAR - PAD);
      }
      return placedStar;
    });
  }, [owners, stars, width]);

  const dust = useMemo(() => {
    const random = seeded(7);
    return Array.from({ length: 26 }, () => ({
      x: random(),
      y: random(),
      r: 0.6 + random() * 1.1,
    }));
  }, []);

  const newestId = stars.reduce<SkyStar | null>(
    (newest, star) =>
      !newest || star.approvedAt > newest.approvedAt ? star : newest,
    null,
  )?.id;

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      onLayout={(event) =>
        setWidth(event.nativeEvent.layout.width - BORDER * 2)
      }
      className="overflow-hidden rounded-large border-2 border-nightRaised bg-night"
      style={{ height: HEIGHT + BORDER * 2 }}
    >
      {width > 0 ? (
        <>
          <Svg width={width} height={HEIGHT} style={{ position: "absolute" }}>
            {dust.map((d, i) => (
              <Circle
                key={i}
                cx={d.x * width}
                cy={d.y * HEIGHT}
                r={d.r}
                fill={tokens.star}
                opacity={0.35}
              />
            ))}
            {/* A crescent moon in the corner. */}
            <Circle
              cx={width - 34}
              cy={32}
              r={16}
              fill={tokens.star}
              opacity={0.9}
            />
            <Circle cx={width - 27} cy={27} r={14} fill={tokens.night} />
            {owners.map((owner) => {
              const mine = placed
                .filter((star) => star.ownerId === owner)
                .sort((a, b) => a.approvedAt - b.approvedAt);
              if (mine.length < 2) return null;
              return (
                <Polyline
                  key={owner}
                  points={mine.map((star) => `${star.x},${star.y}`).join(" ")}
                  fill="none"
                  stroke={mine[0].color}
                  strokeOpacity={0.45}
                  strokeWidth={1.5}
                  strokeDasharray="3 4"
                />
              );
            })}
          </Svg>
          {placed.map((star) => (
            <TwinklingStar
              key={star.id}
              x={star.x}
              y={star.y}
              size={star.size}
              color={star.color}
              delay={star.delay}
              newest={star.id === newestId}
            />
          ))}
        </>
      ) : null}
    </View>
  );
});

function TwinklingStar({
  x,
  y,
  size,
  color,
  delay,
  newest,
}: {
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  newest: boolean;
}) {
  const twinkle = useLoop({ duration: 3200, delay, reverse: true, rest: 1 });
  const starStyle = useAnimatedStyle(() => ({
    opacity: interpolate(twinkle.get(), [0, 1], [0.55, 1]),
  }));
  const path = useMemo(() => starPath(size), [size]);

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
      }}
    >
      {newest ? <Halo size={size} color={color} /> : null}
      <Animated.View style={starStyle}>
        <Svg width={size} height={size}>
          <Path d={path} fill={color} />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** Soft ring around the newest star: fades in, grows, fades out. */
function Halo({ size, color }: { size: number; color: string }) {
  const pulse = useLoop({ duration: 2800, rest: 0.15 });
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.get(), [0, 0.15, 1], [0, 0.5, 0]),
    transform: [{ scale: interpolate(pulse.get(), [0, 1], [0.8, 2.2]) }],
  }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: color,
        },
        style,
      ]}
    />
  );
}
