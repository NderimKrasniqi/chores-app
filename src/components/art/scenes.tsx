import { View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";

import { useTheme, type ThemeTokens } from "@/design-system/theme";

import { Easings, useLoop } from "./motion";
import { StarBuddy, type BuddyMood } from "./star-buddy";

export type SceneName =
  | "planet"
  | "moon"
  | "phone-qr"
  | "house"
  | "calendar"
  | "clipboard"
  | "camera"
  | "wallet"
  | "lock"
  | "broken-link"
  | "family"
  | "mail";

function Twinkle({
  x,
  y,
  r,
  color,
  delay,
}: {
  x: number;
  y: number;
  r: number;
  color: string;
  delay: number;
}) {
  const progress = useLoop({ duration: 1800, delay, reverse: true, rest: 1 });
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.3, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.6, 1.1]) }],
  }));
  return (
    <Animated.View
      style={[{ position: "absolute", left: x - r, top: y - r }, style]}
    >
      <Svg width={r * 2} height={r * 2} viewBox="0 0 20 20">
        <Path
          d="M10 0l2.6 7.4L20 10l-7.4 2.6L10 20l-2.6-7.4L0 10l7.4-2.6z"
          fill={color}
        />
      </Svg>
    </Animated.View>
  );
}

function SceneDrawing({ name, t }: { name: SceneName; t: ThemeTokens }) {
  const ink = t.night;
  const sw = 3.5;
  switch (name) {
    case "planet":
      return (
        <G>
          <Circle cx={80} cy={84} r={46} fill={t.nightSurface} />
          <Path
            d="M48 64a46 46 0 0 1 30-24"
            stroke={t.nightRaised}
            strokeWidth={8}
            strokeLinecap="round"
            fill="none"
          />
          <Circle cx={62} cy={104} r={8} fill={t.nightRaised} />
          <Circle cx={102} cy={70} r={5} fill={t.nightRaised} />
          <Ellipse
            cx={80}
            cy={88}
            rx={72}
            ry={15}
            fill="none"
            stroke={t.primary}
            strokeWidth={4}
            transform="rotate(-12 80 88)"
            strokeDasharray="160 70"
          />
        </G>
      );
    case "moon":
      return (
        <G>
          <Circle cx={80} cy={80} r={44} fill={t.gold} />
          <Circle cx={100} cy={66} r={40} fill={t.canvas} />
          <Circle cx={60} cy={92} r={5} fill={t.goldShade} />
          <Circle cx={72} cy={112} r={3.5} fill={t.goldShade} />
        </G>
      );
    case "phone-qr":
      return (
        <G>
          <Rect
            x={46}
            y={20}
            width={68}
            height={120}
            rx={14}
            fill={t.nightSurface}
            stroke={ink}
            strokeWidth={sw}
          />
          <Rect x={56} y={40} width={48} height={48} rx={6} fill="#FFFFFF" />
          <Rect x={61} y={45} width={14} height={14} rx={2} fill={ink} />
          <Rect x={85} y={45} width={14} height={14} rx={2} fill={ink} />
          <Rect x={61} y={69} width={14} height={14} rx={2} fill={ink} />
          <Rect x={85} y={69} width={6} height={6} fill={ink} />
          <Rect x={93} y={77} width={6} height={6} fill={ink} />
          <Rect x={62} y={104} width={36} height={10} rx={5} fill={t.primary} />
        </G>
      );
    case "house":
      return (
        <G>
          <Path
            d="M30 78l50-42 50 42v52a6 6 0 0 1-6 6H36a6 6 0 0 1-6-6z"
            fill={t.nightSurface}
            stroke={ink}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <Path
            d="M22 82l58-50 58 50"
            fill="none"
            stroke={t.accent}
            strokeWidth={9}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Rect
            x={66}
            y={96}
            width={28}
            height={40}
            rx={4}
            fill={t.gold}
            stroke={ink}
            strokeWidth={sw}
          />
          <Circle cx={88} cy={118} r={2.5} fill={ink} />
          <Rect
            x={40}
            y={90}
            width={18}
            height={18}
            rx={3}
            fill={t.primary}
            stroke={ink}
            strokeWidth={3}
          />
        </G>
      );
    case "calendar":
      return (
        <G>
          <Rect
            x={30}
            y={36}
            width={100}
            height={92}
            rx={14}
            fill="#FFFFFF"
            stroke={ink}
            strokeWidth={sw}
          />
          <Path d="M30 60h100" stroke={ink} strokeWidth={sw} />
          <Rect x={30} y={36} width={100} height={24} rx={12} fill={t.accent} />
          <Path
            d="M54 26v18M106 26v18"
            stroke={ink}
            strokeWidth={6}
            strokeLinecap="round"
          />
          <Circle cx={56} cy={82} r={7} fill={t.nightRaised} />
          <Circle cx={80} cy={82} r={7} fill={t.nightRaised} />
          <Circle
            cx={104}
            cy={82}
            r={9}
            fill={t.gold}
            stroke={ink}
            strokeWidth={3}
          />
          <Circle cx={56} cy={106} r={7} fill={t.nightRaised} />
          <Circle cx={80} cy={106} r={7} fill={t.nightRaised} />
        </G>
      );
    case "clipboard":
      return (
        <G>
          <Rect
            x={40}
            y={30}
            width={80}
            height={104}
            rx={12}
            fill="#FFFFFF"
            stroke={ink}
            strokeWidth={sw}
          />
          <Rect
            x={60}
            y={22}
            width={40}
            height={16}
            rx={6}
            fill={t.accent}
            stroke={ink}
            strokeWidth={3}
          />
          <Path
            d="M56 66l8 8 14-16"
            fill="none"
            stroke={t.primaryShade}
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M88 68h18M56 98h50M56 114h34"
            stroke={t.nightRaised}
            strokeWidth={6}
            strokeLinecap="round"
          />
        </G>
      );
    case "camera":
      return (
        <G>
          <Path
            d="M28 56h24l8-14h40l8 14h24v68H28z"
            fill={t.nightSurface}
            stroke={ink}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <Circle
            cx={80}
            cy={90}
            r={24}
            fill={t.nightDash}
            stroke={ink}
            strokeWidth={sw}
          />
          <Circle cx={80} cy={90} r={11} fill={t.night} />
          <Circle cx={116} cy={70} r={5} fill={t.gold} />
        </G>
      );
    case "wallet":
      return (
        <G>
          <Rect
            x={28}
            y={48}
            width={104}
            height={76}
            rx={14}
            fill={t.accent}
            stroke={ink}
            strokeWidth={sw}
          />
          <Path d="M28 70h104" stroke={ink} strokeWidth={sw} />
          <Rect
            x={96}
            y={84}
            width={36}
            height={22}
            rx={8}
            fill={t.gold}
            stroke={ink}
            strokeWidth={3}
          />
          <Circle cx={108} cy={95} r={4} fill={ink} />
          <Circle
            cx={60}
            cy={40}
            r={11}
            fill={t.gold}
            stroke={ink}
            strokeWidth={3}
          />
        </G>
      );
    case "lock":
      return (
        <G>
          <Path
            d="M58 74V58a22 22 0 0 1 44 0v16"
            fill="none"
            stroke={t.star}
            strokeWidth={11}
            strokeLinecap="round"
          />
          <Rect
            x={44}
            y={72}
            width={72}
            height={60}
            rx={14}
            fill={t.gold}
            stroke={ink}
            strokeWidth={sw}
          />
          <Circle cx={80} cy={96} r={7} fill={ink} />
          <Path
            d="M80 99v14"
            stroke={ink}
            strokeWidth={6}
            strokeLinecap="round"
          />
        </G>
      );
    case "broken-link":
      return (
        <G>
          <Rect
            x={26}
            y={62}
            width={50}
            height={32}
            rx={16}
            fill="none"
            stroke={t.nightDash}
            strokeWidth={10}
          />
          <Rect
            x={84}
            y={62}
            width={50}
            height={32}
            rx={16}
            fill="none"
            stroke={t.pink}
            strokeWidth={10}
          />
          <Path
            d="M78 46l4-12M92 50l10-8M70 110l-6 10"
            stroke={t.gold}
            strokeWidth={5}
            strokeLinecap="round"
          />
        </G>
      );
    case "family":
      return (
        <G>
          <Circle
            cx={52}
            cy={62}
            r={16}
            fill={t.accent}
            stroke={ink}
            strokeWidth={sw}
          />
          <Path
            d="M26 128c0-22 12-38 26-38s26 16 26 38z"
            fill={t.accent}
            stroke={ink}
            strokeWidth={sw}
          />
          <Circle
            cx={108}
            cy={62}
            r={16}
            fill={t.nightDash}
            stroke={ink}
            strokeWidth={sw}
          />
          <Path
            d="M82 128c0-22 12-38 26-38s26 16 26 38z"
            fill={t.nightDash}
            stroke={ink}
            strokeWidth={sw}
          />
          <Circle
            cx={80}
            cy={92}
            r={12}
            fill={t.pink}
            stroke={ink}
            strokeWidth={sw}
          />
          <Path
            d="M62 132c0-16 8-26 18-26s18 10 18 26z"
            fill={t.pink}
            stroke={ink}
            strokeWidth={sw}
          />
        </G>
      );
    case "mail":
      return (
        <G>
          <Rect
            x={28}
            y={46}
            width={104}
            height={74}
            rx={12}
            fill="#FFFFFF"
            stroke={ink}
            strokeWidth={sw}
          />
          <Path
            d="M30 50l50 38 50-38"
            fill="none"
            stroke={ink}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <Circle
            cx={124}
            cy={48}
            r={12}
            fill={t.pink}
            stroke={ink}
            strokeWidth={3}
          />
        </G>
      );
  }
}

/**
 * Decorative illustration for empty, onboarding, and access states.
 * Floats gently; a buddy can peek in for extra warmth.
 */
export function Scene({
  name,
  size = 160,
  buddy,
}: {
  name: SceneName;
  size?: number;
  buddy?: BuddyMood;
}) {
  const { tokens } = useTheme();
  const float = useLoop({
    duration: 4200,
    reverse: true,
    easing: Easings.inOut,
  });
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(float.value, [0, 1], [0, -8]) }],
  }));
  const s = size / 160;

  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size }}
    >
      <Animated.View style={style}>
        <Svg width={size} height={size} viewBox="0 0 160 160">
          <SceneDrawing name={name} t={tokens} />
        </Svg>
      </Animated.View>
      <Twinkle x={20 * s} y={30 * s} r={7 * s} color={tokens.gold} delay={0} />
      <Twinkle
        x={140 * s}
        y={124 * s}
        r={6 * s}
        color={tokens.pink}
        delay={700}
      />
      <Twinkle
        x={138 * s}
        y={26 * s}
        r={4 * s}
        color={tokens.primary}
        delay={1300}
      />
      {buddy ? (
        <View
          style={{
            position: "absolute",
            right: -size * 0.05,
            bottom: -size * 0.02,
          }}
        >
          <StarBuddy size={size * 0.34} mood={buddy} />
        </View>
      ) : null}
    </View>
  );
}
