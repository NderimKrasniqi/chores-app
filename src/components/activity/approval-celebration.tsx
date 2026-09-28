import { useQuery } from "convex/react";
import * as SecureStore from "expo-secure-store";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  FadeOut,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  ChoreIcon,
  CoinDrop,
  Confetti,
  Fireworks,
  PopIn,
  StarBuddy,
  Starfield,
  Sunburst,
  useEntrance,
} from "@/components/art";
import { ActionButton, AppText, ThemeScope } from "@/design-system";
import { useCelebrationsHeld } from "@/lib/celebration-gate";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ApprovalActivityItem } from "./approval-activity";

const AUTO_CLOSE_MS = 4500;
const TOAST_MS = 3000;

/** Newest approval this child has already been celebrated for. */
type Watermark = { at: number; ids: string[] };

type Celebration = {
  item: ApprovalActivityItem;
  moreCount: number;
  totalSek: number;
  /** Watermark to store once this celebration is dismissed. */
  seenUpTo: Watermark;
};

function storageKey(childId: Id<"children">) {
  return `approval-seen.${childId}`;
}

function isNewer(item: ApprovalActivityItem, mark: Watermark) {
  return (
    item.approvedAt > mark.at ||
    (item.approvedAt === mark.at && !mark.ids.includes(item.activityId))
  );
}

function markFor(items: ApprovalActivityItem[]): Watermark {
  const at = items.reduce((max, item) => Math.max(max, item.approvedAt), 0);
  return {
    at,
    ids: items
      .filter((item) => item.approvedAt === at)
      .map((item) => item.activityId),
  };
}

async function readWatermark(childId: Id<"children">) {
  const raw = await SecureStore.getItemAsync(storageKey(childId));
  if (!raw) return null;
  const parsed = JSON.parse(raw) as Watermark;
  return typeof parsed.at === "number" && Array.isArray(parsed.ids)
    ? parsed
    : null;
}

function writeWatermark(childId: Id<"children">, mark: Watermark) {
  SecureStore.setItemAsync(storageKey(childId), JSON.stringify(mark)).catch(
    () => {
      // Not critical: worst case this approval is celebrated again.
    },
  );
}

/**
 * Decides what to celebrate. The Child's own approvals get the full screen —
 * including ones that landed while the app was closed (a per-child watermark
 * in SecureStore). Siblings' approvals seen live get a small toast. A first
 * run only records a baseline, so old history never replays.
 */
function useApprovalCelebrations({
  items,
  viewerChildId,
  initialWatermark,
}: {
  items: ApprovalActivityItem[] | undefined;
  viewerChildId: Id<"children">;
  /** Preview fixtures skip storage. */
  initialWatermark?: Watermark;
}) {
  const [mark, setMark] = useState<Watermark | null | undefined>(
    initialWatermark,
  );
  const [shown, setShown] = useState<Celebration | null>(null);
  const [toast, setToast] = useState<ApprovalActivityItem | null>(null);
  // A failed read must never overwrite a good stored watermark.
  const [readFailed, setReadFailed] = useState(false);
  const persist = initialWatermark === undefined && !readFailed;

  // Load the watermark once. `null` = first run. A failed read falls back to
  // celebrating live approvals only, without persisting anything.
  useEffect(() => {
    if (initialWatermark !== undefined) return;
    let cancelled = false;
    readWatermark(viewerChildId).then(
      (stored) => {
        if (!cancelled) setMark(stored);
      },
      () => {
        if (cancelled) return;
        setReadFailed(true);
        setMark(null);
      },
    );
    return () => {
      cancelled = true;
    };
    // Read once per child; fixtures pass a watermark and never read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerChildId]);

  // First run: baseline at the current newest approval, celebrate nothing.
  if (mark === null && items !== undefined) setMark(markFor(items));

  // Every accepted watermark (baseline or dismissal) is persisted.
  useEffect(() => {
    if (persist && mark) writeWatermark(viewerChildId, mark);
  }, [mark, persist, viewerChildId]);

  // Siblings: toast only approvals that arrive while we're watching.
  const [prevItems, setPrevItems] = useState(items);
  if (items !== prevItems) {
    setPrevItems(items);
    if (prevItems && items) {
      // Only approvals newer than anything already seen: the feed is a
      // sliding window, so an older item can re-enter at the bottom.
      const newestSeen = prevItems.reduce(
        (max, item) => Math.max(max, item.approvedAt),
        0,
      );
      const fresh = items.find(
        (item) =>
          item.approvedAt > newestSeen && item.childId !== viewerChildId,
      );
      if (fresh) setToast(fresh);
    }
  }

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const own =
    items && mark
      ? items
          .filter(
            (item) => item.childId === viewerChildId && isNewer(item, mark),
          )
          .sort((a, b) => b.approvedAt - a.approvedAt)
      : [];

  // Snapshot what's on screen so new approvals queue behind it instead of
  // restarting it.
  if (!shown && own.length > 0) {
    setShown({
      item: own[0],
      moreCount: own.length - 1,
      totalSek: own.reduce((sum, item) => sum + item.valueSek, 0),
      seenUpTo: markFor([...own, ...(items ?? [])]),
    });
  }

  function dismiss() {
    if (!shown) return;
    setMark(shown.seenUpTo);
    setShown(null);
  }

  return { celebration: shown, toast, dismiss };
}

/** Mounted once in the child shell, so it works on every tab. */
export function ChildApprovalCelebrations({
  viewerChildId,
  visualFixture,
}: {
  viewerChildId: Id<"children">;
  visualFixture?: {
    items: ApprovalActivityItem[];
    /** Omit to celebrate every own item in `items`. */
    watermark?: Watermark;
    toast?: ApprovalActivityItem;
  };
}) {
  const insets = useSafeAreaInsets();
  const feed = useQuery(
    api.householdActivity.listForCurrentChild,
    visualFixture ? "skip" : {},
  );
  const held = useCelebrationsHeld();
  const { celebration, toast, dismiss } = useApprovalCelebrations({
    items: visualFixture ? visualFixture.items : feed?.items,
    viewerChildId,
    initialWatermark: visualFixture
      ? (visualFixture.watermark ?? { at: 0, ids: [] })
      : undefined,
  });
  const shownToast = visualFixture?.toast ?? toast;

  return (
    <>
      {shownToast && !celebration ? (
        <SiblingWinToast
          key={shownToast.activityId}
          item={shownToast}
          top={insets.top + 8}
        />
      ) : null}
      <Modal
        visible={celebration !== null && !held}
        transparent
        animationType="fade"
        onRequestClose={dismiss}
      >
        {celebration ? (
          <ThemeScope mode="quest">
            <CelebrationBody
              key={celebration.item.activityId}
              celebration={celebration}
              onDone={dismiss}
            />
          </ThemeScope>
        ) : null}
      </Modal>
    </>
  );
}

function CelebrationBody({
  celebration,
  onDone,
}: {
  celebration: Celebration;
  onDone: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { item, moreCount, totalSek } = celebration;
  // Latest onDone without restarting the timer when its identity changes.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    // No haptic: the Child didn't cause this entrance, a Parent did.
    // Announce after the modal has presented, or VoiceOver drops it.
    const announce = setTimeout(() => {
      AccessibilityInfo.announceForAccessibility(
        `Approved: ${item.choreTitle}, plus ${item.valueSek} kronor`,
      );
    }, 600);
    // Screen reader users close it themselves; 4.5 s is too short to hear it.
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    AccessibilityInfo.isScreenReaderEnabled()
      .catch(() => false)
      .then((enabled) => {
        if (!enabled && !cancelled) {
          timer = setTimeout(() => onDoneRef.current(), AUTO_CLOSE_MS);
        }
      });
    return () => {
      cancelled = true;
      clearTimeout(announce);
      clearTimeout(timer);
    };
  }, [item]);

  return (
    <Pressable
      // Tap anywhere closes it for sighted users; screen readers get the
      // content and the "Nice!" button as separate elements.
      accessible={false}
      onPress={onDone}
      className="flex-1 items-center bg-canvas px-6"
      style={{
        paddingTop: insets.top + 36,
        paddingBottom: Math.max(insets.bottom, 16) + 8,
      }}
    >
      <Starfield seed={item.choreTitle.length + 41} />
      <Fireworks width={width} height={height} seed={item.approvedAt % 89} />
      <Confetti count={22} seed={item.approvedAt % 97} />

      <Rise delay={0}>
        <AppText
          variant="label"
          color="primary"
          className="uppercase tracking-[2px]"
        >
          Approved!
        </AppText>
      </Rise>
      <View className="mt-2 h-[200px] w-[200px] items-center justify-center">
        <Sunburst size={260} />
        <PopIn>
          <View className="h-[132px] w-[132px] items-center justify-center rounded-full bg-surface">
            <ChoreIcon title={item.choreTitle} size={100} />
          </View>
        </PopIn>
      </View>
      <Rise delay={120}>
        <AppText variant="display" className="mt-4 text-center">
          {item.choreTitle}
        </AppText>
      </Rise>

      <View className="mt-2 items-center">
        <CoinDrop value={item.valueSek} size={150} />
      </View>
      <Rise delay={1150} className="items-center">
        <AppText className="mt-3 font-display text-[26px]" color="gold">
          +{item.valueSek} kr loaded into your cargo pod
        </AppText>
        {moreCount > 0 ? (
          <AppText
            variant="bodySmall"
            color="ink-muted"
            className="mt-1 font-body-bold"
          >
            +{moreCount} more approved · +{totalSek} kr in total
          </AppText>
        ) : null}
      </Rise>

      <View className="flex-1" />
      <Rise delay={1250} className="w-full flex-row items-end gap-3">
        <StarBuddy size={64} mood="dance" />
        <ActionButton className="flex-1" label="Nice!" onPress={onDone} />
      </Rise>
    </Pressable>
  );
}

/** Staggered rise-in so the celebration builds instead of landing at once. */
function Rise({
  delay,
  children,
  className,
}: {
  delay: number;
  children: ReactNode;
  className?: string;
}) {
  const enter = useEntrance({ delay, duration: 300 });
  const style = useAnimatedStyle(() => ({
    opacity: enter.get(),
    transform: [{ translateY: interpolate(enter.get(), [0, 1], [8, 0]) }],
  }));
  return (
    <Animated.View style={style} className={className}>
      {children}
    </Animated.View>
  );
}

/** A sibling's win: a small pill from the top. Values only, never balances. */
function SiblingWinToast({
  item,
  top,
}: {
  item: ApprovalActivityItem;
  top: number;
}) {
  const enter = useEntrance({ duration: 260 });
  useEffect(() => {
    // accessibilityLiveRegion is Android-only.
    AccessibilityInfo.announceForAccessibility(
      `${item.childDisplayName} earned ${item.valueSek} kronor for ${item.choreTitle}`,
    );
  }, [item]);
  const style = useAnimatedStyle(() => ({
    opacity: enter.get(),
    transform: [{ translateY: interpolate(enter.get(), [0, 1], [-24, 0]) }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      exiting={FadeOut.duration(200)}
      accessibilityLiveRegion="polite"
      style={[{ position: "absolute", top, left: 20, right: 20 }, style]}
      className="z-10 flex-row items-center gap-3 rounded-full bg-surface py-2 pl-2 pr-4"
    >
      <View className="h-9 w-9 items-center justify-center rounded-full bg-primary">
        <ChoreIcon title={item.choreTitle} size={26} />
      </View>
      <AppText className="flex-1 font-body-heavy text-[14px]" numberOfLines={2}>
        {item.childDisplayName} earned {item.valueSek} kr · {item.choreTitle}
      </AppText>
    </Animated.View>
  );
}
