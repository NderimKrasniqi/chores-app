# 007 — One bottom sheet: the dim stays put, the sheet slides, the grabber drags

- **Status**: DONE
- **Severity**: MEDIUM
- **Category**: Spatial consistency / gestures
- **Estimated scope**: 1 new component + 8 call sites

## Problem

Eight sheets are `<Modal transparent animationType="slide">` wrapping a
full-screen `bg-scrim` View. The native slide moves the whole modal, so the
dim veil rides up from the bottom with the sheet like a grey wall and drops
out the same way. Most show a grabber pill that promises a drag that doesn't
exist.

Call sites:

- `src/components/chores/claimable-chores-view.tsx` (lock-right-away sheet)
- `src/components/chores/parent-reviews-content.tsx` (RedoSheet)
- `src/components/chores/active-claimable-claims-view.tsx`
- `src/components/chores/claimed-quest-card.tsx` (abort confirm)
- `src/components/household/parent-family-content.tsx` (scrim sheet only; its pageSheet modal stays)
- `src/components/household/parent-kid-screen.tsx`
- `src/components/household/parent-secondary-screens.tsx`
- `src/components/notifications/push-registration-bridge.tsx`

The native `pageSheet` / `fullScreen` modals are already correct and are
not touched.

## Target: `ScrimSheet` in `src/design-system/scrim-sheet.tsx`

```tsx
<ScrimSheet visible={open} onClose={close} dismissible={!busy}>
  {/* content only; ScrimSheet draws the grabber, the surface and SheetBody */}
</ScrimSheet>
```

- `<Modal transparent animationType="none" statusBarTranslucent>` stays
  mounted through the exit: an internal `mounted` state follows `visible`
  and only flips false when the close animation finishes.
- One shared value `progress` (0 → 1) drives both layers:
  - **Scrim**: `opacity: progress`, a sibling of the sheet, not its parent.
    Tapping it calls `onClose` when dismissible.
  - **Sheet**: `translateY: (1 - progress) * height + drag`, with `height`
    from `onLayout` (text scales, so never hardcoded).
- **Open**: `withTiming(1, { duration: 300, easing: Easings.sheet })`.
  **Close**: `withTiming(0, { duration: 250, easing: Easings.sheet })`,
  then `scheduleOnRN(setMounted, false)`.
- **Drag to dismiss** (only when dismissible), from animate-expo
  RECIPES "Bottom sheet you can drag to dismiss":
  - `Gesture.Pan().activeOffsetY([-10, 10]).failOffsetX([-20, 20])` on the
    grabber and header area only, so ScrollViews and inputs inside keep
    working.
  - Dragging up rubber-bands (`drag = dy < 0 ? dy / 4 : dy`).
  - Release: dismiss if `drag + velocityY * 0.2 > 0.4 * height` or
    `velocityY > 800`, via
    `withSpring(height, { duration: 300, dampingRatio: 1, velocity, overshootClamping: true })`
    and then `onClose`. Otherwise snap back with
    `withSpring(0, { duration: 300, dampingRatio: 0.8, velocity })` and one
    Light haptic.
- `onRequestClose` (Android back) runs the same animated close.
- **Reduced motion**: no translate; scrim and sheet crossfade on opacity
  over 200 ms; drag still works but without the rubber-band.
- Keeps `SheetBody` inside for keyboard lift and home-indicator padding.

## Steps

1. Create `src/design-system/scrim-sheet.tsx` as above; export it from
   `src/design-system/index.ts`.
2. Migrate the eight call sites one at a time: remove the Modal, the scrim
   View, the `SheetBody` wrapper and the local grabber; wrap the content in
   `ScrimSheet`, passing each site's existing close handler and busy flag as
   `dismissible`.
3. `npx tsc --noEmit`, `npx eslint src`, `npx prettier --check .`,
   Maestro suite (flows that open these sheets: reviews redo, extras lock).
4. Run the reviewer, fix findings, commit.

## Edge cases

- **Busy states** (e.g. sending a redo): `dismissible={false}` blocks the
  scrim tap, the drag and the back button until done.
- **Content changes while open** (redo sheet closes when another parent
  reviewed): the parent sets `visible=false` and the sheet animates out.
- **Visible toggling quickly**: the close animation is interrupted by open
  via `withTiming` on the same value, with no remount.
- **Keyboard** (redo note input): `SheetBody` keeps lifting; the drag
  lives on the grabber only, so it doesn't fight text selection.
- **Accessibility**: the scrim gets `accessibilityLabel="Close"` and
  `accessibilityRole="button"` when dismissible, and focus goes to the sheet
  on open (`accessibilityViewIsModal`).

## Risks

- Transparent Modal plus a Gesture needs `GestureHandlerRootView` inside
  the Modal on Android; wrap the Modal content in one.
- Maestro flows that tap inside these sheets may need a short wait for the
  300 ms open.

## Verify

- Every sheet: the dim fades in place while only the sheet slides up; on
  close it fades out while the sheet slides down.
- Grabber: a small drag springs back; a flick or a long drag dismisses.
- Reduce Motion on: the sheet fades in and out, with no slide.
