# 001 — Keep one starfield across the kid's tabs

- **Status**: DONE
- **Commit**: e6d90b3
- **Severity**: HIGH
- **Category**: Purpose & frequency
- **Estimated scope**: 1 file, 1 line

## Problem

The kid app's shell re-seeds the night sky every time the tab changes:

```tsx
// src/components/child-access/child-home-screen.tsx:142 — current
<Starfield seed={shownTab.length * 7} />
```

`shownTab` is `"home" | "extras" | "activity" | "money"`, so the seed is
28 / 42 / 56 / 35. A new seed gives every star a new position, size, colour,
`delay` and `duration` (`src/components/art/starfield.tsx:178-203`). Because
each `TwinkleStar` keeps its index key, the loop hook sees new `delay` /
`duration` dependencies and restarts:

```ts
// src/components/art/motion.ts:71-84 — current
useEffect(() => {
  if (still) {
    progress.set(rest);
    return;
  }
  progress.set(0); // every star snaps to its dimmest frame
  progress.set(
    withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing }), -1, reverse),
    ),
  );
  return () => cancelAnimation(progress);
}, [delay, duration, easing, progress, rest, reverse, still]);
```

So on every tab switch the whole sky jumps to new positions, then every star
drops to opacity 0.2 / scale 0.6 and fades back in over 0–2.5 s. Tab
switching is the most frequent action in the kid app. The shell says outright
that switching must not animate:

```tsx
// src/components/child-access/child-home-screen.tsx:540-545
 * The active tab is a lime pill with its name; the rest are icons. No
 * animation on switching — kids flip tabs all day.
```

The re-seed is an animation on every switch, and nobody asked for it.

## Target

One seed for the kid shell, so the sky stays the same across tabs. `Starfield`
is `memo`'d (`starfield.tsx:164`), so with stable props it doesn't re-render
at all when the tab changes. Use the seed Quests uses today (28), so the
screen kids see most looks exactly as it does now.

```tsx
// target — src/components/child-access/child-home-screen.tsx:142
<Starfield seed={28} />
```

## Repo conventions to follow

- Other screens pass a literal or a stable seed: `src/components/activity/approval-celebration.tsx:307`
  (`seed={item.choreTitle.length + 41}`), `src/app/index.tsx:33` (`seed={21}`).
- Don't touch `motion.ts` or `starfield.tsx`. The fix is only the caller.

## Steps

1. In `src/components/child-access/child-home-screen.tsx`, find line 142:
   `<Starfield seed={shownTab.length * 7} />`
   Replace it with:
   `<Starfield seed={28} />`
   Add a one-line comment above it:
   `{/* One sky for every tab: switching tabs must not move or re-twinkle the stars. */}`

## Boundaries

- Do NOT change `src/components/art/starfield.tsx` or `src/components/art/motion.ts`.
- Do NOT change any other `Starfield` usage (quest cards, loaders, celebration). They're separate screens and out of scope here.
- Do NOT add new dependencies.
- If line 142 doesn't match the code above (drift since e6d90b3), STOP and report instead of improvising.

## Verification

- **Mechanical**: `npm run typecheck` passes. `npm run lint` shows no new warnings.
- **Feel check** (simulator or device, kid profile, or `design-preview?state=child-home`):
  - Tap Quests → Extras → Money → Family → Quests quickly. The stars stay where they are and keep twinkling out of step. No dim-and-fade-in wave on any switch.
  - The Quests sky looks the same as before the change (seed 28 is what Quests already used).
  - With iOS Settings → Accessibility → Motion → Reduce Motion on, stars still fade gently (the twinkle is `essential`) and still don't jump on a tab switch.
- **Done when**: switching kid tabs changes only the tab content and the tab pill. The starfield looks the same before and after the switch.
