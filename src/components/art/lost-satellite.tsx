import { View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Circle, G, Line, Path, Rect } from "react-native-svg";

import { useTheme } from "@/design-system/theme";

import { useLoop } from "./motion";

/**
 * A little satellite that has lost its link home: it drifts and tilts, and
 * its signal beam blinks out partway down. Used when a device isn't connected
 * (no access, pairing needs redoing).
 */
export function LostSatellite({ size = 200 }: { size?: number }) {
  const { tokens } = useTheme();
  const drift = useLoop({ duration: 5200, reverse: true, rest: 0.5 });
  const blink = useLoop({ duration: 1600, reverse: true, rest: 1 });

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(drift.get(), [0, 1], [-5, 5]) },
      { rotate: `${interpolate(drift.get(), [0, 1], [-7, 5])}deg` },
    ],
  }));
  const beamStyle = useAnimatedStyle(() => ({
    opacity: interpolate(blink.get(), [0, 1], [0.25, 1]),
  }));

  const s = size / 200;
  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={{ width: size, height: size }}
    >
      <Animated.View
        style={[{ position: "absolute", left: 0, top: 0 }, beamStyle]}
      >
        <Svg width={size} height={size} viewBox="0 0 200 200">
          <Line
            x1={92}
            y1={92}
            x2={58}
            y2={132}
            stroke={tokens.accent}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray="2 9"
          />
          <G stroke={tokens.pink} strokeWidth={4} strokeLinecap="round">
            <Line x1={40} y1={146} x2={52} y2={158} />
            <Line x1={52} y1={146} x2={40} y2={158} />
          </G>
        </Svg>
      </Animated.View>
      <Animated.View
        style={[
          {
            position: "absolute",
            left: 0,
            top: 0,
            width: size,
            height: size,
            transformOrigin: `${110 * s}px ${78 * s}px`,
          },
          bodyStyle,
        ]}
      >
        <Svg width={size} height={size} viewBox="0 0 200 200">
          {/* Solar panels */}
          <G>
            <Rect
              x={30}
              y={64}
              width={52}
              height={28}
              rx={4}
              fill={tokens.info}
            />
            <Rect
              x={138}
              y={64}
              width={52}
              height={28}
              rx={4}
              fill={tokens.info}
            />
            <Path
              d="M47 64v28M64 64v28M30 78h52M155 64v28M172 64v28M138 78h52"
              stroke={tokens.night}
              strokeWidth={2}
              opacity={0.5}
            />
            <Rect x={82} y={76} width={8} height={4} fill={tokens.inkMuted} />
            <Rect x={130} y={76} width={8} height={4} fill={tokens.inkMuted} />
          </G>
          {/* Body */}
          <Rect
            x={90}
            y={58}
            width={40}
            height={40}
            rx={10}
            fill={tokens.star}
          />
          <Circle cx={110} cy={78} r={8} fill={tokens.accent} />
          <Circle cx={112} cy={76} r={2.5} fill={tokens.star} />
          {/* Dish */}
          <Path d="M96 98 q-10 14 4 22 q8-12 -4-22z" fill={tokens.gold} />
          <Line
            x1={110}
            y1={58}
            x2={118}
            y2={42}
            stroke={tokens.inkMuted}
            strokeWidth={3}
            strokeLinecap="round"
          />
          <Circle cx={119} cy={40} r={4} fill={tokens.pink} />
        </Svg>
      </Animated.View>
    </View>
  );
}
