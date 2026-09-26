import { View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";

import { useTheme } from "@/design-system/theme";

import { Easings, useLoop } from "./motion";

/**
 * Joining a family as docking: the family's space station (a home with a
 * ring) floats on the left, this device's little pod bobs on the right, and
 * a docking beam pulses between them. Loops are slow; reduced motion rests.
 */
export function DockingScene({
  width = 320,
  height = 180,
}: {
  width?: number;
  height?: number;
}) {
  const { tokens } = useTheme();
  const station = useLoop({ duration: 4800, reverse: true, rest: 0.5 });
  const pod = useLoop({ duration: 3400, reverse: true, rest: 0.5, delay: 600 });
  const beam = useLoop({ duration: 1800, easing: Easings.linear, rest: 0.4 });
  const ring = useLoop({ duration: 14000, easing: Easings.linear });

  const stationStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(station.get(), [0, 1], [-4, 4]) }],
  }));
  const podStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(pod.get(), [0, 1], [5, -5]) },
      { rotate: `${interpolate(pod.get(), [0, 1], [-5, 5])}deg` },
    ],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ring.get() * 360}deg` }],
  }));

  const s = height / 180;
  const beamY = height * 0.52;
  const beamFrom = width * 0.36;
  const beamTo = width * 0.7;

  return (
    <View pointerEvents="none" accessible={false} style={{ width, height }}>
      {/* Docking beam: three chevrons travelling pod-wards. */}
      {[0, 1, 2].map((i) => (
        <BeamChevron
          key={i}
          progress={beam}
          offset={i / 3}
          from={beamFrom}
          to={beamTo}
          y={beamY}
          color={tokens.accent}
        />
      ))}

      <Animated.View
        style={[
          { position: "absolute", left: width * 0.02, top: height * 0.12 },
          stationStyle,
        ]}
      >
        <View style={{ width: 130 * s, height: 130 * s }}>
          <Animated.View
            style={[
              {
                position: "absolute",
                left: 0,
                top: 0,
                width: 130 * s,
                height: 130 * s,
              },
              ringStyle,
            ]}
          >
            <Svg width={130 * s} height={130 * s} viewBox="0 0 130 130">
              <Circle
                cx={65}
                cy={65}
                r={60}
                fill="none"
                stroke={tokens.gold}
                strokeWidth={3}
                strokeDasharray="10 8"
                opacity={0.7}
              />
            </Svg>
          </Animated.View>
          <Svg
            width={130 * s}
            height={130 * s}
            viewBox="0 0 130 130"
            style={{ position: "absolute" }}
          >
            {/* House-shaped station */}
            <Path d="M30 62 L65 32 L100 62 Z" fill={tokens.pink} />
            <Rect
              x={38}
              y={60}
              width={54}
              height={40}
              rx={8}
              fill={tokens.star}
            />
            <Rect
              x={58}
              y={76}
              width={14}
              height={24}
              rx={4}
              fill={tokens.accent}
            />
            <Circle cx={48} cy={74} r={5} fill={tokens.info} />
            <Circle cx={82} cy={74} r={5} fill={tokens.info} />
            {/* Solar wings */}
            <Rect
              x={8}
              y={72}
              width={26}
              height={12}
              rx={3}
              fill={tokens.info}
            />
            <Rect
              x={96}
              y={72}
              width={26}
              height={12}
              rx={3}
              fill={tokens.info}
            />
            <Circle cx={65} cy={24} r={4} fill={tokens.gold} />
          </Svg>
        </View>
      </Animated.View>

      <Animated.View
        style={[
          { position: "absolute", left: width * 0.7, top: height * 0.3 },
          podStyle,
        ]}
      >
        <Svg width={78 * s} height={78 * s} viewBox="0 0 78 78">
          <Ellipse cx={39} cy={40} rx={26} ry={22} fill={tokens.primary} />
          <Ellipse cx={39} cy={34} rx={15} ry={11} fill={tokens.night} />
          <Circle cx={34} cy={31} r={3} fill={tokens.star} />
          <Path d="M16 50 L6 62 L22 56 Z" fill={tokens.primaryShade} />
          <Path d="M62 50 L72 62 L56 56 Z" fill={tokens.primaryShade} />
          <Circle cx={39} cy={64} r={4} fill={tokens.gold} />
        </Svg>
      </Animated.View>
    </View>
  );
}

function BeamChevron({
  progress,
  offset,
  from,
  to,
  y,
  color,
}: {
  progress: ReturnType<typeof useLoop>;
  offset: number;
  from: number;
  to: number;
  y: number;
  color: string;
}) {
  const style = useAnimatedStyle(() => {
    const t = (progress.get() + offset) % 1;
    return {
      opacity: interpolate(t, [0, 0.2, 0.8, 1], [0, 1, 1, 0]),
      transform: [{ translateX: from + (to - from) * t }],
    };
  });
  return (
    <Animated.View
      style={[{ position: "absolute", left: 0, top: y - 9 }, style]}
    >
      <Svg width={14} height={18} viewBox="0 0 14 18">
        <Path
          d="M3 2 L11 9 L3 16"
          fill="none"
          stroke={color}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  );
}
