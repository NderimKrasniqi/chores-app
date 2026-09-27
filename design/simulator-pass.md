# Simulator pass — findings

Running log of the end-to-end workflow pass (J-01 … J-13) on iPhone 17 Pro
(parent) and iPhone 17e (Alex).

## Your notes (to do)

- [ ] **Child star code grows 4–8.** The slots grow as you type, up to 8.
      Make it a fixed length instead (decide: 4 or 6 digits).
- [ ] **Quest icon too big when opening a chore.** The quest card's hero
      icon dominates the screen; shrink it so the title, reward and send
      button carry the page (on the 17e "Snap proof" is pushed below the fold).

## Open (found in pass)

- [ ] Child join screen says ask a Parent to open “Add a child” — the parent
      screen is called “Link a phone”.
- [ ] “Getting your profile ready” loading screen shows a dark status bar on
      the dark background.
- [ ] Parent Home crew balances briefly show “•••” while reloading.
- [ ] A decorative sparkle can sit on top of footer text on the entry screen.

## Fixed

- Sign-in: disabled until valid, friendly errors (no raw server text).
- All error messages: ConvexError's own sentence, no request-id noise.
- One household per Parent (server rule; switcher removed).
- Home: long household name wraps; › instead of ▾.
- Chores: finished one-offs fold away; “due next day 18:00”.
- AppText: explicit `text-[Npx]` replaces the variant size (the review-deck
  and other tiny-heading glitches).

## Verified working

- J-01 invite join, pairing with a 6-character code, star-code setup.
- J-02 create a personal chore from a template.
- J-03 child sends a quest; J-08 it appears instantly on the parent's Home
  and review deck.
