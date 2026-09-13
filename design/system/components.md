# Direction C component recipes

**Status:** Approved

These recipes capture patterns repeated across the approved Direction C screens. They are not new product behavior.

## Screen shell

- Warm canvas, dark status-bar content, 20-point phone inset.
- A destination owns one stable bottom navigation bar.
- Focused details and forms replace the destination content and use a clear Back or Close action.

## Typography

- `display`: onboarding hero messages only.
- `screenTitle`: destination and focused-route titles.
- `sectionTitle`: meaningful content sections.
- `cardTitle`: card subject or chore name.
- `amount`: prominent SEK values.
- `body`, `bodySmall`, `label`, and `caption`: supporting hierarchy.

## Surface card

- Raised cards use the surface color, card radius, and card shadow tokens.
- Tinted cards use semantic soft colors and normally omit elevation.
- Cards are not used merely to separate every setting; grouped rows and whitespace are preferred when the approved screen does so.

## Buttons

- Primary: green fill, white label, 52-point minimum height.
- Destructive: coral fill, white label, always behind explicit confirmation when the action is consequential.
- Secondary: light surface or semantic tint with aubergine or green label.
- Tertiary: text-only, 44-point target, used for quiet alternate paths.
- Disabled and pending states preserve label readability and do not imply server confirmation.

## Status chip

- Pill shape with icon plus short text.
- Mint: approved, open, selected, or safe active state.
- Coral: urgent, redo, destructive, or deadline attention.
- Lavender: neutral allowance, supporting context, or informational state.
- Gray: waiting, unavailable, inactive, or historical state.

## Chore card

- Compact artwork leads; title and real-SEK value form the primary text hierarchy.
- Show only the state details needed to choose the next action.
- Personal Unlock status is exceptional and receives a chip.
- The whole card opens detail; the disclosure icon is redundant reinforcement, not a separate target.
- Unknown user-created chore names use a neutral chore illustration/icon rather than a misleading generated object.

## Bottom navigation

- Child destinations: Home, Extras, Activity, Money.
- Parent destinations: Home, Chores, Reviews, Money, Family.
- Icon and text label are always present. Selected state uses green plus weight; color is not the only cue.
- Review counts use a coral numeric badge.

## Confirmation sheet

- Dimmed context remains visible behind a rounded top sheet.
- One clear question, concise consequence, primary consequential action, and safe cancel action.
- Do not add permanent history, recovery actions, or authority distinctions that the domain does not support.

## Illustration

- Clay-and-paper household objects with soft depth and restrained texture.
- Raster artwork contains no baked-in operational text, currency, buttons, or status.
- Person artwork is a role/profile cue, not proof of identity.
- Decorative encouragement may use handwritten treatment, but operational copy remains native text.
