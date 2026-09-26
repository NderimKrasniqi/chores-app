import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { Icon } from "@/components/ui/icon";
import { AppText } from "@/design-system/text";
import { useTheme } from "@/design-system/theme";

import { Easings, useLoop } from "./motion";
import { PulseRings } from "./pieces";
import { StarBuddy } from "./star-buddy";

export type QuestStopStatus =
  "done" | "review" | "current" | "todo" | "redo" | "missed" | "unlock";

export type QuestStop = {
  key: string;
  title: string;
  subtitle?: string;
  status: QuestStopStatus;
  reward?: number;
  eyebrow?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  trailing?: ReactNode;
};

const AnimatedPath = Animated.createAnimatedComponent(Path);

const SIDE_PADDING = 28;
const CONNECTOR_HEIGHT = 30;

function nodeSize(status: QuestStopStatus) {
  return status === "current" ? 84 : status === "unlock" ? 66 : 60;
}

function Connector({
  width,
  fromX,
  toX,
}: {
  width: number;
  fromX: number;
  toX: number;
}) {
  const { tokens } = useTheme();
  const progress = useLoop({ duration: 1200, easing: Easings.linear });
  const dashProps = useAnimatedProps(() => ({
    strokeDashoffset: -progress.value * 40,
  }));
  const h = CONNECTOR_HEIGHT;
  const d = `M${fromX} -6 C ${fromX} ${h * 0.9}, ${toX} ${h * 0.1}, ${toX} ${h + 6}`;
  return (
    <Svg
      width={width}
      height={h}
      style={{ overflow: "visible" }}
      pointerEvents="none"
    >
      <Path
        d={d}
        stroke={tokens.nightTrack}
        strokeWidth={18}
        strokeLinecap="round"
        fill="none"
      />
      <AnimatedPath
        d={d}
        stroke={tokens.nightDash}
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray="4 16"
        fill="none"
        animatedProps={dashProps}
      />
    </Svg>
  );
}

function FlippingHourglass({ color }: { color: string }) {
  const progress = useLoop({ duration: 3000, easing: Easings.linear });
  const style = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(progress.value, [0, 0.45, 0.55, 1], [0, 0, 180, 180])}deg`,
      },
    ],
  }));
  return (
    <Animated.View style={style}>
      <Icon name="waiting" color={color} size={26} />
    </Animated.View>
  );
}

function Node({ stop, showBuddy }: { stop: QuestStop; showBuddy: boolean }) {
  const { tokens } = useTheme();
  const size = nodeSize(stop.status);
  const circle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };

  switch (stop.status) {
    case "done":
      return (
        <View
          style={[
            circle,
            {
              backgroundColor: tokens.primary,
              borderBottomWidth: 5,
              borderBottomColor: tokens.primaryShade,
            },
          ]}
        >
          <Icon name="check" color={tokens.night} size={28} />
        </View>
      );
    case "review":
      return (
        <View
          style={[
            circle,
            {
              backgroundColor: tokens.nightRaised,
              borderWidth: 3,
              borderStyle: "dashed",
              borderColor: tokens.inkMuted,
            },
          ]}
        >
          <FlippingHourglass color={tokens.star} />
        </View>
      );
    case "redo":
      return (
        <PulseRings size={size} color={tokens.pink}>
          <View
            style={[
              circle,
              {
                position: "absolute",
                backgroundColor: tokens.pink,
                borderBottomWidth: 5,
                borderBottomColor: tokens.urgencyPressed,
              },
            ]}
          >
            <Icon name="redo" color={tokens.night} size={26} />
          </View>
        </PulseRings>
      );
    case "missed":
      return (
        <View style={[circle, { backgroundColor: tokens.nightTrack }]}>
          <Icon name="minus" color={tokens.inkMuted} size={24} />
        </View>
      );
    case "unlock":
      return (
        <View
          style={[
            circle,
            {
              borderRadius: 22,
              backgroundColor: tokens.gold,
              borderBottomWidth: 5,
              borderBottomColor: tokens.goldShade,
            },
          ]}
        >
          <Icon name="lock" color={tokens.night} size={26} />
        </View>
      );
    case "current":
      return (
        <View style={{ width: size, height: size }}>
          <PulseRings size={size}>
            <View
              style={[
                circle,
                {
                  position: "absolute",
                  backgroundColor: tokens.accent,
                  borderBottomWidth: 7,
                  borderBottomColor: tokens.accentShade,
                },
              ]}
            >
              {stop.reward !== undefined ? (
                <>
                  <AppText className="font-display text-[24px] leading-[26px] text-night">
                    +{stop.reward}
                  </AppText>
                  <AppText className="font-body-heavy text-[12px] leading-[14px] text-night">
                    kr
                  </AppText>
                </>
              ) : (
                <Icon name="star" color={tokens.night} size={30} />
              )}
            </View>
          </PulseRings>
          {showBuddy ? (
            <View
              style={{ position: "absolute", top: -42, left: size / 2 - 22 }}
            >
              <StarBuddy size={44} mood="hop" />
            </View>
          ) : null}
        </View>
      );
    default:
      return (
        <View
          style={[
            circle,
            {
              backgroundColor: tokens.nightSurface,
              borderWidth: 3,
              borderColor: tokens.nightRaised,
            },
          ]}
        >
          {stop.reward !== undefined ? (
            <AppText className="font-display text-[18px] text-ink">
              +{stop.reward}
            </AppText>
          ) : (
            <Icon name="star" color={tokens.inkMuted} size={24} />
          )}
        </View>
      );
  }
}

function StopRow({
  stop,
  side,
  showBuddy,
}: {
  stop: QuestStop;
  side: "left" | "right";
  showBuddy: boolean;
}) {
  const { tokens } = useTheme();
  const eyebrowColor =
    stop.status === "current"
      ? tokens.accent
      : stop.status === "redo"
        ? tokens.pink
        : stop.status === "unlock"
          ? tokens.gold
          : tokens.inkMuted;
  const subtitleColor =
    stop.status === "unlock"
      ? tokens.gold
      : stop.status === "done"
        ? tokens.primary
        : tokens.inkMuted;
  const align = side === "left" ? "flex-start" : "flex-end";

  return (
    <Pressable
      disabled={!stop.onPress}
      onPress={stop.onPress}
      accessibilityRole={stop.onPress ? "button" : undefined}
      accessibilityLabel={
        stop.accessibilityLabel ??
        [stop.title, stop.subtitle].filter(Boolean).join(", ")
      }
      style={({ pressed }) => ({
        flexDirection: side === "left" ? "row" : "row-reverse",
        alignItems: "center",
        gap: 14,
        paddingHorizontal: SIDE_PADDING,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Node stop={stop} showBuddy={showBuddy} />
      <View style={{ flex: 1, alignItems: align }}>
        {stop.eyebrow ? (
          <AppText
            className="font-body-heavy text-[12px] uppercase tracking-[1.2px]"
            style={{
              color: eyebrowColor,
              textAlign: side === "left" ? "left" : "right",
            }}
          >
            {stop.eyebrow}
          </AppText>
        ) : null}
        <AppText
          className={
            stop.status === "current"
              ? "font-display-medium text-[22px] leading-[27px]"
              : "font-body-heavy text-[16px] leading-[21px]"
          }
          style={{
            color:
              stop.status === "done" || stop.status === "missed"
                ? tokens.inkMuted
                : tokens.ink,
            textDecorationLine:
              stop.status === "done" ? "line-through" : "none",
            textAlign: side === "left" ? "left" : "right",
          }}
          numberOfLines={2}
        >
          {stop.title}
        </AppText>
        {stop.subtitle ? (
          <AppText
            className="font-body-bold text-[13px] leading-[17px]"
            style={{
              color: subtitleColor,
              textAlign: side === "left" ? "left" : "right",
            }}
          >
            {stop.subtitle}
          </AppText>
        ) : null}
        {stop.trailing ? (
          <View style={{ marginTop: 8 }}>{stop.trailing}</View>
        ) : null}
      </View>
    </Pressable>
  );
}

/**
 * The Child's day drawn as a winding quest: stops alternate sides and are
 * joined by a flowing dashed path. The first "current" stop gets the buddy.
 */
export function QuestPath({ stops }: { stops: QuestStop[] }) {
  const [width, setWidth] = useState(0);
  const firstCurrent = stops.findIndex((stop) => stop.status === "current");

  const centerX = (index: number) => {
    const size = nodeSize(stops[index].status);
    return index % 2 === 0
      ? SIDE_PADDING + size / 2
      : width - SIDE_PADDING - size / 2;
  };

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {stops.map((stop, index) => (
        <View key={stop.key}>
          {index > 0 && width > 0 ? (
            <Connector
              width={width}
              fromX={centerX(index - 1)}
              toX={centerX(index)}
            />
          ) : index > 0 ? (
            <View style={{ height: CONNECTOR_HEIGHT }} />
          ) : null}
          <View
            style={{
              paddingTop:
                stop.status === "current" && index === firstCurrent ? 36 : 0,
            }}
          >
            <StopRow
              stop={stop}
              side={index % 2 === 0 ? "left" : "right"}
              showBuddy={index === firstCurrent}
            />
          </View>
        </View>
      ))}
    </View>
  );
}
