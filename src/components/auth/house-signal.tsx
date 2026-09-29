import * as Haptics from "expo-haptics";
import { useEffect, useRef } from "react";
import { View } from "react-native";
import Animated, {
  cubicBezier,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Circle, G, Line, Path, Rect } from "react-native-svg";

import { PopIn, useLoop } from "@/components/art";
import { Easings } from "@/components/art/motion";
import { AppText, useTheme } from "@/design-system";

const WIDTH = 280;
const HEIGHT = 172;

/** The dish's feed before tilting, and the point it's tilted around. */
const DISH = { x: 196, y: 38 };
const DISH_PIVOT_Y = 50;
const DISH_TILT = 35;
/** Where the feed ends up once tilted towards the rocket — signals start here. */
const FEED = {
  x: DISH.x + (DISH_PIVOT_Y - DISH.y) * Math.sin((DISH_TILT * Math.PI) / 180),
  y:
    DISH_PIVOT_Y -
    (DISH_PIVOT_Y - DISH.y) * Math.cos((DISH_TILT * Math.PI) / 180),
};

export type HouseLights = {
  /** The round attic window: the parent. Shows their initial once lit. */
  attic: string | null;
  left: boolean;
  right: boolean;
};

/**
 * The family home, drawn like the household-setup house, with a Ground
 * Control dish on the roof. Each part of the form that's filled in turns a
 * window's light on; once everything is in, the dish's light goes green
 * (one light tap). While the account is being made or opened, the dish
 * beams a signal up to the little rocket.
 */
export function HouseSignal({
  lights,
  ready,
  sending,
  scale = 1,
}: {
  lights: HouseLights;
  ready: boolean;
  sending: boolean;
  /** Draws the whole scene smaller; the layout box shrinks with it. */
  scale?: number;
}) {
  const { tokens } = useTheme();
  const wasReady = useRef(ready);

  useEffect(() => {
    if (ready && !wasReady.current) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    wasReady.current = ready;
  }, [ready]);

  return (
    <View
      className="items-center"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ height: HEIGHT * scale }}
    >
      <View
        style={{
          width: WIDTH,
          height: HEIGHT,
          transform: [{ scale }],
          transformOrigin: ["50%", 0, 0],
        }}
      >
        <Svg width={WIDTH} height={HEIGHT}>
          {/* ground */}
          <Rect
            x={30}
            y={162}
            width={220}
            height={8}
            rx={4}
            fill={tokens.infoSoftStrong}
          />
          <Path d="M44 98 L140 28 L236 98 Z" fill={tokens.urgency} />
          <Rect
            x={60}
            y={94}
            width={160}
            height={70}
            rx={10}
            fill={tokens.surface}
          />
          <Rect
            x={126}
            y={122}
            width={28}
            height={42}
            rx={6}
            fill={tokens.reward}
          />
          <Circle cx={148} cy={144} r={2.5} fill={tokens.ink} />

          {/* dish on the roof, tipped towards the rocket */}
          <Line
            x1={196}
            y1={66}
            x2={196}
            y2={50}
            stroke={tokens.ink}
            strokeWidth={4}
            strokeLinecap="round"
          />
          <G rotation={DISH_TILT} origin={`${DISH.x}, ${DISH_PIVOT_Y}`}>
            <Path
              d="M180 46 Q196 66 212 46 Z"
              fill={tokens.surface}
              stroke={tokens.ink}
              strokeWidth={3}
              strokeLinejoin="round"
            />
            <Line
              x1={196}
              y1={52}
              x2={196}
              y2={DISH.y + 2}
              stroke={tokens.ink}
              strokeWidth={2.5}
            />
            <Circle
              cx={196}
              cy={DISH.y}
              r={4}
              fill={ready ? tokens.primary : tokens.surfaceMuted}
              stroke={tokens.ink}
              strokeWidth={2}
            />
          </G>
        </Svg>

        <Window left={76} top={106} lit={lights.left} />
        <Window left={172} top={106} lit={lights.right} />
        <Window
          left={125}
          top={52}
          lit={lights.attic !== null}
          round
          label={lights.attic}
        />

        <Rocket />
        {sending ? <Signal /> : null}
      </View>
    </View>
  );
}

const windowTransition = {
  transitionProperty: "backgroundColor",
  transitionDuration: "200ms",
  transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
} as const;

function Window({
  left,
  top,
  lit,
  round = false,
  label,
}: {
  left: number;
  top: number;
  lit: boolean;
  round?: boolean;
  label?: string | null;
}) {
  const { tokens } = useTheme();
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left,
          top,
          width: round ? 30 : 32,
          height: round ? 30 : 28,
          borderRadius: round ? 15 : 6,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: lit ? tokens.reward : tokens.surfaceMuted,
        },
        windowTransition,
      ]}
    >
      {label ? (
        <PopIn key={label}>
          <AppText variant="label">{label}</AppText>
        </PopIn>
      ) : null}
    </Animated.View>
  );
}

/** A small rocket up and to the right, bobbing gently. */
function Rocket() {
  const { tokens } = useTheme();
  const bob = useLoop({ duration: 2800, reverse: true, rest: 0.5 });
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(bob.get(), [0, 1], [-3, 3]) },
      { rotate: "40deg" },
    ],
  }));
  return (
    <Animated.View
      style={[{ position: "absolute", left: 238, top: 0, width: 26 }, style]}
    >
      <Svg width={26} height={44} viewBox="0 0 26 44">
        <Path d="M13 34 L9 43 L13 40 L17 43 Z" fill={tokens.accent} />
        <Path d="M6 26 L1 34 L7 32 Z" fill={tokens.urgency} />
        <Path d="M20 26 L25 34 L19 32 Z" fill={tokens.urgency} />
        <Path
          d="M13 2 C20 8 21 20 19 34 L7 34 C5 20 6 8 13 2 Z"
          fill={tokens.surface}
          stroke={tokens.ink}
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        <Circle
          cx={13}
          cy={17}
          r={4}
          fill={tokens.info}
          stroke={tokens.ink}
          strokeWidth={2}
        />
      </Svg>
    </Animated.View>
  );
}

const SIGNAL_RADII = [12, 22, 32];

/** Arcs pulse outward from the dish, one after another, while sending. */
function Signal() {
  return (
    <>
      {SIGNAL_RADII.map((radius, index) => (
        <SignalArc key={radius} radius={radius} delay={index * 200} />
      ))}
    </>
  );
}

function SignalArc({ radius, delay }: { radius: number; delay: number }) {
  const { tokens } = useTheme();
  // Opacity only, so it can keep running under reduced motion.
  const pulse = useLoop({
    duration: 1000,
    delay,
    easing: Easings.linear,
    essential: true,
  });
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.get(), [0, 0.3, 0.7, 1], [0.15, 1, 0.15, 0.15]),
  }));
  const size = radius + 3;
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: FEED.x + 3,
          top: FEED.y - 3 - radius,
          width: size,
          height: size,
        },
        style,
      ]}
    >
      <Svg width={size} height={size}>
        <Path
          d={`M1.5 1.5 A${radius} ${radius} 0 0 1 ${radius + 1.5} ${radius + 1.5}`}
          stroke={tokens.accent}
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    </Animated.View>
  );
}
