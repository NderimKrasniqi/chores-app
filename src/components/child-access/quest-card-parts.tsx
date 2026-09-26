import { useEffect, type ReactNode } from "react";
import { AccessibilityInfo, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";

import { StarBuddy, Starfield, useEntrance, useLoop } from "@/components/art";
import { Easings } from "@/components/art/motion";
import { Icon, type IconName } from "@/components/ui/icon";
import { AppText } from "@/design-system";
import { questTokens as tokens } from "@/design-system/theme";

/** Building blocks shared by the full-screen quest cards (personal + Extras). */

const statePills: Record<string, { label: string; className: string }> = {
  available: { label: "Quest", className: "bg-accent" },
  claimed: { label: "Bonus quest", className: "bg-gold" },
  locked: { label: "Locked in", className: "bg-gold" },
  redo_required: { label: "Redo", className: "bg-pink" },
  submitted: { label: "Checking", className: "bg-nightDash" },
  approved: { label: "Done", className: "bg-primary" },
  missed: { label: "Missed", className: "bg-nightRaised" },
  failed: { label: "Missed", className: "bg-nightRaised" },
  scheduled: { label: "Coming up", className: "bg-gold" },
};

export function StatePill({ state }: { state: string }) {
  const pill = statePills[state] ?? {
    label: "Chore",
    className: "bg-nightRaised",
  };
  return (
    <View className={`rounded-full px-3.5 py-1.5 ${pill.className}`}>
      <AppText className="font-body-heavy text-[13px] uppercase tracking-[1.2px] text-night">
        {pill.label}
      </AppText>
    </View>
  );
}

export function Chip({
  icon,
  label,
  tone,
}: {
  icon: IconName;
  label: string;
  tone: "gold" | "pink" | "muted";
}) {
  const color =
    tone === "gold"
      ? tokens.gold
      : tone === "pink"
        ? tokens.pink
        : tokens.inkMuted;
  return (
    <View className="flex-row items-center gap-1.5 rounded-full bg-surface px-3 py-2">
      <Icon name={icon} color={color} size={14} />
      <AppText className="font-body-heavy text-[14px]" style={{ color }}>
        {label}
      </AppText>
    </View>
  );
}

export function Panel({
  art,
  title,
  children,
  tone,
}: {
  art: ReactNode;
  title: string;
  children: ReactNode;
  tone?: "pink";
}) {
  return (
    <View
      className={`flex-row items-center gap-4 rounded-large p-4 ${tone === "pink" ? "bg-urgencySoft" : "bg-surface"}`}
    >
      {art}
      <View className="flex-1">
        <AppText variant="cardTitle" className="font-display">
          {title}
        </AppText>
        <AppText
          variant="bodySmall"
          color="ink-muted"
          className="mt-1 font-body-bold"
        >
          {children}
        </AppText>
      </View>
    </View>
  );
}

export function FlippingHourglass() {
  const progress = useLoop({ duration: 3000, easing: Easings.linear });
  const style = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(progress.get(), [0, 0.42, 0.58, 1], [0, 0, 180, 180])}deg`,
      },
    ],
  }));
  return (
    <View className="h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-inkMuted bg-nightRaised">
      <Animated.View style={style}>
        <Icon name="hourglass" color={tokens.star} size={28} />
      </Animated.View>
    </View>
  );
}

/** After sending: the buddy flies the work off to a Parent, then we close. */
export function SentOverlay({ onDone }: { onDone: () => void }) {
  const progress = useEntrance({ duration: 900 });
  const flight = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.get(), [0, 1], [60, -30]) },
      { rotate: `${interpolate(progress.get(), [0, 1], [-8, 6])}deg` },
    ],
    opacity: interpolate(progress.get(), [0, 0.2, 1], [0, 1, 1]),
  }));

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility("Sent to a Parent for review");
    const timer = setTimeout(onDone, 1700);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityLabel="Sent to a Parent for review"
      className="absolute inset-0 items-center justify-center bg-canvas"
    >
      <Starfield seed={77} />
      <Animated.View style={flight} className="items-center">
        <StarBuddy size={96} mood="hop" />
        <View
          className="-mt-2 h-14 w-12 rounded-[5px] bg-white"
          style={{ transform: [{ rotate: "8deg" }] }}
        />
      </Animated.View>
      <AppText variant="screenTitle" className="mt-8">
        Sent!
      </AppText>
      <AppText color="ink-muted" className="mt-1 font-body-bold">
        A Parent will check it soon.
      </AppText>
    </View>
  );
}
