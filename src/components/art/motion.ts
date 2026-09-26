import { useEffect } from "react";
import {
  cancelAnimation,
  Easing,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type EasingFunction,
} from "react-native-reanimated";

const DEFAULT_EASING = Easing.inOut(Easing.ease);

/** Stable easing references — never create easings inline in a render. */
export const Easings = {
  linear: Easing.linear,
  outQuad: Easing.out(Easing.quad),
  inOut: DEFAULT_EASING,
} as const;

/**
 * A 0→1 looping progress value for ambient artwork. Stays at `rest` when the
 * user prefers reduced motion, so art renders as a calm still frame.
 */
export function useLoop({
  duration,
  delay = 0,
  reverse = false,
  easing = DEFAULT_EASING,
  rest = 0,
}: {
  duration: number;
  delay?: number;
  reverse?: boolean;
  easing?: EasingFunction;
  rest?: number;
}) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(rest);

  useEffect(() => {
    if (reducedMotion) {
      progress.value = rest;
      return;
    }
    progress.value = 0;
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing }), -1, reverse),
    );
    return () => cancelAnimation(progress);
  }, [delay, duration, easing, progress, reducedMotion, rest, reverse]);

  return progress;
}

/** One-shot 0→1 entrance value (rings drawing in, numbers popping). */
export function useEntrance(duration = 900, delay = 0) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(
      delay,
      withTiming(1, { duration, easing: Easing.out(Easing.back(1.6)) }),
    );
  }, [delay, duration, progress, reducedMotion]);

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
