import { View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";

import { Avatar, childAvatarTone } from "@/components/ui/avatar";
import { useTheme } from "@/design-system/theme";

import { Easings, useLoop } from "./motion";

const VIEW_W = 320;
const VIEW_H = 170;

// The star's flight: out of the chimney, over the top, into the phone.
const P0 = { x: 108, y: 44 };
const P1 = { x: 190, y: -10 };
const P2 = { x: 246, y: 78 };

/**
 * Linking a kid's phone, for Parents: home on the left puffs a little star up
 * the chimney, it arcs across and lands on the kid's phone, whose screen
 * lights up with their face. One slow loop; reduced motion rests with the
 * star mid-flight and the phone lit.
 */
export function PhoneLinkScene({
  width = VIEW_W,
  height = VIEW_H,
  name,
}: {
  width?: number;
  height?: number;
  /** The kid whose phone this is; their avatar sits on the screen. */
  name: string;
}) {
  const { tokens } = useTheme();
  const flight = useLoop({
    duration: 3200,
    easing: Easings.inOut,
    rest: 0.55,
  });
  const smoke = useLoop({ duration: 2600, easing: Easings.linear, rest: 0.3 });
  const scale = Math.min(width / VIEW_W, height / VIEW_H);

  const starStyle = useAnimatedStyle(() => {
    // Fly for the first 70% of the loop, then rest while the phone glows.
    const t = Math.min(1, flight.get() / 0.7);
    const u = 1 - t;
    const x = u * u * P0.x + 2 * u * t * P1.x + t * t * P2.x;
    const y = u * u * P0.y + 2 * u * t * P1.y + t * t * P2.y;
    return {
      opacity: interpolate(flight.get(), [0, 0.06, 0.66, 0.74], [0, 1, 1, 0]),
      transform: [
        { translateX: x * scale - 9 },
        { translateY: y * scale - 9 },
        { rotate: `${t * 300}deg` },
        { scale: interpolate(t, [0, 0.5, 1], [0.7, 1.1, 0.8]) },
      ],
    };
  });

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      flight.get(),
      [0, 0.68, 0.76, 0.95, 1],
      [0.15, 0.15, 1, 0.6, 0.15],
    ),
  }));

  const puff = (offset: number) => {
    "worklet";
    const t = (smoke.get() + offset) % 1;
    return {
      opacity: interpolate(t, [0, 0.2, 1], [0, 0.7, 0]),
      transform: [
        { translateX: (74 + t * 10) * scale },
        { translateY: (38 - t * 30) * scale },
        { scale: 0.6 + t * 0.8 },
      ],
    };
  };
  const puffA = useAnimatedStyle(() => puff(0));
  const puffB = useAnimatedStyle(() => puff(0.5));

  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={{ width: VIEW_W * scale, height: VIEW_H * scale }}
    >
      <Svg
        width={VIEW_W * scale}
        height={VIEW_H * scale}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      >
        {/* Ground */}
        <Path
          d="M16 150 Q160 138 304 150"
          stroke={tokens.line}
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
        />

        {/* The flight path, faint */}
        <Path
          d={`M${P0.x} ${P0.y} Q${P1.x} ${P1.y} ${P2.x} ${P2.y}`}
          stroke={tokens.reward}
          strokeWidth={3}
          strokeDasharray="2 9"
          strokeLinecap="round"
          fill="none"
          opacity={0.9}
        />

        {/* Home */}
        <G>
          <Rect x={72} y={34} width={14} height={26} rx={3} fill={tokens.ink} />
          <Path
            d="M34 86 L90 40 L146 86 Z"
            fill={tokens.urgency}
            stroke={tokens.ink}
            strokeWidth={4}
            strokeLinejoin="round"
          />
          <Rect
            x={46}
            y={82}
            width={88}
            height={66}
            rx={10}
            fill={tokens.reward}
            stroke={tokens.ink}
            strokeWidth={4}
          />
          <Rect
            x={80}
            y={110}
            width={22}
            height={38}
            rx={6}
            fill={tokens.ink}
          />
          <Circle cx={97} cy={130} r={2.5} fill={tokens.reward} />
          <Rect
            x={56}
            y={96}
            width={18}
            height={18}
            rx={4}
            fill={tokens.surface}
            stroke={tokens.ink}
            strokeWidth={3}
          />
          <Rect
            x={108}
            y={96}
            width={18}
            height={18}
            rx={4}
            fill={tokens.surface}
            stroke={tokens.ink}
            strokeWidth={3}
          />
        </G>

        {/* Kid's phone */}
        <G>
          <Rect
            x={222}
            y={62}
            width={52}
            height={88}
            rx={12}
            fill={tokens.ink}
          />
          <Rect
            x={227}
            y={70}
            width={42}
            height={68}
            rx={7}
            fill={tokens.surface}
          />
          <Rect
            x={240}
            y={65}
            width={16}
            height={3}
            rx={1.5}
            fill={tokens.line}
          />
          <Circle cx={248} cy={144} r={2.5} fill={tokens.line} />
        </G>
      </Svg>

      {/* Phone screen glow when the star lands */}
      <Animated.View
        style={[
          {
            position: "absolute",
            left: 219 * scale,
            top: 59 * scale,
            width: 58 * scale,
            height: 94 * scale,
            borderRadius: 15 * scale,
            borderWidth: 3,
            borderColor: tokens.reward,
          },
          glowStyle,
        ]}
      />
      <View
        style={{
          position: "absolute",
          left: 233 * scale,
          top: 83 * scale,
        }}
      >
        <Avatar
          tone={childAvatarTone(name)}
          className="rounded-full"
          fallbackLabel={name}
          size={30 * scale}
        />
      </View>

      {/* Chimney smoke */}
      {[puffA, puffB].map((style, i) => (
        <Animated.View
          key={i}
          style={[
            {
              position: "absolute",
              left: 0,
              top: 0,
              width: 12 * scale,
              height: 12 * scale,
              borderRadius: 6 * scale,
              backgroundColor: tokens.line,
            },
            style,
          ]}
        />
      ))}

      {/* The travelling star */}
      <Animated.View
        style={[{ position: "absolute", left: 0, top: 0 }, starStyle]}
      >
        <Svg width={18} height={18} viewBox="0 0 24 24">
          <Path
            d="M12 2 L14.9 8.6 L22 9.3 L16.6 14 L18.2 21 L12 17.3 L5.8 21 L7.4 14 L2 9.3 L9.1 8.6 Z"
            fill={tokens.reward}
            stroke={tokens.ink}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}
