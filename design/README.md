# Design

**Status:** Active — Quest Path, child and parent apps both on `main`

## Authority

- `src/docs/product.md`, `domain.md` and `specs.md` are authoritative for behaviour, terminology, privacy and money.
- `design/system/` describes the visual system; the code in `src/design-system/` and `src/components/art/` is its implementation.
- `design/ux/` maps screens and navigation.
- `design/journey-audit.md` checks every product journey (J-01 … J-13) against the screens.

## Direction

Quest Path: the child app is a night sky (quest theme). Each kid tab has one job, and every picture stands for a rule:

- **Quests** — "what do I do next?": a star map; the rocket sits at the next quest, finished and sent quests fold into an asteroid belt, the rest behind "+N more". Money card with the home planet (moon climbs to payday).
- **Extras (Launch Control)** — "is this extra money worth promising?": missions with a commitment track (abort window → 2 h lock → locked in), one mission on the launch pad, abort passes.
- **Money (payday delivery)** — "what lands on payday, and why?": the rocket tows the cargo pod from last payday's depot to your home planet; a cargo manifest; the delivery lands once after a payout.
- **Family (the crew)** — siblings only: astronaut badges with weekly patches, siblings' wins with high-fives.

The parent app is light (home theme) and plays Ground Control for the same trip: Home is the console (signals: check / pay / watch; today's radar), Money is the payday dock, Chores is the week board with a budget, Family is the crew roster and house rules.

Principles: rethink each screen around one visual idea; self-made SVG art that moves; motion follows the Emil Kowalski skills in `.claude/skills` (spectacle only for rare moments, frequent screens stay calm, reduced motion is gentler not frozen).
