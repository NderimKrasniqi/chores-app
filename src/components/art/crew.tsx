import { View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";

import { AppText } from "@/design-system/text";
import { useTheme } from "@/design-system/theme";

import { useEntrance } from "./motion";

/**
 * A crew member as an astronaut helmet in their colour, with this week's
 * star count on a badge. No ranking, no money — just who's on the crew.
 */
export function CrewBadge({
  name,
  color,
  stars,
  size = 56,
}: {
  name: string;
  color: string;
  stars: number;
  size?: number;
}) {
  const { tokens } = useTheme();
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <View
      style={{ width: size, height: size }}
      accessible={false}
      pointerEvents="none"
    >
      <Svg width={size} height={size} viewBox="0 0 60 60">
        {/* helmet */}
        <Circle cx={30} cy={30} r={27} fill={color} />
        <Circle
          cx={30}
          cy={30}
          r={27}
          fill="none"
          stroke={tokens.night}
          strokeWidth={2.5}
        />
        {/* visor */}
        <Rect
          x={12}
          y={17}
          width={36}
          height={24}
          rx={12}
          fill={tokens.night}
        />
        <Path
          d="M18 23 Q22 20 27 21"
          stroke={tokens.white}
          strokeWidth={2.5}
          strokeLinecap="round"
          opacity={0.45}
          fill="none"
        />
        {/* antenna */}
        <Path d="M44 7 L48 2" stroke={tokens.night} strokeWidth={2.5} />
        <Circle cx={48.5} cy={2.5} r={2.5} fill={tokens.gold} />
      </Svg>
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: size * 0.3,
          alignItems: "center",
        }}
      >
        <AppText
          className="font-display"
          style={{ fontSize: size * 0.3, color, lineHeight: size * 0.38 }}
        >
          {initial}
        </AppText>
      </View>
      <View
        style={{
          position: "absolute",
          right: -4,
          bottom: -2,
          minWidth: 24,
          height: 22,
          borderRadius: 11,
          paddingHorizontal: 5,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          backgroundColor: tokens.gold,
          borderWidth: 2,
          borderColor: tokens.night,
        }}
      >
        <Svg width={9} height={9} viewBox="0 0 10 10">
          <Path
            d="M5 0.5 L6.3 3.6 L9.6 3.8 L7 6 L7.9 9.3 L5 7.5 L2.1 9.3 L3 6 L0.4 3.8 L3.7 3.6 Z"
            fill={tokens.night}
          />
        </Svg>
        <AppText
          className="font-display"
          style={{ fontSize: 12, lineHeight: 14, color: tokens.night }}
        >
          {stars}
        </AppText>
      </View>
    </View>
  );
}

export type PatchKind = "busy" | "everyday" | "streak" | "hero";

export const PATCH_LABEL: Record<PatchKind, string> = {
  busy: "Busy day",
  everyday: "Every day",
  streak: "Unlock streak",
  hero: "Mission hero",
};

/**
 * A mission patch, the kind astronauts sew on: a round badge with a stitched
 * rim and a small emblem. A patch earned since the last visit stitches
 * itself on once (grows in with a turn); otherwise it's still.
 */
export function Patch({
  kind,
  size = 30,
  isNew = false,
  count,
}: {
  kind: PatchKind;
  size?: number;
  isNew?: boolean;
  /** For the streak: how many days. */
  count?: number;
}) {
  const { tokens } = useTheme();
  const t = useEntrance({ duration: isNew ? 600 : 1, delay: isNew ? 400 : 0 });
  const style = useAnimatedStyle(() => {
    if (!isNew) return {};
    const p = t.get();
    return {
      opacity: interpolate(p, [0, 0.3], [0, 1], "clamp"),
      transform: [
        { scale: interpolate(p, [0, 0.6, 1], [0.7, 1.12, 1]) },
        { rotate: `${interpolate(p, [0, 1], [-30, 0])}deg` },
      ],
    };
  });
  const fill =
    kind === "busy"
      ? tokens.accent
      : kind === "everyday"
        ? tokens.primary
        : kind === "streak"
          ? tokens.gold
          : tokens.pink;

  return (
    <Animated.View
      style={[{ width: size, height: size }, style]}
      accessible={false}
      pointerEvents="none"
    >
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Circle cx={20} cy={20} r={19} fill={fill} />
        <Circle
          cx={20}
          cy={20}
          r={16}
          fill="none"
          stroke={tokens.night}
          strokeWidth={1.3}
          strokeDasharray="2.2 2.2"
          opacity={0.55}
        />
        <G>
          {kind === "busy" ? (
            <>
              <Path
                d="M20 10 L22 15 L27 15.3 L23 18.4 L24.4 23.4 L20 20.6 L15.6 23.4 L17 18.4 L13 15.3 L18 15 Z"
                fill={tokens.night}
              />
              <Circle cx={13} cy={27} r={2.4} fill={tokens.night} />
              <Circle cx={20} cy={29} r={2.4} fill={tokens.night} />
              <Circle cx={27} cy={27} r={2.4} fill={tokens.night} />
            </>
          ) : kind === "everyday" ? (
            <>
              {Array.from({ length: 7 }, (_, i) => {
                const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
                return (
                  <Circle
                    key={i}
                    cx={20 + Math.cos(a) * 9}
                    cy={20 + Math.sin(a) * 9}
                    r={2.3}
                    fill={tokens.night}
                  />
                );
              })}
            </>
          ) : kind === "streak" ? (
            <>
              <Path
                d="M20 9 C24 14 27 17 27 22 A7 7 0 0 1 13 22 C13 18 16 16 17 12 C18 15 19 16 20 16 C20 13 20 11 20 9 Z"
                fill={tokens.night}
              />
            </>
          ) : (
            <>
              <Path
                d="M20 8 C25 12 25 22 23.5 27 L16.5 27 C15 22 15 12 20 8 Z"
                fill={tokens.night}
              />
              <Path d="M16.5 22 L12.5 28 L16.5 27.5 Z" fill={tokens.night} />
              <Path d="M23.5 22 L27.5 28 L23.5 27.5 Z" fill={tokens.night} />
              <Circle cx={20} cy={17} r={2.6} fill={fill} />
            </>
          )}
        </G>
      </Svg>
      {kind === "streak" && count ? (
        <View
          style={{
            position: "absolute",
            right: -3,
            top: -3,
            minWidth: 15,
            height: 15,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: tokens.night,
          }}
        >
          <AppText
            className="font-display"
            style={{ fontSize: 10, lineHeight: 12, color: tokens.gold }}
          >
            {count}
          </AppText>
        </View>
      ) : null}
    </Animated.View>
  );
}

/** A raised hand, for high-fives. */
export function HighFiveHand({
  size = 18,
  color,
}: {
  size?: number;
  color: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M7 12 V6.5 a1.5 1.5 0 0 1 3 0 V11 V4.5 a1.5 1.5 0 0 1 3 0 V11 V5.5 a1.5 1.5 0 0 1 3 0 V12 V8.5 a1.5 1.5 0 0 1 3 0 V15 c0 4 -3 7 -7 7 c-3 0 -5 -1.5 -6.5 -4 L3.8 14 a1.5 1.5 0 0 1 2.4 -1.8 Z"
        fill={color}
      />
    </Svg>
  );
}
