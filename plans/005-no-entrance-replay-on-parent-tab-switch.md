# 005 — Stop parent Home signals and week-board dots re-animating on every tab visit

- **Status**: DONE
- **Commit**: e6d90b3
- **Severity**: MEDIUM
- **Category**: Purpose & frequency
- **Estimated scope**: 2 files, a wrapper each

## Problem

The parent shell remounts the whole tab content on every tab switch, because
the scroll view is keyed by section:

```tsx
// src/components/household/household-list-screen.tsx:189-191 — current
<ScrollView
  key={`${household.householdId}-${activeSection}`}
```

Two components use `entering` layout animations meant for "something new
arrived", but `entering` also fires on mount, so they replay on every visit:

```tsx
// src/components/household/parent-home-content.tsx:154 — current (Signal)
<Animated.View entering={FadeInDown.duration(200).easing(Easings.out)}>
```

```tsx
// src/components/art/week-board.tsx:81 — current (every chore dot)
<Animated.View key={dot.key} entering={FadeIn.duration(180)}>
```

The week board's own doc says "Still, apart from new dots fading in"
(`week-board.tsx:29`), but every dot on the board fades in every time the
parent opens Chores. The pay / watch signals on Home slide down every time
the parent comes back to Home. Home is the parent's most-visited tab. Motion
on content the user wasn't waiting for, on a frequent screen, is noise, and
it tells them nothing changed when something did.

## Target

Wrap each group in Reanimated's `LayoutAnimationConfig` with `skipEntering`.
It skips `entering` for children that mount together with the wrapper
(first render of the tab), and still animates children added later (a new
signal or a new dot while the parent is looking). This is exactly the
documented intent.

```tsx
import { LayoutAnimationConfig } from "react-native-reanimated";

<LayoutAnimationConfig skipEntering>
  {/* existing group, unchanged */}
</LayoutAnimationConfig>;
```

Durations and curves stay as they are (200ms `Easings.out`, 180ms fade).

## Repo conventions to follow

- Reanimated 4.5 (`package.json`) ships `LayoutAnimationConfig`. No new dependency.
- Keep the existing `entering` builders exactly as they are.

## Steps

1. `src/components/household/parent-home-content.tsx`:
   a. Change the import on line 4 to `import Animated, { FadeInDown, LayoutAnimationConfig } from "react-native-reanimated";`.
   b. The signals container starts at line 322: `<View className="mt-5 gap-2.5">` … its closing `</View>` at line 399. Wrap that whole `<View>…</View>` in `<LayoutAnimationConfig skipEntering>` … `</LayoutAnimationConfig>`. Add a comment above: `{/* Signals already there when Home opens just sit; new ones slide in. */}`.
2. `src/components/art/week-board.tsx`:
   a. Change line 2 to `import Animated, { FadeIn, LayoutAnimationConfig } from "react-native-reanimated";`.
   b. In `WeekBoard`, wrap the returned root `<View className="flex-row justify-between">…</View>` (lines 42-144) in `<LayoutAnimationConfig skipEntering>` … `</LayoutAnimationConfig>`.

## Boundaries

- Do NOT remove or change the `entering` animations themselves.
- Do NOT change the `ScrollView` key in `household-list-screen.tsx`. The remount is relied on for scroll reset.
- Do NOT touch `GroundRadar`'s sweep. Its replay on each "all clear" appearance is documented as deliberate (`src/components/art/ground-radar.tsx:209-212`).
- If the code at the cited lines doesn't match (drift since e6d90b3), STOP and report.

## Verification

- **Mechanical**: `npm run typecheck` and `npm run lint` pass.
- **Feel check** (parent account with a pending payout or a locked Extra near its deadline, and a few chores planned this week):
  - Switch Home → Chores → Home → Chores several times. Signals on Home and dots on the week board are simply there on every visit, with no slide or fade.
  - With Home open, have a Parent-side change add a signal (e.g. a claim passes its lock time or a payout becomes due), or on Chores add a new chore for this week. The new signal slides down (200 ms) and the new dot fades in (180 ms).
  - Caveat to check: if a signal's data (e.g. `listActiveForParent`) loads _after_ Home's first render, that signal will still slide in once per visit. Note whether it does. If so, report it; don't work around it in this plan.
- **Done when**: returning to a parent tab shows its content still. Only content that appears while the parent is watching animates.
