# 006 — Make the launch splash hand-off a quick, plain fade

- **Status**: DONE
- **Commit**: e6d90b3
- **Severity**: MEDIUM
- **Category**: Easing & duration
- **Estimated scope**: 1 file, ~20 lines

## Problem

Every cold launch ends with `AnimatedSplashOverlay` covering the first frame
and fading it out. That fade is the last thing between the user and the app,
and it's slow and ease-in-shaped:

```tsx
// src/components/animated-icon.tsx:17-34 — current (built inside render)
const splashKeyframe = new Keyframe({
  0: { transform: [{ scale: 1 }], opacity: 1 },
  20: { opacity: 1 },
  70: { opacity: 0, easing: Easing.elastic(0.7) },
  100: { opacity: 0, transform: [{ scale: 1 }], easing: Easing.elastic(0.7) },
});
...
entering={splashKeyframe.duration(DURATION).withCallback(...)}   // DURATION = 600
```

- It holds at full opacity for 120 ms (0–20%), then fades over 300 ms with
  `Easing.elastic(0.7)`, which starts slowly (ease-in-like) and overshoots.
  The user waits about 420 ms of splash before they can see the app, and
  another 180 ms before the overlay is gone.
- Opacity can't bounce, so the elastic overshoot does nothing but make the
  start slow. Never ease-in on UI.
- The `Keyframe` is rebuilt on every render of the overlay. Builders belong at
  module scope.

## Target

- **Fade only, 250ms, `Easings.out`** (`Easing.bezier(0.23, 1, 0.32, 1)`),
  starting at once with no hold and no scale keys.
- Module-scope keyframe.
- Reduced motion needs no special case: a short opacity fade is what reduced
  motion keeps.

```tsx
// target — module scope
const splashFadeOut = new Keyframe({
  0: { opacity: 1 },
  100: { opacity: 0, easing: Easings.out },
});
const SPLASH_FADE_MS = 250;
...
entering={splashFadeOut.duration(SPLASH_FADE_MS).withCallback((finished) => {
  "worklet";
  if (finished) scheduleOnRN(setVisible, false);
})}
```

## Repo conventions to follow

- Easings come from `src/components/art/motion.ts` (`Easings.out`).
- Layout-animation builders at module scope: `AnimatedIcon`'s keyframes already live at module scope in the same file (`animated-icon.tsx:69-103`).
- Keep `scheduleOnRN` from `react-native-worklets` (not `runOnJS`).

## Steps

1. In `src/components/animated-icon.tsx`, add `import { Easings } from "@/components/art/motion";`.
2. Delete the `splashKeyframe` construction inside `AnimatedSplashOverlay` (lines 17-34).
3. Above `export function AnimatedSplashOverlay`, add:
   ```tsx
   /** The splash hands off to the app with a quick fade: no hold, no bounce. */
   const splashFadeOut = new Keyframe({
     0: { opacity: 1 },
     100: { opacity: 0, easing: Easings.out },
   });
   const SPLASH_FADE_MS = 250;
   ```
4. In the `entering` prop (line 45), replace `splashKeyframe.duration(DURATION)` with `splashFadeOut.duration(SPLASH_FADE_MS)`. Keep the `.withCallback(...)` body exactly as it is.
5. Leave `DURATION` and the `AnimatedIcon` keyframes as they are (`AnimatedIcon` still uses `DURATION`).

## Boundaries

- Do NOT change the splash image, background colour, `app.json`, or the `onLayout` → `SplashScreen.hideAsync()` hand-off.
- Do NOT change `AnimatedIcon`.
- If `animated-icon.tsx` doesn't match the excerpt (drift since e6d90b3), STOP and report.

## Verification

- **Mechanical**: `npm run typecheck` and `npm run lint` pass.
- **Feel check** (a release or dev build on device; Expo Go also shows it):
  - Kill the app and cold-launch it 3 times. The splash fades straight into the first screen in about ¼ s, with no pause at full opacity and no visible pulse.
  - Screen-record and step frame by frame: opacity drops from the first frame of the fade and is gone after about 15 frames at 60 fps.
  - The first screen (loading stars / onboarding / Home) is already laid out under the fade, with no flash of a blank canvas.
- **Done when**: cold launch shows the app about 350 ms sooner and the hand-off reads as one quick fade.
