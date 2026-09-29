# 002 — Start the review swipe and slide-to-pay from where the element is

- **Status**: DONE
- **Commit**: e6d90b3
- **Severity**: MEDIUM
- **Category**: Interruptibility
- **Estimated scope**: 2 files, ~6 lines each

## Problem

The two parent gestures write the finger's total translation straight into the
shared value, so they always count from 0. If the parent grabs the card or the
knob while it's still springing back from a short drag, it jumps: back to 0
plus the finger's offset instead of continuing from where the eye last saw it.
The review deck is the parent's most-used gesture (tens of cards a day), and
"try again after a near miss" is exactly when this happens.

```tsx
// src/components/chores/review-deck.tsx:157-163 — current
const pan = Gesture.Pan()
  .enabled(!busy && !committing)
  .activeOffsetX([-12, 12])
  .failOffsetY([-14, 14])
  .onUpdate((event) => {
    x.set(event.translationX);
  });
```

```tsx
// src/components/household/parent-money-content.tsx:755-761 — current
const pan = Gesture.Pan()
  .enabled(!busy && !disabled && travel > 0)
  .activeOffsetX([0, 12])
  .failOffsetY([-10, 10])
  .onUpdate((event) => {
    x.set(Math.min(travel, Math.max(0, event.translationX)));
  });
```

The snap-backs they interrupt are `withSpring(0, { duration: 400, dampingRatio: 0.8, velocity })`
(`review-deck.tsx:177-183`, `parent-money-content.tsx:767-773`), so there's a
400 ms window after every short drag where a new grab teleports the card or knob.

## Target

Each gesture captures the current on-screen value when the finger lands, and
adds the translation to it. Writing to the shared value in `onUpdate` already
cancels the running spring, so nothing else is needed.

```tsx
// target — review-deck.tsx
const dragStart = useSharedValue(0);
...
  .onStart(() => {
    dragStart.set(x.get()); // continue from where the card is, mid-spring
  })
  .onUpdate((event) => {
    x.set(dragStart.get() + event.translationX);
  })
```

```tsx
// target — parent-money-content.tsx (SlideToPay)
const dragStart = useSharedValue(0);
...
  .onStart(() => {
    dragStart.set(x.get());
  })
  .onUpdate((event) => {
    x.set(Math.min(travel, Math.max(0, dragStart.get() + event.translationX)));
  })
```

The rest stays as it is: the verdict logic in `onEnd` (`review-deck.tsx:164-185`),
the 90% commit threshold and the springs in `parent-money-content.tsx:762-775`.

Note on `review-deck.tsx`'s `onEnd`: it decides using `event.translationX`
(`const dx = event.translationX;`). Change that line to `const dx = x.get();`,
so a grab that started mid-spring is judged on where the card actually is,
which is the tilt and stamp the parent saw. Leave the flick check's
`event.velocityX` alone.

## Repo conventions to follow

- Shared values use `.get()` / `.set()`, never `.value` (React Compiler is on: `app.json` `"reactCompiler": true`). See `src/design-system/hold-button.tsx:62-66`.
- `useSharedValue` is already imported in both files.

## Steps

1. `src/components/chores/review-deck.tsx`, in `TopCard`:
   a. Below `const x = useSharedValue(0);` (line 126), add `const dragStart = useSharedValue(0);`.
   b. In the `Gesture.Pan()` chain (line 157), insert between `.failOffsetY([-14, 14])` and `.onUpdate(...)`:
   ```tsx
   .onStart(() => {
     // Continue from where the card is, even mid-spring.
     dragStart.set(x.get());
   })
   ```
   c. Change the `onUpdate` body from `x.set(event.translationX);` to `x.set(dragStart.get() + event.translationX);`.
   d. In `onEnd`, change `const dx = event.translationX;` to `const dx = x.get();`.
2. `src/components/household/parent-money-content.tsx`, in `SlideToPay`:
   a. Below `const x = useSharedValue(0);` (line 728), add `const dragStart = useSharedValue(0);`.
   b. In the `Gesture.Pan()` chain (line 755), insert between `.failOffsetY([-10, 10])` and `.onUpdate(...)`:
   ```tsx
   .onStart(() => {
     dragStart.set(x.get());
   })
   ```
   c. Change the `onUpdate` body to `x.set(Math.min(travel, Math.max(0, dragStart.get() + event.translationX)));`.

## Boundaries

- Do NOT change thresholds (`SWIPE_DISTANCE`, `SWIPE_VELOCITY`, the 0.9 commit point), spring configs, haptics or `commit()` logic.
- Do NOT wrap the gestures in `useMemo` or convert to other APIs. Out of scope.
- Do NOT touch any other file.
- If the code at the cited lines doesn't match (drift since e6d90b3), STOP and report.

## Verification

- **Mechanical**: `npm run typecheck` and `npm run lint` pass.
- **Feel check**. Use a real device if you can: gestures can't be judged in the simulator.
  - Reviews (parent Home → chores to check, or the design-preview reviews state, which acts on local cards): drag a card about 30% right and let go short of the threshold. While it springs back, grab it again. It stays under the finger and keeps moving from where it was, with no jump to center.
  - Do the same left (redo side). The "Redo" stamp opacity follows the card smoothly through the regrab.
  - A clean full swipe or a flick still approves or asks for a redo exactly as before.
  - Money → payday dock → Slide to pay: drag the coin halfway, release, then regrab it mid-return. It continues from where it is. A full slide still commits. A drag that ends under 90% still springs back.
  - Slow the device animations (iOS: Accessibility → Motion → Reduce Motion OFF; Android: Developer options → Animator duration scale 5x) to make the regrab window easy to hit.
- **Done when**: neither the review card nor the pay knob can be made to jump by grabbing it during its snap-back.
