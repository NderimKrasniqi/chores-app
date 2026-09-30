import { useEffect, useRef, useState, type ReactNode } from "react";
import Animated, { cubicBezier, Easing, FadeIn } from "react-native-reanimated";

/** How long a screen's content takes to fade away before it's replaced. */
export const ENTRY_FADE_OUT_MS = 200;
export const ENTRY_FADE_IN_MS = 260;

// A standard ease, not the app's strong ease-out: on opacity the strong
// curve does ~80% of the fade in the first frame, which reads as a cut.
export const entryFadeIn = FadeIn.duration(ENTRY_FADE_IN_MS).easing(
  Easing.bezier(0.25, 0.1, 0.25, 1),
);

const fadeOut = {
  transitionProperty: "opacity",
  transitionDuration: `${ENTRY_FADE_OUT_MS}ms`,
  transitionTimingFunction: cubicBezier(0.25, 0.1, 0.25, 1),
} as const;

/**
 * The content of a getting-in screen (chooser, join, waiting), fading in
 * when it appears and out before it's replaced. The Starfield stays outside
 * it, so moving between screens is one motion over a still sky instead of
 * a hard cut.
 */
export function EntryFade({
  leaving = false,
  children,
}: {
  leaving?: boolean;
  children: ReactNode;
}) {
  return (
    <Animated.View entering={entryFadeIn} style={{ flex: 1 }}>
      <Animated.View style={[{ flex: 1, opacity: leaving ? 0 : 1 }, fadeOut]}>
        {children}
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Fade the screen's content out, then run `next` (usually the switch that
 * replaces the screen). Taps while fading are ignored, so a double tap
 * can't run the switch twice. If the screen is still here afterwards — the
 * switch failed without replacing it — the content fades back in.
 */
export function useLeave() {
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function leave(next: () => void) {
    if (timer.current) return;
    setLeaving(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      next();
      setLeaving(false);
    }, ENTRY_FADE_OUT_MS);
  }
  return { leaving, leave };
}
