import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Path, Rect } from "react-native-svg";

import { Avatar, childAvatarTone } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { AppText } from "@/design-system";
import { useTheme } from "@/design-system/theme";

import {
  Easings,
  PRESS,
  pressTransition,
  useEntrance,
  useLoop,
} from "./motion";

type Tokens = ReturnType<typeof useTheme>["tokens"];

export type HouseParent = { id: string; name: string; isCurrent: boolean };
export type HouseKid = {
  id: string;
  name: string;
  /** undefined while loading. */
  linkedPhones: number | undefined;
};

const WINDOW_W = 64;
const WINDOW_H = 70;
const ROOF_H = 78;
const WALL = 4;

/**
 * The family as a doll's house, cut open: Parents upstairs, kids downstairs,
 * one window each. A kid's window glows when their phone is linked and is
 * dark (with a phone badge) when it isn't — so the picture carries real
 * information. Empty windows add a kid or invite a parent. Windows light up
 * one by one when the tab opens; the chimney smokes gently; nothing else
 * moves.
 */
export function FamilyHouse({
  householdName,
  parents,
  kids,
  onOpenKid,
  onAddKid,
  onInviteParent,
}: {
  householdName: string;
  parents: HouseParent[];
  kids: HouseKid[];
  onOpenKid: (id: string) => void;
  onAddKid: () => void;
  onInviteParent: () => void;
}) {
  const { tokens } = useTheme();
  const [width, setWidth] = useState(0);
  let order = 0;

  return (
    <View
      className="items-center"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {width > 0 ? (
        <Roof width={width} name={householdName} tokens={tokens} />
      ) : (
        <View style={{ height: ROOF_H }} />
      )}
      <View
        className="w-full overflow-hidden"
        style={{
          backgroundColor: tokens.reward,
          borderWidth: WALL,
          borderTopWidth: 0,
          borderColor: tokens.ink,
          borderBottomLeftRadius: 18,
          borderBottomRightRadius: 18,
        }}
      >
        <Floor label="Parents" tokens={tokens}>
          {parents.map((parent) => (
            <HouseWindow
              key={parent.id}
              order={order++}
              lit
              label={parent.isCurrent ? "You" : parent.name}
              accessibilityLabel={`${parent.name}${parent.isCurrent ? ", you" : ""}, parent`}
              tokens={tokens}
            >
              <Avatar
                tone="parent"
                className="rounded-full"
                fallbackLabel={parent.name}
                size={36}
              />
            </HouseWindow>
          ))}
          <HouseWindow
            order={order++}
            empty
            label="Invite"
            accessibilityLabel="Invite another parent"
            onPress={onInviteParent}
            tokens={tokens}
          >
            <Icon name="personPlus" color={tokens.inkMuted} size={22} />
          </HouseWindow>
        </Floor>

        <View
          style={{ height: WALL, backgroundColor: tokens.ink, opacity: 0.85 }}
        />

        <Floor label="Kids" tokens={tokens}>
          {kids.map((kid) => {
            const linked = (kid.linkedPhones ?? 0) > 0;
            return (
              <HouseWindow
                key={kid.id}
                order={order++}
                lit={linked}
                label={kid.name}
                accessibilityLabel={`${kid.name}. ${
                  kid.linkedPhones === undefined
                    ? "Checking phones"
                    : linked
                      ? `${kid.linkedPhones} linked ${kid.linkedPhones === 1 ? "phone" : "phones"}`
                      : "No phone linked yet"
                }. Open`}
                onPress={() => onOpenKid(kid.id)}
                badge={
                  kid.linkedPhones !== undefined && !linked ? (
                    <View
                      className="h-5 w-5 items-center justify-center rounded-full"
                      style={{ backgroundColor: tokens.action }}
                    >
                      <Icon name="phone" color={tokens.onAction} size={11} />
                    </View>
                  ) : null
                }
                tokens={tokens}
              >
                <Avatar
                  tone={childAvatarTone(kid.name)}
                  className="rounded-full"
                  fallbackLabel={kid.name}
                  size={36}
                />
              </HouseWindow>
            );
          })}
          <HouseWindow
            order={order++}
            empty
            label="Add kid"
            accessibilityLabel="Add a kid"
            onPress={onAddKid}
            tokens={tokens}
          >
            <Icon name="plus" color={tokens.inkMuted} size={22} />
          </HouseWindow>
        </Floor>

        {/* Porch: door and step */}
        <View className="items-center">
          <View
            style={{
              width: 38,
              height: 46,
              marginTop: 4,
              borderTopLeftRadius: 19,
              borderTopRightRadius: 19,
              backgroundColor: tokens.ink,
            }}
          >
            <View
              className="absolute h-1.5 w-1.5 rounded-full"
              style={{ right: 8, top: 24, backgroundColor: tokens.reward }}
            />
          </View>
        </View>
      </View>
      {/* Ground */}
      <View
        className="h-1.5 rounded-full"
        style={{
          width: "108%",
          marginTop: -1,
          backgroundColor: tokens.line,
        }}
      />
    </View>
  );
}

function Roof({
  width,
  name,
  tokens,
}: {
  width: number;
  name: string;
  tokens: Tokens;
}) {
  const smoke = useLoop({ duration: 2800, easing: Easings.linear, rest: 0.3 });
  const chimneyX = width * 0.74;
  const puff = (offset: number) => {
    "worklet";
    const t = (smoke.get() + offset) % 1;
    return {
      opacity: interpolate(t, [0, 0.2, 1], [0, 0.7, 0]),
      transform: [
        { translateX: chimneyX + 6 + t * 12 },
        { translateY: 8 - t * 34 },
        { scale: 0.6 + t * 0.9 },
      ],
    };
  };
  const a = useAnimatedStyle(() => puff(0));
  const b = useAnimatedStyle(() => puff(0.5));

  return (
    <View style={{ width, height: ROOF_H }}>
      {[a, b].map((style, i) => (
        <Animated.View
          key={i}
          style={[
            {
              position: "absolute",
              left: 0,
              top: 0,
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: tokens.line,
            },
            style,
          ]}
        />
      ))}
      <Svg width={width} height={ROOF_H} style={{ position: "absolute" }}>
        <Rect
          x={chimneyX}
          y={10}
          width={18}
          height={34}
          rx={3}
          fill={tokens.ink}
        />
        <Path
          d={`M${WALL / 2} ${ROOF_H - WALL / 2} L${width / 2} ${WALL + 2} L${width - WALL / 2} ${ROOF_H - WALL / 2} Z`}
          fill={tokens.urgency}
          stroke={tokens.ink}
          strokeWidth={WALL}
          strokeLinejoin="round"
        />
      </Svg>
      <View
        className="absolute left-0 right-0 items-center"
        style={{ top: ROOF_H * 0.5 }}
      >
        <View
          className="rounded-full px-3 py-0.5"
          style={{ backgroundColor: tokens.surface, maxWidth: width * 0.5 }}
        >
          <AppText variant="label" numberOfLines={1}>
            {name}
          </AppText>
        </View>
      </View>
    </View>
  );
}

function Floor({
  label,
  tokens,
  children,
}: {
  label: string;
  tokens: Tokens;
  children: ReactNode;
}) {
  return (
    <View className="px-3 pb-3 pt-2">
      <AppText
        variant="caption"
        className="mb-1.5 uppercase tracking-[1px]"
        style={{ color: tokens.ink, opacity: 0.55 }}
      >
        {label}
      </AppText>
      <View className="flex-row flex-wrap justify-center gap-3">
        {children}
      </View>
    </View>
  );
}

function HouseWindow({
  order,
  lit = false,
  empty = false,
  label,
  accessibilityLabel,
  onPress,
  badge,
  tokens,
  children,
}: {
  order: number;
  lit?: boolean;
  empty?: boolean;
  label: string;
  accessibilityLabel: string;
  onPress?: () => void;
  badge?: ReactNode;
  tokens: Tokens;
  children: ReactNode;
}) {
  // Lights come on one after another when the tab opens.
  const on = useEntrance({ delay: 120 + order * 90, duration: 360 });
  const glowStyle = useAnimatedStyle(() => ({ opacity: on.get() }));

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel}
      disabled={!onPress}
      onPress={onPress}
      className="items-center"
      style={{ width: WINDOW_W }}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            { transform: [{ scale: pressed ? PRESS.scale : 1 }] },
            pressTransition,
          ]}
        >
          <View
            className="items-center justify-center overflow-hidden"
            style={{
              width: WINDOW_W,
              height: WINDOW_H - 18,
              borderRadius: 12,
              borderWidth: 3,
              borderColor: tokens.ink,
              borderStyle: empty ? "dashed" : "solid",
              backgroundColor: empty ? tokens.surfaceMuted : tokens.inkMuted,
            }}
          >
            {lit ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  {
                    position: "absolute",
                    inset: 0,
                    backgroundColor: tokens.surface,
                  },
                  glowStyle,
                ]}
              />
            ) : null}
            {/* window cross bar */}
            {!empty ? (
              <View
                pointerEvents="none"
                className="absolute bottom-0 top-0 w-[3px]"
                style={{ backgroundColor: tokens.ink, opacity: 0.12 }}
              />
            ) : null}
            {children}
          </View>
          {badge ? (
            <View className="absolute -right-1.5 -top-1.5">{badge}</View>
          ) : null}
          <AppText
            variant="caption"
            numberOfLines={1}
            className="mt-1 text-center font-body-heavy"
            style={{ color: tokens.ink, width: WINDOW_W }}
          >
            {label}
          </AppText>
        </Animated.View>
      )}
    </Pressable>
  );
}
