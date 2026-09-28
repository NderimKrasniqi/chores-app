import { useQuery } from "convex/react";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import Animated, {
  FadeOut,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HighFiveHand, useEntrance } from "@/components/art";
import { AppText } from "@/design-system";
import { useTheme } from "@/design-system/theme";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const SHOW_MS = 3500;

type Cheer = {
  cheerId: string;
  fromDisplayName: string;
  choreTitle: string;
  createdAt: number;
};

/**
 * When a brother or sister high-fives one of your wins, a small pill drops
 * in from the top, once: "Maya high-fived your Walk the dog". The newest
 * unseen one only; the rest are already counted as seen.
 */
export function CheerToast({ childId }: { childId: Id<"children"> }) {
  const insets = useSafeAreaInsets();
  const data = useQuery(api.cheers.listMine, {});
  const [seen, setSeen] = useState<number | null | undefined>(undefined);
  const [shown, setShown] = useState<Cheer | null>(null);
  const key = `cheers-seen.${childId}`;

  useEffect(() => {
    let cancelled = false;
    SecureStore.getItemAsync(key)
      .then((raw) => (raw && Number.isFinite(Number(raw)) ? Number(raw) : null))
      .catch(() => null)
      .then((value) => {
        if (!cancelled) setSeen(value);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const newest = data?.received[0];
  // Decide during render: a first visit counts everything as seen.
  if (newest && seen !== undefined && newest.createdAt > (seen ?? Infinity)) {
    setShown(newest);
    setSeen(newest.createdAt);
  } else if (newest && seen === null) {
    // First look on this phone: older high-fives count as seen.
    setSeen(newest.createdAt);
  } else if (data && !newest && seen === null) {
    // None yet: from here on, the first one that arrives shows.
    setSeen(0);
  }

  useEffect(() => {
    if (typeof seen !== "number") return;
    SecureStore.setItemAsync(key, String(seen)).catch(() => {});
  }, [key, seen]);

  useEffect(() => {
    if (!shown) return;
    const timer = setTimeout(() => setShown(null), SHOW_MS);
    return () => clearTimeout(timer);
  }, [shown]);

  if (!shown) return null;
  return <CheerPill key={shown.cheerId} cheer={shown} top={insets.top + 8} />;
}

function CheerPill({ cheer, top }: { cheer: Cheer; top: number }) {
  const { tokens } = useTheme();
  const enter = useEntrance({ duration: 260 });
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(
      `${cheer.fromDisplayName} high-fived your ${cheer.choreTitle}`,
    );
  }, [cheer]);
  const style = useAnimatedStyle(() => ({
    opacity: enter.get(),
    transform: [{ translateY: interpolate(enter.get(), [0, 1], [-24, 0]) }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      exiting={FadeOut.duration(200)}
      style={[{ position: "absolute", top, left: 20, right: 20 }, style]}
      className="z-10 flex-row items-center gap-3 rounded-full bg-surface py-2 pl-2 pr-4"
    >
      <Animated.View
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: tokens.gold }}
      >
        <HighFiveHand size={20} color={tokens.night} />
      </Animated.View>
      <AppText className="flex-1 font-body-heavy text-[14px]" numberOfLines={2}>
        {cheer.fromDisplayName} high-fived your {cheer.choreTitle}
      </AppText>
    </Animated.View>
  );
}
