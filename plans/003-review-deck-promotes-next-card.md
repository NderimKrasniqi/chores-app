# 003 — Move the next review card forward instead of teleporting it

- **Status**: DONE
- **Commit**: e6d90b3
- **Severity**: MEDIUM
- **Category**: Physicality & origin / Missed opportunities
- **Estimated scope**: 1 file, ~40 lines

## Problem

The review deck draws the next two submissions as static cards behind the top
card, offset down and shrunk by depth:

```tsx
// src/components/chores/review-deck.tsx:94-110 — current
function BackCard({ item, depth }: { item: DeckItem; depth: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        transform: [{ translateY: depth * 14 }, { scale: 1 - depth * 0.05 }],
        opacity: 1 - depth * 0.25,
      }}
    >
      <CardFace item={item} submittedLabel={() => ""} compact />
    </View>
  );
}
```

When a card is approved it flies off. When the server confirms, `items` drops
it and the deck re-renders. The card that sat at depth 1 (translateY 14,
scale 0.95, opacity 0.75) is replaced in a single frame by a new `TopCard`
(keyed by `submissionId`, `review-deck.tsx:82-88`) at full size and opacity.
The card at depth 2 jumps to depth 1. The deck teleports forward, which
throws away the spatial story the stack set up ("the next one is right
behind"). Parents clear several cards in a row, tens of times a day.

## Target

- **Back cards glide between depths.** `BackCard` becomes an `Animated.View`
  with a Reanimated CSS transition on `transform` and `opacity`: **250ms,
  `cubic-bezier(0.23, 1, 0.32, 1)`** (the repo's strong ease-out). A card going
  from depth 2 to depth 1 moves up and grows.
- **The promoted top card rises from the back-card pose.** A `TopCard` that
  shows up because the previous one left starts at the depth-1 pose
  (translateY **14**, scale **0.95**, opacity **0.75**) and settles to
  translateY 0, scale 1, opacity 1 over **250ms, Easings.out**. The first top
  card shown when the deck opens doesn't animate.
- **Reduced motion:** `useEntrance` already returns 1 at once under reduced
  motion, so the promoted card appears in place. The back-card transition is
  short and small, so it stays.

## Repo conventions to follow

- Motion vocabulary: `src/components/art/motion.ts`. Use `Easings.out` for the worklet side and `useEntrance({ duration })` for one-shot 0→1 progress (it handles reduced motion).
- CSS transitions: `pressTransition` in `motion.ts:39-43` is the exemplar (`transitionProperty` / `transitionDuration` / `transitionTimingFunction: cubicBezier(...)`, with `cubicBezier` imported from `react-native-reanimated`).
- "Animate only when it changed while watching" exemplar: `PadSlot` in `src/components/chores/claimable-chores-view.tsx:445-446`:
  ```tsx
  const [firstClaimId] = useState(claim?.claimId);
  const launched = claim !== undefined && claim.claimId !== firstClaimId;
  ```
- Conditional entrance exemplar: `Patch` in `src/components/art/crew.tsx:146-157` (`useEntrance({ duration: isNew ? 600 : 1 })` + `if (!isNew) return {}` in the style).
- Shared values: `.get()` / `.set()` only.

## Steps

1. Imports in `src/components/chores/review-deck.tsx`:
   - Add `cubicBezier` to the existing `react-native-reanimated` import.
   - Change `import { ChoreIcon } from "@/components/art";` to `import { ChoreIcon, useEntrance } from "@/components/art";`.
   - Add `import { Easings } from "@/components/art/motion";` only if you need it (the style below uses `interpolate` on `useEntrance`'s progress, which already eases with `Easings.out`, so you probably won't).
   - `useState` is already imported.

2. Add a module-scope constant under `SWIPE_VELOCITY`:

   ```tsx
   /** Back cards glide forward when the deck advances. */
   const DECK_SHIFT = {
     transitionProperty: ["transform", "opacity"],
     transitionDuration: "250ms",
     transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
   } as const;
   ```

3. `BackCard`: change the outer `<View ...>` to `<Animated.View ...>` (and its closing tag), and pass `style={[{ ...current style object unchanged... }, DECK_SHIFT]}`.

4. `ReviewDeck`: remember which card was on top when the deck first showed. Hooks must run before the early return:

   ```tsx
   const top = items[0];
   const [firstTopId] = useState(top?.submissionId);
   if (!top) return null;
   ```

   Pass a new prop to `TopCard`: `promoted={top.submissionId !== firstTopId}`.

5. `TopCard`: add `promoted: boolean` to its props type and destructuring. Then:
   ```tsx
   // The next card rises from its place in the stack; the first one just sits.
   const rise = useEntrance({ duration: promoted ? 250 : 1 });
   ```
   Replace `cardStyle` with:
   ```tsx
   const cardStyle = useAnimatedStyle(() => {
     const r = promoted ? rise.get() : 1;
     return {
       opacity: interpolate(r, [0, 1], [0.75, 1]),
       transform: [
         { translateX: x.get() },
         { translateY: interpolate(r, [0, 1], [14, 0]) },
         {
           rotate: `${interpolate(x.get(), [-width, 0, width], [-9, 0, 9])}deg`,
         },
         { scale: interpolate(r, [0, 1], [0.95, 1]) },
       ],
     };
   });
   ```
   (The first two values mirror `BackCard` at depth 1: `translateY: 1 * 14`, `scale: 1 - 1 * 0.05`, `opacity: 1 - 1 * 0.25`.)

## Boundaries

- Do NOT change the swipe gesture, thresholds, springs, haptics, `commit()` or `CardFace`.
- Do NOT add an entrance to the third (newly revealed) back card. It appears behind and is fine as it is.
- Do NOT touch `parent-reviews-content.tsx` (the "All caught up" moment is a separate item).
- Do NOT add dependencies.
- If `BackCard`, `ReviewDeck` or `cardStyle` don't match the excerpts (drift since e6d90b3), STOP and report.

## Verification

- **Mechanical**: `npm run typecheck` and `npm run lint` pass.
- **Feel check** (the design-preview reviews state works on local cards with a 300 ms fake server; or a real household with 3+ pending reviews):
  - Open Reviews. The top card is simply there, with no rise on first show.
  - Approve with the button. The card flies right. When the deck advances, the next card rises from its place behind (small move up, grows, brightens) in about ¼ s. The card behind it glides up one step at the same time. Nothing jumps.
  - Swipe-approve three cards quickly in a row. Each promotion starts from the stack pose. The drag still works on a card that's still finishing its rise, and the rise doesn't fight the finger (translateX is separate from the rise).
  - Redo (left swipe → sheet → cancel): the card springs back, with no rise replay.
  - Reduce Motion on: cards advance in place with no rise. The back-card shift is a quick glide, which is acceptable.
  - Record the screen and step frame by frame: the promoted card's first frame should match the old depth-1 back card exactly (same size, offset, opacity).
- **Done when**: advancing the deck shows continuous motion from the stack position to the top position, and the first card on open doesn't animate.
