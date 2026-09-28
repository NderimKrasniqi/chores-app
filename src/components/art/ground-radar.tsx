import { View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";

import { AppText } from "@/design-system/text";
import { useTheme } from "@/design-system/theme";

import { useEntrance } from "./motion";

export type RadarStatus = "on_track" | "waiting" | "attention" | "idle";

export type RadarCraft = {
  id: string;
  name: string;
  color: string;
  /** 0 = nothing done today … 1 = today's quests all approved. */
  progress: number;
  status: RadarStatus;
};

const RINGS = [1, 0.68, 0.36];

/**
 * Ground Control's radar: every kid is a small craft, spaced round the dish.
 * The further through today's quests they are, the closer to home (the
 * centre) they sit; the light on each says what it needs — green on track,
 * amber waiting on a Parent, pink needs attention (a redo, or a missed
 * quest). `sweep` plays one pass of the scanner, for the "all clear" look;
 * otherwise the radar is still — this screen is opened all day.
 */
export function GroundRadar({
  crafts,
  size = 180,
  sweep = false,
}: {
  crafts: RadarCraft[];
  size?: number;
  sweep?: boolean;
}) {
  const { tokens } = useTheme();
  const c = size / 2;
  const outer = c - 14;
  const t = useEntrance({ duration: sweep ? 1600 : 1, delay: 200 });
  const sweepStyle = useAnimatedStyle(() => ({
    opacity: sweep ? interpolate(t.get(), [0, 0.1, 0.85, 1], [0, 1, 1, 0]) : 0,
    transform: [{ rotate: `${interpolate(t.get(), [0, 1], [0, 360])}deg` }],
  }));

  const light = (status: RadarStatus) =>
    status === "attention"
      ? tokens.pink
      : status === "waiting"
        ? tokens.gold
        : status === "on_track"
          ? tokens.primary
          : tokens.inkFaint;

  const count = Math.max(1, crafts.length);
  const placed = crafts.slice(0, 6).map((craft, i) => {
    const angle = -Math.PI / 2 + (i / count) * Math.PI * 2 + 0.35;
    const r = outer * (1 - Math.max(0, Math.min(1, craft.progress)) * 0.72);
    return {
      ...craft,
      x: c + Math.cos(angle) * r,
      y: c + Math.sin(angle) * r,
    };
  });

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityLabel={crafts
        .map(
          (craft) =>
            `${craft.name}: ${Math.round(craft.progress * 100)}% of today's quests done${
              craft.status === "waiting"
                ? ", waiting on you"
                : craft.status === "attention"
                  ? ", needs attention"
                  : ""
            }`,
        )
        .join(". ")}
    >
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Defs>
          <LinearGradient id="radar-dish" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={tokens.ink} stopOpacity={0.06} />
            <Stop offset="1" stopColor={tokens.ink} stopOpacity={0.12} />
          </LinearGradient>
        </Defs>
        <Circle cx={c} cy={c} r={outer + 6} fill="url(#radar-dish)" />
        {RINGS.map((ring) => (
          <Circle
            key={ring}
            cx={c}
            cy={c}
            r={outer * ring}
            stroke={tokens.ink}
            strokeOpacity={0.14}
            strokeWidth={1.5}
            strokeDasharray={ring === 1 ? undefined : "3 5"}
            fill="none"
          />
        ))}
        <Path
          d={`M${c} ${c - outer} V${c + outer} M${c - outer} ${c} H${c + outer}`}
          stroke={tokens.ink}
          strokeOpacity={0.08}
          strokeWidth={1}
        />
        {/* home base: all quests done */}
        <Circle cx={c} cy={c} r={9} fill={tokens.ink} />
        <Path
          d={`M${c - 4.5} ${c + 1} L${c} ${c - 4} L${c + 4.5} ${c + 1} V${c + 4.5} H${c - 4.5} Z`}
          fill={tokens.surface}
        />
        {placed.map((craft) => (
          <G key={craft.id}>
            <Circle cx={craft.x} cy={craft.y} r={11} fill={craft.color} />
            <Circle
              cx={craft.x}
              cy={craft.y}
              r={11}
              fill="none"
              stroke={tokens.ink}
              strokeWidth={2}
            />
            <Circle
              cx={craft.x + 9}
              cy={craft.y - 9}
              r={4.5}
              fill={light(craft.status)}
              stroke={tokens.surface}
              strokeWidth={1.5}
            />
          </G>
        ))}
      </Svg>

      {placed.map((craft) => (
        <View
          key={craft.id}
          pointerEvents="none"
          style={{
            position: "absolute",
            left: craft.x - 11,
            top: craft.y - 11,
            width: 22,
            height: 22,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AppText
            className="font-display"
            style={{ fontSize: 11, lineHeight: 14, color: tokens.ink }}
          >
            {craft.name.charAt(0).toUpperCase()}
          </AppText>
        </View>
      ))}

      {sweep ? (
        <Animated.View
          pointerEvents="none"
          style={[
            { position: "absolute", width: size, height: size },
            sweepStyle,
          ]}
        >
          <Svg width={size} height={size}>
            <Path
              d={`M${c} ${c} L${c} ${c - outer} A${outer} ${outer} 0 0 1 ${c + outer * Math.sin(0.6)} ${c - outer * Math.cos(0.6)} Z`}
              fill={tokens.primary}
              opacity={0.28}
            />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}
