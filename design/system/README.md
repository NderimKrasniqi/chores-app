# Direction C design system

**Status:** Approved

This folder turns the explicitly approved Direction C screens into a reusable production design foundation. The approved PNGs remain authoritative when a token or component recipe conflicts with a screen. Product and domain documentation remain authoritative for behavior, terminology, privacy, money, and state transitions.

## Source of truth

- `tokens.json` is the machine-readable visual token source.
- `components.md` defines recurring component recipes and their supported states.
- `../references/direction-c/` contains the approved screen compositions from which the system is derived.
- Production React Native code consumes these values through `src/design-system/`.

Changing a token does not retroactively approve a changed screen. The initial Direction C token foundation was explicitly approved by the human reviewer on 2026-09-13.

## Visual principles

- Warm off-white canvas with light, tactile surfaces rather than clinical white panels.
- Deep aubergine is the primary text and navigation color.
- Mint and green communicate creation, progress, selection, and safe primary actions.
- Coral communicates urgency, destructive actions, and exceptional attention—not ordinary decoration.
- Yellow is a restrained reward accent and never represents fake currency.
- Dusty lavender communicates supporting information and neutral guidance.
- Rounded system typography carries the interface; handwritten treatment is limited to decorative encouragement art and is never required to understand or operate the app.
- Child screens may use more illustration and energy. Parent screens use the same system with calmer density and fewer decorative accents.

## Layout rules

- Base spacing unit: 4 points.
- Standard horizontal screen inset: 20 points on phones.
- Minimum interactive target: 44 by 44 points.
- Primary controls: 52 points minimum height.
- Bottom navigation: 82 points before the device safe-area inset.
- Lists that are shown as bounded regions in approved screens scroll independently while their destination header, key status summary, and bottom navigation remain stable.
- Full-screen forms keep the final action above the bottom safe area.

## Typography rules

- Use the platform rounded system face where available.
- Use screen and section sizes semantically instead of selecting arbitrary values per screen.
- Amounts, deadlines, and state labels must survive larger text without clipping.
- Body copy uses sentence case. Buttons and navigation labels are concise and never all caps.

## Accessibility rules

- Color is always paired with text or an icon for status.
- Decorative illustrations are hidden from assistive technology.
- Icon-only actions have explicit accessibility labels.
- Reduced motion removes nonessential celebration and parallax while preserving state feedback.
- Pressed, disabled, loading, error, and server-confirmed success states are part of the component contract.
