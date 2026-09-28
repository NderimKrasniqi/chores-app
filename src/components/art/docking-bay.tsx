import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { useTheme } from "@/design-system/theme";

import { ChoreIcon } from "./chore-art";
import { Easings } from "./motion";

const W = 96;
const H = 64;

/**
 * Your one bonus slot as a docking bay: two clamps and a row of guide
 * lights. Empty, the lights wait (dimmed); with a quest docked, a little
 * ship sits in the clamps carrying the chore's icon. `leaving` undocks it —
 * the ship slides out of the bay (dropping a quest costs a key, so the
 * cost is seen, not just read).
 */
export function DockingBay({
  size = 84,
  title,
  leaving = false,
}: {
  size?: number;
  /** The docked quest's title; empty bay without it. */
  title?: string;
  leaving?: boolean;
}) {
  const { tokens } = useTheme();
  const reducedMotion = useReducedMotion();
  const scale = size / W;
  const docked = title !== undefined;
  const light = docked && !leaving ? tokens.primary : tokens.nightRaised;
  const out = useSharedValue(0);

  useEffect(() => {
    out.set(
      withTiming(leaving ? 1 : 0, {
        duration: reducedMotion ? 0 : leaving ? 520 : 200,
        easing: Easings.inOut,
      }),
    );
  }, [leaving, out, reducedMotion]);

  const shipStyle = useAnimatedStyle(() => ({
    opacity: interpolate(out.get(), [0, 0.7, 1], [1, 1, 0]),
    transform: [{ translateX: interpolate(out.get(), [0, 1], [0, size]) }],
  }));

  return (
    <View
      style={{ width: size, height: H * scale }}
      pointerEvents="none"
      accessible={false}
    >
      <Svg
        width={size}
        height={H * scale}
        viewBox={`0 0 ${W} ${H}`}
        style={{ position: "absolute" }}
      >
        {/* bay floor */}
        <Rect
          x={6}
          y={50}
          width={84}
          height={6}
          rx={3}
          fill={tokens.nightRaised}
        />
        {[18, 34, 50, 66, 80].map((x) => (
          <Circle key={x} cx={x} cy={53} r={1.8} fill={light} />
        ))}
        {/* clamps */}
        <Path
          d="M8 50 L8 22 Q8 16 14 16 L20 16"
          stroke={tokens.inkMuted}
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M88 50 L88 22 Q88 16 82 16 L76 16"
          stroke={tokens.inkMuted}
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
        />
        {docked ? null : (
          <Path
            d="M24 36 L72 36"
            stroke={tokens.nightRaised}
            strokeWidth={3}
            strokeDasharray="4 5"
            strokeLinecap="round"
          />
        )}
      </Svg>

      {docked ? (
        <Animated.View
          style={[
            { position: "absolute", width: size, height: H * scale },
            shipStyle,
          ]}
        >
          <Svg
            width={size}
            height={H * scale}
            viewBox={`0 0 ${W} ${H}`}
            style={{ position: "absolute" }}
          >
            {/* the ship, side on */}
            <Path
              d="M20 26 L66 26 Q82 26 86 36 Q82 46 66 46 L20 46 Z"
              fill={tokens.star}
              stroke={tokens.night}
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
            <Path d="M20 26 L12 20 L14 30 Z" fill={tokens.pink} />
            <Path d="M20 46 L12 52 L14 42 Z" fill={tokens.pink} />
            <Path d="M66 26 Q82 26 86 36 Q82 46 66 46 Z" fill={tokens.accent} />
          </Svg>
          <View
            style={{
              position: "absolute",
              left: 30 * scale,
              top: 27 * scale,
              width: 18 * scale,
              height: 18 * scale,
              borderRadius: 9 * scale,
              overflow: "hidden",
            }}
          >
            <ChoreIcon title={title} size={18 * scale} />
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}
