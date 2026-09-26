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

## Art library (`src/components/art/`)

Starfield, StarBuddy, ChoreIcon, QuestPath (road), TreasureChest, Backpack, UnclaimKeys, LockClunk, CoinDrop, PiggyPlanet, RocketTrack, FamilySky, Fireworks/Sunburst, Confetti, DockingScene, LostSatellite, plus pieces (PopIn, Floating, PulseRings, SpinningCoin).

See `components.md` for the interaction components.
