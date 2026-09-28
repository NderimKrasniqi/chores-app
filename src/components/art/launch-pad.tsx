import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

import { useTheme } from "@/design-system/theme";

import { ChoreIcon } from "./chore-art";
import { Easings } from "./motion";

export type PadState = "empty" | "ready" | "locked" | "submitted" | "redo";

const V = 100;

/**
 * Your one mission slot as a launch pad. The ring around it is the abort
 * window: it fills as the lock gets closer, and once it closes (pink, with a
 * lock) the mission is committed. Empty, the pad waits with a dashed
 * outline. `leaving` powers the rocket down and wheels it off (an abort
 * spends a pass); `snap` plays the ring closing once, for the first look
 * after a lock.
 */
export function LaunchPad({
  size = 72,
  state,
  title,
  abortUsed = 0,
  leaving = false,
  snap = false,
}: {
  size?: number;
  state: PadState;
  /** The mission's title, for the icon in the rocket's porthole. */
  title?: string;
  /** 0 = just launched … 1 = the lock point (abort window used up). */
  abortUsed?: number;
  leaving?: boolean;
  snap?: boolean;
}) {
  const { tokens } = useTheme();
  const reducedMotion = useReducedMotion();
  const out = useSharedValue(0);
  const ring = useSharedValue(1);
  const s = size / V;
  const locked =
    state === "locked" || state === "submitted" || state === "redo";

  useEffect(() => {
    out.set(
      withTiming(leaving ? 1 : 0, {
        duration: reducedMotion ? 0 : leaving ? 520 : 200,
        easing: Easings.inOut,
      }),
    );
  }, [leaving, out, reducedMotion]);

  useEffect(() => {
    if (!snap || reducedMotion) return;
    ring.set(
      withSequence(
        withTiming(1.12, { duration: 160, easing: Easings.out }),
        withSpring(1, { duration: 450, dampingRatio: 0.5 }),
      ),
    );
  }, [reducedMotion, ring, snap]);

  const rocketStyle = useAnimatedStyle(() => ({
    opacity: interpolate(out.get(), [0, 0.7, 1], [1, 1, 0]),
    transform: [
      { translateY: interpolate(out.get(), [0, 1], [0, size * 0.25]) },
      { scale: interpolate(out.get(), [0, 1], [1, 0.9]) },
    ],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ring.get() }],
  }));

  // Abort-window ring: an arc from the top, clockwise.
  const r = 44;
  const c = V / 2;
  const used = locked ? 1 : Math.max(0, Math.min(1, abortUsed));
  const angle = -Math.PI / 2 + used * Math.PI * 2 * 0.999;
  const arc = `M${c} ${c - r} A${r} ${r} 0 ${used > 0.5 ? 1 : 0} 1 ${(c + Math.cos(angle) * r).toFixed(1)} ${(c + Math.sin(angle) * r).toFixed(1)}`;

  return (
    <View
      style={{ width: size, height: size }}
      pointerEvents="none"
      accessible={false}
    >
      <Animated.View
        style={[{ position: "absolute", width: size, height: size }, ringStyle]}
      >
        <Svg width={size} height={size} viewBox={`0 0 ${V} ${V}`}>
          <Circle
            cx={c}
            cy={c}
            r={r}
            stroke={tokens.nightRaised}
            strokeWidth={5}
            strokeDasharray={state === "empty" ? "6 7" : undefined}
            fill="none"
          />
          {state !== "empty" && used > 0 ? (
            <Path
              d={arc}
              stroke={locked ? tokens.pink : tokens.accent}
              strokeWidth={5}
              strokeLinecap="round"
              fill="none"
            />
          ) : null}
          {locked ? (
            <>
              <Rect
                x={c - 7}
                y={c - r - 6}
                width={14}
                height={11}
                rx={2.5}
                fill={tokens.pink}
                stroke={tokens.night}
                strokeWidth={2}
              />
              <Path
                d={`M${c - 4} ${c - r - 6} V${c - r - 9} A4 4 0 0 1 ${c + 4} ${c - r - 9} V${c - r - 6}`}
                stroke={tokens.pink}
                strokeWidth={2.2}
                fill="none"
              />
            </>
          ) : null}
        </Svg>
      </Animated.View>

      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${V} ${V}`}
        style={{ position: "absolute" }}
      >
        {/* the pad */}
        <Path d="M28 76 L72 76 L66 70 L34 70 Z" fill={tokens.inkMuted} />
        <Rect
          x={24}
          y={76}
          width={52}
          height={4}
          rx={2}
          fill={tokens.nightRaised}
        />
        {state === "empty" ? (
          <Path
            d="M42 68 L42 36 Q50 22 58 36 L58 68"
            stroke={tokens.nightRaised}
            strokeWidth={2.5}
            strokeDasharray="4 4"
            fill="none"
          />
        ) : null}
        {/* gantry */}
        <Line
          x1={30}
          y1={70}
          x2={30}
          y2={34}
          stroke={tokens.nightRaised}
          strokeWidth={3}
        />
        <Line
          x1={30}
          y1={44}
          x2={40}
          y2={44}
          stroke={tokens.nightRaised}
          strokeWidth={2}
        />
        {state === "redo" ? (
          <Circle cx={30} cy={31} r={4} fill={tokens.pink} />
        ) : null}
        {state === "submitted" ? (
          <Path
            d="M66 40 A8 8 0 0 1 76 30"
            stroke={tokens.inkMuted}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
          />
        ) : null}
      </Svg>

      {state !== "empty" ? (
        <Animated.View
          style={[
            { position: "absolute", width: size, height: size },
            rocketStyle,
          ]}
        >
          <Svg
            width={size}
            height={size}
            viewBox={`0 0 ${V} ${V}`}
            style={{ position: "absolute" }}
          >
            <Path
              d="M50 20 C60 30 60 56 57 68 L43 68 C40 56 40 30 50 20 Z"
              fill={tokens.star}
              stroke={tokens.night}
              strokeWidth={2.5}
            />
            <Path d="M43 56 L35 68 L43 67 Z" fill={tokens.pink} />
            <Path d="M57 56 L65 68 L57 67 Z" fill={tokens.pink} />
            <Circle
              cx={50}
              cy={42}
              r={7.5}
              fill={tokens.nightRaised}
              stroke={tokens.night}
              strokeWidth={2}
            />
          </Svg>
          {title ? (
            <View
              style={{
                position: "absolute",
                left: (50 - 6) * s,
                top: (42 - 6) * s,
                width: 12 * s,
                height: 12 * s,
                borderRadius: 6 * s,
                overflow: "hidden",
              }}
            >
              <ChoreIcon title={title} size={12 * s} />
            </View>
          ) : null}
        </Animated.View>
      ) : null}
    </View>
  );
}
