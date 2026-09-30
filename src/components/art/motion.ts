import { useEffect } from "react";
import {
  cancelAnimation,
  cubicBezier,
  Easing,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type EasingFunction,
  type EasingFunctionFactory,
} from "react-native-reanimated";

/**
 * Motion vocabulary for Quest Path. Curves are strong custom beziers — the
 * built-in easings are too weak — and never ease-in on UI (it delays the
 * moment the user is watching). Keep references stable: never build an
 * easing inline in render, or loops restart on every re-render.
 */
export const Easings = {
  /** Entering / exiting and press feedback. */
  out: Easing.bezier(0.23, 1, 0.32, 1),
  /** Moving or morphing on screen. */
  inOut: Easing.bezier(0.77, 0, 0.175, 1),
  /** iOS sheet curve. */
  sheet: Easing.bezier(0.32, 0.72, 0, 1),
  /** Constant motion: rotating rays, flowing dashes, falling confetti. */
  linear: Easing.linear,
  /** Gentle sine for breathing/floating decoration. */
  float: Easing.inOut(Easing.sin),
} as const;

/** Press feedback: near-imperceptible, because it's felt tens of times a day. */
export const PRESS = { scale: 0.97, durationMs: 120 } as const;

/** Reanimated CSS transition for pressables — transform only. */
export const pressTransition = {
  transitionProperty: "transform",
  transitionDuration: `${PRESS.durationMs}ms`,
  transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
} as const;

/**
 * A 0→1 looping progress value for ambient artwork.
 *
 * Reduced motion means gentler, not zero: loops marked `essential` keep
 * running (callers must then animate opacity only), everything else rests on
 * a calm still frame at `rest`.
 */
export function useLoop({
  duration,
  delay = 0,
  reverse = false,
  easing = Easings.float,
  rest = 0,
  essential = false,
}: {
  duration: number;
  delay?: number;
  reverse?: boolean;
  easing?: EasingFunction | EasingFunctionFactory;
  rest?: number;
  essential?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(rest);
  const still = reducedMotion && !essential;

  useEffect(() => {
    if (still) {
      progress.set(rest);
      return;
    }
    progress.set(0);
    progress.set(
      withDelay(
        delay,
        withRepeat(withTiming(1, { duration, easing }), -1, reverse),
      ),
    );
    return () => cancelAnimation(progress);
  }, [delay, duration, easing, progress, rest, reverse, still]);

  return progress;
}

/**
 * Like `useLoop`, but anchored to the wall clock instead of to when the
 * component mounted: every copy with the same duration and phase is at the
 * same point at the same moment. Use it for backgrounds shared by screens
 * that replace each other (the entry sky), so a screen change doesn't
 * restart every twinkle at once. `phase` (ms) spreads copies apart.
 */
export function useClockLoop({
  duration,
  phase = 0,
  reverse = false,
  easing = Easings.float,
  rest = 0,
  essential = false,
}: {
  duration: number;
  phase?: number;
  reverse?: boolean;
  easing?: EasingFunction | EasingFunctionFactory;
  rest?: number;
  essential?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(rest);
  const still = reducedMotion && !essential;

  useEffect(() => {
    if (still) {
      progress.set(rest);
      return;
    }
    const period = reverse ? duration * 2 : duration;
    const t = (Date.now() + phase) % period;
    const rising = t < duration;
    const through = (rising ? t : t - duration) / duration;
    // Finish the current leg (linearly — a slight easing mismatch on one
    // partial leg is invisible), then loop as usual.
    progress.set(rising ? through : 1 - through);
    const remaining = Math.max(1, duration * (1 - through));
    const finishLeg = withTiming(rising ? 1 : 0, {
      duration: remaining,
      easing: Easings.linear,
    });
    progress.set(
      reverse
        ? withSequence(
            finishLeg,
            withRepeat(
              withTiming(rising ? 0 : 1, { duration, easing }),
              -1,
              true,
            ),
          )
        : withSequence(
            finishLeg,
            withRepeat(
              withSequence(
                withTiming(0, { duration: 0 }),
                withTiming(1, { duration, easing }),
              ),
              -1,
            ),
          ),
    );
    return () => cancelAnimation(progress);
  }, [duration, easing, phase, progress, rest, reverse, still]);

  return progress;
}

/**
 * One-shot 0→1 entrance. `playful` settles with a small spring (delight tier
 * only: celebrations); otherwise a strong ease-out with no overshoot.
 */
export function useEntrance({
  delay = 0,
  playful = false,
  duration = 300,
}: { delay?: number; playful?: boolean; duration?: number } = {}) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      progress.set(1);
      return;
    }
    progress.set(
      withDelay(
        delay,
        playful
          ? withSpring(1, { duration: 500, dampingRatio: 0.7 })
          : withTiming(1, { duration, easing: Easings.out }),
      ),
    );
  }, [delay, duration, playful, progress, reducedMotion]);

  return progress;
}

/** Deterministic pseudo-random numbers so artwork layouts are stable. */
export function seeded(seed: number) {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}
