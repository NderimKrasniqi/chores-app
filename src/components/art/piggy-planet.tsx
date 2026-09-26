import { View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";

import { useTheme } from "@/design-system/theme";

import { Easings, useLoop } from "./motion";
import { Floating } from "./pieces";

const ORBIT_COINS = [0, 1 / 3, 2 / 3];

/**
 * The Child's money as a piggy planet: a coin slot on top, a gold ring, and
 * coins orbiting while it grows. Below zero, a moon eclipses it and the coins
 * stop — the balance is "in shadow" until earnings bring it back.
 */
export function PiggyPlanet({
  size = 200,
  negative = false,
}: {
  size?: number;
  negative?: boolean;
}) {
  const { tokens } = useTheme();
  const tilt = "rotate(-12 100 104)";

  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={{ width: size, height: size }}
    >
      <Floating distance={5} duration={4200}>
        <Svg width={size} height={size} viewBox="0 0 200 200">
          <Ellipse
            cx={100}
            cy={104}
            rx={92}
            ry={22}
            fill="none"
            stroke={tokens.goldShade}
            strokeWidth={6}
            transform={tilt}
          />
          <G opacity={negative ? 0.55 : 1}>
            <Path d="M58 64 L64 30 L90 48 Z" fill={tokens.pink} />
            <Path d="M142 64 L136 30 L110 48 Z" fill={tokens.pink} />
            <Path
              d="M64 56 L67 40 L80 49 Z"
              fill={tokens.night}
              opacity={0.18}
            />
            <Path
              d="M136 56 L133 40 L120 49 Z"
              fill={tokens.night}
              opacity={0.18}
            />
            <Circle cx={100} cy={104} r={62} fill={tokens.pink} />
            <Circle cx={72} cy={134} r={7} fill={tokens.white} opacity={0.18} />
            <Circle cx={134} cy={76} r={5} fill={tokens.white} opacity={0.18} />
            <Rect
              x={85}
              y={46}
              width={30}
              height={7}
              rx={3.5}
              fill={tokens.night}
            />
            <Circle cx={80} cy={96} r={6} fill={tokens.night} />
            <Circle cx={120} cy={96} r={6} fill={tokens.night} />
            <Circle cx={82} cy={94} r={2} fill={tokens.white} />
            <Circle cx={122} cy={94} r={2} fill={tokens.white} />
            <Ellipse
              cx={100}
              cy={120}
              rx={21}
              ry={14}
              fill={tokens.white}
              opacity={0.35}
            />
            <Ellipse cx={93} cy={120} rx={3.5} ry={5} fill={tokens.night} />
            <Ellipse cx={107} cy={120} rx={3.5} ry={5} fill={tokens.night} />
          </G>
          <Path
            d="M8 104 A92 22 0 0 0 192 104"
            fill="none"
            stroke={tokens.gold}
            strokeWidth={6}
            strokeLinecap="round"
            transform={tilt}
            opacity={negative ? 0.5 : 1}
          />
        </Svg>
        {negative ? (
          <Eclipse size={size} color={tokens.nightRaised} />
        ) : (
          ORBIT_COINS.map((offset) => (
            <OrbitCoin
              key={offset}
              size={size}
              offset={offset}
              color={tokens.gold}
              rim={tokens.goldShade}
            />
          ))
        )}
      </Floating>
    </View>
  );
}

function OrbitCoin({
  size,
  offset,
  color,
  rim,
}: {
  size: number;
  offset: number;
  color: string;
  rim: string;
}) {
  const orbit = useLoop({
    duration: 9000,
    easing: Easings.linear,
    rest: offset,
  });
  const coin = size * 0.08;
  const s = size / 200;
  const tiltRad = (-12 * Math.PI) / 180;

  const style = useAnimatedStyle(() => {
    const angle = ((orbit.get() + offset) % 1) * Math.PI * 2;
    const x = Math.cos(angle) * 92;
    const y = Math.sin(angle) * 22;
    // Rotate the orbit to match the tilted ring.
    const rx = x * Math.cos(tiltRad) - y * Math.sin(tiltRad);
    const ry = x * Math.sin(tiltRad) + y * Math.cos(tiltRad);
    const front = Math.sin(angle) > 0;
    return {
      opacity: front ? 1 : 0.35,
      transform: [
        { translateX: (100 + rx) * s - coin / 2 },
        { translateY: (104 + ry) * s - coin / 2 },
        { scale: interpolate(Math.sin(angle), [-1, 1], [0.6, 1.1]) },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: 0,
          top: 0,
          width: coin,
          height: coin,
          borderRadius: coin / 2,
          backgroundColor: color,
          borderWidth: Math.max(2, coin * 0.18),
          borderColor: rim,
        },
        style,
      ]}
    />
  );
}

function Eclipse({ size, color }: { size: number; color: string }) {
  const drift = useLoop({ duration: 7000, reverse: true, rest: 0.5 });
  const moon = size * 0.46;
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(drift.get(), [0, 1], [-6, 6]) },
      { translateY: interpolate(drift.get(), [0, 1], [3, -3]) },
    ],
  }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: size * 0.46,
          top: size * 0.2,
          width: moon,
          height: moon,
          borderRadius: moon / 2,
          backgroundColor: color,
        },
        style,
      ]}
    >
      <View
        style={{
          position: "absolute",
          left: moon * 0.22,
          top: moon * 0.3,
          width: moon * 0.18,
          height: moon * 0.18,
          borderRadius: moon,
          backgroundColor: "rgba(0,0,0,0.18)",
        }}
      />
      <View
        style={{
          position: "absolute",
          left: moon * 0.55,
          top: moon * 0.58,
          width: moon * 0.12,
          height: moon * 0.12,
          borderRadius: moon,
          backgroundColor: "rgba(0,0,0,0.18)",
        }}
      />
    </Animated.View>
  );
}
