import { View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";

import { useTheme } from "@/design-system/theme";

import { useLoop } from "./motion";

export type ChoreKind =
  | "dog"
  | "walk"
  | "dishes"
  | "recycling"
  | "trash"
  | "laundry"
  | "plants"
  | "car"
  | "table"
  | "room"
  | "generic";

const matchers: [RegExp, ChoreKind][] = [
  [/walk/i, "walk"],
  [/dog|cat|pet|feed/i, "dog"],
  [/dish|kitchen|plate|cup/i, "dishes"],
  [/recycl/i, "recycling"],
  [/trash|garbage|rubbish|bin/i, "trash"],
  [/laundry|fold|clothes|wash(ing)? clothes/i, "laundry"],
  [/plant|water|garden|flower/i, "plants"],
  [/car/i, "car"],
  [/table|dinner|lunch|breakfast/i, "table"],
  [/room|bed|tidy|clean|vacuum|toy/i, "room"],
];

/** Picks artwork from the chore title so every chore gets a picture. */
export function choreKind(title: string): ChoreKind {
  return matchers.find(([pattern]) => pattern.test(title))?.[1] ?? "generic";
}

function Drawing({
  kind,
  ink,
  t,
}: {
  kind: ChoreKind;
  ink: string;
  t: ReturnType<typeof useTheme>["tokens"];
}) {
  const sw = 2.4;
  switch (kind) {
    case "dog":
      return (
        <G>
          <Path
            d="M17 16a3 3 0 1 1 3.5-3.5h7a3 3 0 1 1 3.5 3.5 3 3 0 1 1-3.5 3.5h-7A3 3 0 1 1 17 16z"
            fill="#FFFFFF"
            stroke={ink}
            strokeWidth={sw}
          />
          <Path
            d="M8 28h32l-3 9a3 3 0 0 1-3 2H14a3 3 0 0 1-3-2z"
            fill={t.pink}
            stroke={ink}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
        </G>
      );
    case "walk":
      return (
        <G>
          <Ellipse
            cx={24}
            cy={30}
            rx={9}
            ry={8}
            fill="#FFFFFF"
            stroke={ink}
            strokeWidth={sw}
          />
          <Circle
            cx={13}
            cy={19}
            r={4}
            fill="#FFFFFF"
            stroke={ink}
            strokeWidth={sw}
          />
          <Circle
            cx={20}
            cy={12}
            r={4}
            fill="#FFFFFF"
            stroke={ink}
            strokeWidth={sw}
          />
          <Circle
            cx={28}
            cy={12}
            r={4}
            fill="#FFFFFF"
            stroke={ink}
            strokeWidth={sw}
          />
          <Circle
            cx={35}
            cy={19}
            r={4}
            fill="#FFFFFF"
            stroke={ink}
            strokeWidth={sw}
          />
        </G>
      );
    case "dishes":
      return (
        <G>
          <Rect
            x={10}
            y={12}
            width={28}
            height={28}
            rx={4}
            fill="#FFFFFF"
            stroke={ink}
            strokeWidth={sw}
          />
          <Path d="M10 19h28" stroke={ink} strokeWidth={sw} />
          <Circle
            cx={24}
            cy={30}
            r={6.5}
            fill={t.nightDash}
            stroke={ink}
            strokeWidth={sw}
          />
          <Circle cx={31} cy={15.5} r={1.6} fill={ink} />
        </G>
      );
    case "recycling":
      return (
        <G>
          <Rect
            x={13}
            y={19}
            width={22}
            height={21}
            rx={3}
            fill="#FFFFFF"
            stroke={ink}
            strokeWidth={sw}
          />
          <Rect x={11} y={14} width={26} height={5} rx={2} fill={ink} />
          <Path
            d="M20 34l4-7 4 7z"
            fill="none"
            stroke={ink}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </G>
      );
    case "trash":
      return (
        <G>
          <Path
            d="M14 18h20l-2 22H16z"
            fill="#FFFFFF"
            stroke={ink}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <Rect x={11} y={13} width={26} height={5} rx={2} fill={ink} />
          <Path
            d="M20 23v12M28 23v12"
            stroke={ink}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </G>
      );
    case "laundry":
      return (
        <G>
          <Path
            d="M17 10l-9 6 4 7 4-2v18h16V21l4 2 4-7-9-6c-1 3-4 5-7 5s-6-2-7-5z"
            fill="#FFFFFF"
            stroke={ink}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <Path d="M16 30h16" stroke={t.nightDash} strokeWidth={3} />
        </G>
      );
    case "plants":
      return (
        <G>
          <Path
            d="M24 26c0-8 4-13 11-14 0 8-4 13-11 14zM24 26c0-6-3-10-9-11 0 6 3 10 9 11z"
            fill={t.primary}
            stroke={ink}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <Path
            d="M15 26h18l-3 13H18z"
            fill={t.accent}
            stroke={ink}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
        </G>
      );
    case "car":
      return (
        <G>
          <Path
            d="M7 30l3-9a3 3 0 0 1 3-2h22a3 3 0 0 1 3 2l3 9v6H7z"
            fill="#FFFFFF"
            stroke={ink}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <Path
            d="M13 21l2-5h18l2 5"
            fill="none"
            stroke={ink}
            strokeWidth={sw}
          />
          <Circle cx={15} cy={36} r={4} fill={ink} />
          <Circle cx={33} cy={36} r={4} fill={ink} />
        </G>
      );
    case "table":
      return (
        <G>
          <Circle
            cx={24}
            cy={25}
            r={11}
            fill="#FFFFFF"
            stroke={ink}
            strokeWidth={sw}
          />
          <Circle
            cx={24}
            cy={25}
            r={6}
            fill="none"
            stroke={ink}
            strokeWidth={1.8}
          />
          <Path
            d="M8 15v20M40 15v20"
            stroke={ink}
            strokeWidth={sw}
            strokeLinecap="round"
          />
        </G>
      );
    case "room":
      return (
        <G>
          <Path
            d="M7 36V16M41 36V26"
            stroke={ink}
            strokeWidth={sw}
            strokeLinecap="round"
          />
          <Rect
            x={7}
            y={26}
            width={34}
            height={8}
            rx={2}
            fill="#FFFFFF"
            stroke={ink}
            strokeWidth={sw}
          />
          <Rect
            x={10}
            y={20}
            width={11}
            height={6}
            rx={3}
            fill={t.pink}
            stroke={ink}
            strokeWidth={2}
          />
        </G>
      );
    default:
      return (
        <Path
          d="M24 7l4.2 11.8L40 23l-11.8 4.2L24 39l-4.2-11.8L8 23l11.8-4.2z"
          fill="#FFFFFF"
          stroke={ink}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      );
  }
}

const tileTone: Record<
  ChoreKind,
  "gold" | "primary" | "accent" | "pink" | "dash"
> = {
  dog: "gold",
  walk: "accent",
  dishes: "dash",
  recycling: "primary",
  trash: "primary",
  laundry: "pink",
  plants: "gold",
  car: "dash",
  table: "accent",
  room: "pink",
  generic: "gold",
};

/**
 * A rounded tile with the chore's picture. `animated` adds a gentle bob.
 */
export function ChoreIcon({
  title,
  size = 48,
  animated = false,
}: {
  title: string;
  size?: number;
  animated?: boolean;
}) {
  const { tokens } = useTheme();
  const kind = choreKind(title);
  const tone = tileTone[kind];
  const fill =
    tone === "gold"
      ? tokens.gold
      : tone === "primary"
        ? tokens.primary
        : tone === "accent"
          ? tokens.accent
          : tone === "pink"
            ? tokens.pink
            : tokens.nightDash;
  const progress = useLoop({ duration: 2400, reverse: true, rest: 0.5 });
  const bob = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: animated ? interpolate(progress.get(), [0, 1], [0, -3]) : 0,
      },
    ],
  }));

  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        backgroundColor: fill,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View style={bob}>
        <Svg width={size * 0.9} height={size * 0.9} viewBox="0 0 48 48">
          <Drawing kind={kind} ink={tokens.night} t={tokens} />
        </Svg>
      </Animated.View>
    </View>
  );
}
