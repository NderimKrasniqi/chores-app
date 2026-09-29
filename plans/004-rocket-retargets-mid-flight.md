# 004 — Let the quest-map rocket change course mid-flight instead of teleporting

- **Status**: DONE
- **Commit**: e6d90b3
- **Severity**: MEDIUM
- **Category**: Interruptibility
- **Estimated scope**: 1 file, ~30 lines in one `useEffect`

## Problem

The kid's rocket on the star map (Quests tab) flies to the next planet over
`350ms delay + 1500ms` whenever its dock changes. The effect that starts the
flight doesn't handle a dock change that arrives while a flight is running.
Two branches throw away the flight in progress:

```tsx
// src/components/art/star-map.tsx:534-569 — current (excerpt)
useEffect(() => {
  if (held) return;
  const from = last.current;
  if (from.key === targetKey && from.x === targetX && from.y === targetY) {
    return;
  }
  last.current = { key: targetKey, x: targetX, y: targetY };
  flight.set({ ax: from.x, ay: from.y, bx: targetX, by: targetY });
  if (reducedMotion) {
    progress.set(1);
    return;
  }
  if (from.key === targetKey) {
    // Same stop, the map just moved: re-seat quietly instead of flying.
    progress.set(1);                 // <- mid-flight: rocket snaps to the end
    return;
  }
  if (from.x === targetX && from.y === targetY) {
    ... hop ...
    return;
  }
  progress.set(0);                   // <- mid-flight: rocket jumps back to `from`
  progress.set(
    withDelay(350, withTiming(1, { duration: FLIGHT_MS, easing: Easings.inOut })),
  );
  land.set(withDelay(350 + FLIGHT_MS, withSequence(/* squash */)));
}, [...]);
```

- **Same stop, map moved, mid-flight** (`star-map.tsx:546-549`): a sent quest
  folds into the asteroid belt right as the rocket leaves. The belt appearing
  shifts every planet, and `onLayout` reports the new dock in a later render.
  `progress.set(1)` ends the flight in one frame, so the rocket teleports to
  the planet.
- **New stop mid-flight** (`star-map.tsx:563`): `progress.set(0)` restarts the
  flight from `from`, which is the _previous target_ and not where the rocket is
  now, so it jumps backwards before flying again.

This is the kid's main "you did it, on to the next one" moment on the
most-visited screen. Code alone can't show how often the layout-shift case
fires, so the feel check below includes reproducing it.

## Target

When the dock changes and a flight is running (`0 < progress < 1`), rebase:
start a new flight **from the rocket's current on-screen point** (the same
`curveAt` the style worklet uses) to the new dock, over the **remaining time**
(`max(300, FLIGHT_MS * (1 - t))` ms) with **no delay**, using
**`Easings.out` = `Easing.bezier(0.23, 1, 0.32, 1)`**. It starts fast, so the
rocket doesn't stall to zero speed the way a restarted ease-in-out would. Then
reschedule the landing squash to the end of the rebased flight. When nothing is
in flight, keep today's behaviour exactly (re-seat / hop / full flight).

## Repo conventions to follow

- Motion vocabulary: `Easings` in `src/components/art/motion.ts` (`out`, `inOut`).
- `curveAt` (`star-map.tsx:470-498`) is marked `'worklet'`, but you can also call it as a plain function on the JS side (inside the effect).
- Shared values: `.get()` / `.set()` only. Reading `progress.get()` / `flight.get()` inside an effect is fine. Never read them during render.
- Assigning a new animation to a shared value (`land.set(...)`, `progress.set(...)`) cancels the one it replaces.

## Steps

1. In `src/components/art/star-map.tsx`, inside `Rocket`'s `useEffect` (starts line 534), right after
   `last.current = { key: targetKey, x: targetX, y: targetY };` and **before**
   `flight.set({ ax: from.x, ... })`, insert:
   ```tsx
   const t = progress.get();
   if (!reducedMotion && t > 0 && t < 1) {
     // Mid-flight and the dock moved (the map reflowed, or the next quest
     // changed): change course from where the rocket is now, over the time
     // it had left, instead of snapping to the end or back to the start.
     const here = curveAt(flight.get(), t);
     const remaining = Math.max(300, FLIGHT_MS * (1 - t));
     flight.set({ ax: here.x, ay: here.y, bx: targetX, by: targetY });
     progress.set(0);
     progress.set(withTiming(1, { duration: remaining, easing: Easings.out }));
     land.set(
       withDelay(
         remaining,
         withSequence(
           withTiming(0.82, { duration: 110 }),
           withSpring(1, { duration: 450, dampingRatio: 0.5 }),
         ),
       ),
     );
     return;
   }
   ```
2. Leave every branch after it unchanged.

## Boundaries

- Do NOT change `FLIGHT_MS`, the 350 ms take-off delay, the landing squash values, `curveAt`, `Spark`, `RocketArt`, or the measuring / `dock` logic in `StarMap`.
- Do NOT change the `held` gate (flights wait while a quest card is open).
- Do NOT add dependencies.
- If the effect doesn't match the excerpt (drift since e6d90b3), STOP and report.

## Verification

- **Mechanical**: `npm run typecheck` and `npm run lint` pass.
- **Feel check** (device or simulator, kid profile with 3+ quests today, or `design-preview?state=child-home` with fixture data):
  - Open the current quest, hold to send, and let the card close. The rocket takes off after the card closes. While it flies, the sent quest folds into the belt and the map shifts. The rocket bends toward the planet's new spot and lands, with no teleport to the planet and no jump back.
  - Screen-record the send → fly sequence and step through it frame by frame: the rocket's position must change continuously every frame (no single-frame jumps of more than a few points).
  - First flight with nothing else changing: identical to before (350 ms pause, 1.5 s ease-in-out flight, squash on landing).
  - Reduce Motion on: the rocket re-seats instantly, as before.
- **Done when**: no sequence of quick sends or map reflows can make the rocket jump. It always moves from where it is.
