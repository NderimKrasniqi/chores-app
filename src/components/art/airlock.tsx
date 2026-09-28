import { View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Circle, Rect } from "react-native-svg";

import { useTheme } from "@/design-system/theme";

import { useEntrance } from "./motion";

/**
 * The Extras gate as a station airlock: two doors that meet in the middle.
 * Closed with a pink light until the Unlock Chore is approved; open with a
 * green light after. `opening` slides the doors apart once — the first look
 * after an unlock — otherwise it's a still picture.
 */
export function Airlock({
  size = 56,
  open,
  opening = false,
}: {
  size?: number;
  open: boolean;
  opening?: boolean;
}) {
  const { tokens } = useTheme();
  const t = useEntrance({ duration: 700, delay: 250 });
  const door = size * 0.3;
  const gap = open ? door : 0;

  const leftStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: opening ? interpolate(t.get(), [0, 1], [0, -gap]) : -gap },
    ],
  }));
  const rightStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: opening ? interpolate(t.get(), [0, 1], [0, gap]) : gap },
    ],
  }));

  const inner = size * 0.64;
  const offset = (size - inner) / 2;

  return (
    <View
      style={{ width: size, height: size }}
      pointerEvents="none"
      accessible={false}
    >
      {/* the view through the hatch: stars when it's open */}
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2}
          fill={tokens.nightRaised}
        />
        <Circle cx={size / 2} cy={size / 2} r={inner / 2} fill={tokens.night} />
        <Circle cx={size * 0.42} cy={size * 0.4} r={1.4} fill={tokens.star} />
        <Circle cx={size * 0.58} cy={size * 0.6} r={1.1} fill={tokens.gold} />
        <Circle cx={size * 0.52} cy={size * 0.34} r={0.9} fill={tokens.star} />
      </Svg>
      <View
        style={{
          position: "absolute",
          left: offset,
          top: offset,
          width: inner,
          height: inner,
          borderRadius: inner / 2,
          overflow: "hidden",
        }}
      >
        <Animated.View
          style={[
            {
              position: "absolute",
              left: 0,
              width: inner / 2,
              height: inner,
              backgroundColor: tokens.inkMuted,
              borderRightWidth: 1.5,
              borderColor: tokens.night,
            },
            leftStyle,
          ]}
        />
        <Animated.View
          style={[
            {
              position: "absolute",
              right: 0,
              width: inner / 2,
              height: inner,
              backgroundColor: tokens.inkMuted,
              borderLeftWidth: 1.5,
              borderColor: tokens.night,
            },
            rightStyle,
          ]}
        />
      </View>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={inner / 2 + 1}
          stroke={tokens.night}
          strokeWidth={3}
          fill="none"
        />
        {/* bolts */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const a = (i / 6) * Math.PI * 2;
          const r = (size + inner) / 4;
          return (
            <Circle
              key={i}
              cx={size / 2 + Math.cos(a) * r}
              cy={size / 2 + Math.sin(a) * r}
              r={1.6}
              fill={tokens.night}
              opacity={0.6}
            />
          );
        })}
        <Rect
          x={size / 2 - 5}
          y={1}
          width={10}
          height={5}
          rx={2.5}
          fill={open ? tokens.primary : tokens.pink}
        />
      </Svg>
    </View>
  );
}
