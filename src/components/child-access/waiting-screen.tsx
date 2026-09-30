import { StatusBar } from "expo-status-bar";
import { useEffect, useState, type ReactNode } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";

import { ENTRY_SKY_SEED, StarBuddy, Starfield } from "@/components/art";
import { AppText, ThemeScope } from "@/design-system";

import { entryFadeIn } from "./entry-fade";

/** Short waits show only the sky; the buddy and words appear after this. */
const SHOW_AFTER_MS = 400;
/** A waiting screen mounting within this long of the last one continues it. */
const SAME_WAIT_WITHIN_MS = 300;

// Getting in is often several quick steps, each mounting its own waiting
// screen (and React creates the next before it removes the last). The
// 400 ms is counted from the start of the whole wait, not from each step —
// otherwise a run of short steps would leave the sky empty the whole time.
let mountedNow = 0;
let lastUnmountAt = 0;
let waitStartedAt = 0;

function useShowAfterDelay() {
  const [{ visible: initiallyVisible, remaining }] = useState(() => {
    const now = Date.now();
    if (mountedNow === 0 && now - lastUnmountAt > SAME_WAIT_WITHIN_MS) {
      waitStartedAt = now;
    }
    const waited = now - waitStartedAt;
    return {
      visible: waited >= SHOW_AFTER_MS,
      remaining: SHOW_AFTER_MS - waited,
    };
  });
  const [visible, setVisible] = useState(initiallyVisible);

  useEffect(() => {
    mountedNow += 1;
    return () => {
      mountedNow -= 1;
      lastUnmountAt = Date.now();
    };
  }, []);

  useEffect(() => {
    if (visible) return;
    const timer = setTimeout(() => setVisible(true), remaining);
    return () => clearTimeout(timer);
  }, [remaining, visible]);

  // Already showing when this step began: carry on without fading in again.
  return { visible, continued: initiallyVisible };
}

/**
 * The one "please wait" screen for getting into the app. Every step of
 * signing in or setting up a Child (session, access check, profile open)
 * shows this same picture on the entry sky, so a few quick steps in a row
 * read as one short wait — only the small line underneath changes. A step
 * that's over quickly shows just the sky.
 */
export function WaitingScreen({
  title = "Getting things ready",
  message,
  sleepy = false,
  children,
}: {
  title?: string;
  message: string;
  /** Taking too long: the buddy dozes off while the actions below appear. */
  sleepy?: boolean;
  children?: ReactNode;
}) {
  const { visible, continued } = useShowAfterDelay();
  return (
    <ThemeScope mode="quest">
      <View className="flex-1 items-center justify-center bg-canvas px-6">
        <StatusBar style="light" />
        <Starfield seed={ENTRY_SKY_SEED} />
        {visible ? (
          <Animated.View
            entering={continued ? undefined : entryFadeIn}
            className="w-full items-center"
          >
            <StarBuddy size={84} mood={sleepy ? "sleepy" : "hop"} />
            <AppText variant="sectionTitle" className="mt-6 text-center">
              {title}
            </AppText>
            <AppText
              color="ink-muted"
              className="mt-1 text-center font-body-bold"
            >
              {message}
            </AppText>
            {children}
          </Animated.View>
        ) : null}
      </View>
    </ThemeScope>
  );
}
