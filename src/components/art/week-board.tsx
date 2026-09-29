import { Pressable, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

import { AppText } from "@/design-system/text";
import { useTheme } from "@/design-system/theme";

export type BoardDot = {
  key: string;
  /** The kid's colour; undefined for an Extra (the shared pool). */
  color?: string;
  isUnlock: boolean;
};

export type BoardDay = {
  localDate: string;
  label: string;
  dayNumber: string;
  isToday: boolean;
  dots: BoardDot[];
};

const MAX_DOTS = 5;

/**
 * The plan for the next seven days: one column per day, a dot per chore in
 * the kid's colour (a ring round it for the Unlock Chore — it opens Extras),
 * and gold dots below the line for Extras, which are a shared pool. Tap a
 * day to see its chores. Still, apart from new dots fading in.
 */
export function WeekBoard({
  days,
  selected,
  onSelect,
}: {
  days: BoardDay[];
  selected: string;
  onSelect: (localDate: string) => void;
}) {
  const { tokens } = useTheme();
  return (
    <View className="flex-row justify-between">
      {days.map((day) => {
        const own = day.dots.filter((dot) => dot.color !== undefined);
        const pool = day.dots.filter((dot) => dot.color === undefined);
        const active = day.localDate === selected;
        return (
          <Pressable
            key={day.localDate}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${day.label} ${day.dayNumber}: ${own.length} chores, ${pool.length} Extras`}
            onPress={() => onSelect(day.localDate)}
            hitSlop={4}
            className="items-center rounded-[16px] px-1 py-2"
            style={{
              width: 42,
              backgroundColor: active ? tokens.ink : "transparent",
            }}
          >
            <AppText
              variant="caption"
              style={{ color: active ? tokens.surface : tokens.inkMuted }}
            >
              {day.label}
            </AppText>
            <AppText
              className="font-display text-[15px]"
              style={{
                color: active
                  ? tokens.surface
                  : day.isToday
                    ? tokens.action
                    : tokens.ink,
              }}
            >
              {day.dayNumber}
            </AppText>
            <View className="mt-1.5 min-h-[62px] items-center gap-1">
              {own.slice(0, MAX_DOTS).map((dot) => (
                <Animated.View key={dot.key} entering={FadeIn.duration(180)}>
                  <Svg width={14} height={14}>
                    {dot.isUnlock ? (
                      <Circle
                        cx={7}
                        cy={7}
                        r={6}
                        fill="none"
                        stroke={active ? tokens.surface : tokens.ink}
                        strokeWidth={1.5}
                      />
                    ) : null}
                    <Circle
                      cx={7}
                      cy={7}
                      r={dot.isUnlock ? 3.8 : 5}
                      fill={dot.color}
                    />
                  </Svg>
                </Animated.View>
              ))}
              {own.length > MAX_DOTS ? (
                <AppText
                  variant="caption"
                  style={{
                    fontSize: 10,
                    color: active ? tokens.surface : tokens.inkMuted,
                  }}
                >
                  +{own.length - MAX_DOTS}
                </AppText>
              ) : null}
            </View>
            <View
              className="my-1 h-px w-6"
              style={{ backgroundColor: active ? tokens.surface : tokens.line }}
            />
            <View className="min-h-[16px] flex-row flex-wrap justify-center gap-0.5">
              {pool.slice(0, 3).map((dot) => (
                <Svg key={dot.key} width={9} height={9}>
                  <Path
                    d="M4.5 0.5 L5.7 3.3 L8.7 3.5 L6.4 5.4 L7.1 8.4 L4.5 6.8 L1.9 8.4 L2.6 5.4 L0.3 3.5 L3.3 3.3 Z"
                    fill={tokens.gold}
                  />
                </Svg>
              ))}
              {pool.length > 3 ? (
                <AppText
                  variant="caption"
                  style={{
                    fontSize: 9,
                    lineHeight: 10,
                    color: active ? tokens.surface : tokens.inkMuted,
                  }}
                >
                  +{pool.length - 3}
                </AppText>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * What the plan can pay over the next seven days: kids' own chores as a
 * filled bar (paid in full when done), the Extras pool as a lighter dashed
 * extension (a ceiling — first come, first served).
 */
export function BudgetGauge({
  personal,
  extras,
}: {
  personal: number;
  extras: number;
}) {
  const { tokens } = useTheme();
  const total = Math.max(1, personal + extras);
  return (
    <View
      accessible
      accessibilityLabel={`Next 7 days pay up to ${personal} kronor for the kids' own chores${extras > 0 ? `, plus up to ${extras} kronor in Extras` : ""}.`}
    >
      <View className="flex-row items-baseline justify-between">
        <AppText variant="cardTitle">Up to {personal} kr</AppText>
        {extras > 0 ? (
          <AppText variant="caption" color="ink-muted">
            + up to {extras} kr Extras
          </AppText>
        ) : null}
      </View>
      <View
        className="mt-2 h-3 flex-row overflow-hidden rounded-full"
        style={{ backgroundColor: tokens.surfaceMuted }}
      >
        <View
          style={{
            width: `${(personal / total) * 100}%`,
            backgroundColor: tokens.action,
          }}
        />
        <View
          style={{
            width: `${(extras / total) * 100}%`,
            backgroundColor: tokens.gold,
            opacity: 0.55,
          }}
        />
      </View>
      <AppText variant="caption" color="ink-muted" className="mt-1">
        Next 7 days, if every chore is done. Missed chores pay nothing.
      </AppText>
    </View>
  );
}
