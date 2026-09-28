import { View } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";

import { AppText } from "@/design-system/text";
import { useTheme } from "@/design-system/theme";

const HEAD = 46;
const MIN_TAIL = 18;
const MAX_TAIL = 70;

/**
 * A bonus quest as a comet passing by: the reward rides in the glowing
 * head, and the tail shows how much time is left — long means plenty of
 * time, short means catch it soon. Still; the list is visited often.
 */
export function Comet({
  reward,
  timeLeft,
  dimmed = false,
}: {
  reward: number;
  /** 0 = due now … 1 = lots of time (a day or more). */
  timeLeft: number;
  dimmed?: boolean;
}) {
  const { tokens } = useTheme();
  const tail =
    MIN_TAIL + Math.max(0, Math.min(1, timeLeft)) * (MAX_TAIL - MIN_TAIL);
  const width = MAX_TAIL + HEAD;
  const cy = HEAD / 2;
  const headX = width - HEAD / 2;
  const color = dimmed ? tokens.nightRaised : tokens.gold;

  return (
    <View
      style={{ width, height: HEAD }}
      pointerEvents="none"
      accessible={false}
    >
      <Svg width={width} height={HEAD} style={{ position: "absolute" }}>
        <Defs>
          <LinearGradient id="comet-tail" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={color} stopOpacity={0} />
            <Stop offset="1" stopColor={color} stopOpacity={0.7} />
          </LinearGradient>
        </Defs>
        <Path
          d={`M${headX - tail - HEAD / 2 + 6} ${cy} Q${headX - HEAD / 2} ${cy - HEAD * 0.42} ${headX} ${cy - HEAD / 2 + 4} L${headX} ${cy + HEAD / 2 - 4} Q${headX - HEAD / 2} ${cy + HEAD * 0.42} ${headX - tail - HEAD / 2 + 6} ${cy} Z`}
          fill="url(#comet-tail)"
        />
        <Circle cx={headX} cy={cy} r={HEAD / 2} fill={color} opacity={0.18} />
        <Circle
          cx={headX}
          cy={cy}
          r={HEAD / 2 - 5}
          fill={color}
          stroke={dimmed ? tokens.night : tokens.goldShade}
          strokeWidth={2.5}
        />
      </Svg>
      <View
        style={{
          position: "absolute",
          left: headX - HEAD / 2,
          width: HEAD,
          height: HEAD,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AppText
          className="font-display"
          style={{
            fontSize: reward >= 100 ? 13 : 15,
            color: dimmed ? tokens.inkMuted : tokens.night,
          }}
        >
          {reward}
        </AppText>
      </View>
    </View>
  );
}
