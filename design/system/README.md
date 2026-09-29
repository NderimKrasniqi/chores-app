# Quest Path design system

## Themes

Two scopes share one palette (`src/design-system/theme/palettes.js`, `ACTIVE_PALETTE` switches it):

- **quest** — child app: night canvas, star text, primary/accent/pink/gold highlights.
- **home** — parent app: light canvas, ink text, the same accents.

Wrap a subtree in `<ThemeScope mode="quest" | "home">`; read colours with `useTheme().tokens`. Never hard-code colours in components.

## Type

Fredoka (display) + Nunito (body) via `AppText` variants: `display`, `screenTitle`, `sectionTitle`, `cardTitle`, `amount`, `body`, `bodySmall`, `label`, `caption`. Prefer variants over ad-hoc sizes.

## Motion (`src/components/art/motion.ts`)

- `Easings.out` / `inOut` / `sheet` / `linear` / `float` — strong beziers, never ease-in on UI.
- `PRESS` + `pressTransition` — scale 0.97 over 120 ms on every pressable.
- `useLoop` (ambient, rests under reduced motion unless `essential`) and `useEntrance` (one-shot).
- Haptics: one per commit the user caused.
- Rules from the animation audit (`plans/`): one starfield seed per shell (tabs and onboarding pages never reshuffle the sky); entrances play only for content that arrives while watching (`LayoutAnimationConfig skipEntering`, first-sighting checks); gestures continue from where the element is; celebrations and pops only for moments the user caused in-session; quest cards stay calm (no pulse rings).

## Art library (`src/components/art/`)

Kid: Starfield, StarBuddy, ChoreIcon, StarMap (star map + asteroid belt), HomePlanet, CargoPod, PaydayFlight, Airlock, CommitmentTrack, LaunchPad, UnclaimKeys (abort passes), LockClunk, CoinDrop, CrewBadge + Patch + HighFiveHand, Fireworks/Sunburst, Confetti, DockingScene, PhoneLinkScene, LostSatellite, plus pieces (PopIn, Floating, PulseRings, SpinningCoin, BalanceOrb).
Parent: GroundRadar, WeekBoard + BudgetGauge (and the shared CargoPod, CrewBadge, Patch).

See `components.md` for the interaction components.
