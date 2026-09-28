# Simulator pass — findings

Running log of the end-to-end workflow pass (J-01 … J-13) on iPhone 17 Pro
(parent) and iPhone 17e (Alex).

## Your notes (to do)

- [x] **Child star code grows 4–8.** The slots grow as you type, up to 8.
      Make it a fixed length instead (decide: 4 or 6 digits).
- [x] **Quest icon too big when opening a chore.** The quest card's hero
      icon dominates the screen; shrink it so the title, reward and send
      button carry the page (on the 17e "Snap proof" is pushed below the fold).

## Open (found in pass)

- [x] Child join screen says ask a Parent to open “Add a child” — the parent
      screen is called “Link a phone”.
- [x] “Getting your profile ready” loading screen shows a dark status bar on
      the dark background.
- [x] Parent Home crew balances briefly show “•••” while reloading.
- [x] A decorative sparkle can sit on top of footer text on the entry screen.

- [x] Dev only: a hot reload while a Child is signed in can show “Pair Alex
      again” — same root cause as the kid-logout bug below (fixed).

- [x] Phones list says “Phone 1 / Phone 2” — show something recognisable
      (device model, or when it was last used).
- [x] Phones header art: the house has “arms” and the arrows float; redraw.
- [x] Parent Activity, notification primer (via preview), house-rule tiles.

- [x] A Parent who made a household by mistake can delete it (You → “Delete
      it”) while they're its only Parent and nothing has happened in it.
- [ ] New Maestro flows for the Quest Path screens (the old ones are gone).

- [x] “Opening child profile…” spins forever when the server can't be
      reached (seen after a simulator restart: WebSocket TLS error). Show the
      offline pill / a “can't connect — try again” state after ~10 s.
- [ ] Maestro: flows written in .maestro/ (uncommitted) but the iOS driver
      won't start on these simulators; it also froze the 17e once.

- [x] **Kid logged out after a reload/restart** (“Can't open Alex”, “Pair Alex
      again”): the no-access screen read a transient “no access” (login not yet
      recognised) as “unlinked” and signed the phone out, deleting the session.
      Now it only cleans up when the server confirms the saved link is gone,
      and the server answers access as unrecognized / not_linked / linked.
      Logins last 90 days, renewed daily while used.
- [ ] Payout maintenance job throws “Unable to resolve current Payout Period”
      every 30 min since 15:29 (likely the test payout week added by the
      Money fixture). Investigate.

## UI/UX pass (27 Sep)

- Money: compact piggy-bank card (tail wag, coins drop in since last visit,
  count-up, rain cloud below zero); “Piggy bank” everywhere.
- Child Family: a shelf of 7 star jars (this week's wins by day and kid).
- Parent Family: tried a big doll's house — too big; now a slim house banner
  above the rows.
- Parent tabs: your avatar opens the account; live subtitles.
- Parent Money: each kid shows this week's net and a dot per day.
- Extras: big open-chest moment only on the first look after an unlock.
- Kid page: last-7-days strip.
- “kr” always after the number, on one line.

## Fixed
- Reviewer pass: text overrides keep their line-height ratio; sheets don't
  stack a home-indicator gap on the keyboard; device labels capped before
  filtering; dev membership removal limited to fixture households.
- Phones: pairing stores the device model (“iPhone 17e”); new animated
  house→phone scene (star puffs out of the chimney and lands on the phone).
- Child access gate: night-sky loader + lost-satellite error.
- Notification primer: ringing bell, sound waves, a sample notification drops
  in; separate kid/parent copy.
- Parent Family wins no longer says “everyone's balance stays private”.

- Sign-in: disabled until valid, friendly errors (no raw server text).
- All error messages: ConvexError's own sentence, no request-id noise.
- One household per Parent (server rule; switcher removed).
- Home: long household name wraps; › instead of ▾.
- Chores: finished one-offs fold away; “due next day 18:00”.
- AppText: explicit `text-[Npx]` replaces the variant size (the review-deck
  and other tiny-heading glitches).
- Child Home: Extras chest card reads the server gate (was stuck “locked”
  after the Unlock Chore was approved, because tomorrow's copy counted).
- Pairing countdown started at 15:41 on a 15-minute code (stale clock).
- Invite + onboarding replay: page sheets (content sat under the clock).
- Bottom sheets: SheetBody — real home-indicator padding and keyboard lift
  (SafeAreaView reads zero insets inside a transparent Modal).
- Secondary screens open without a header jump.
- House-rule tiles are tappable; Remove disables after the server says no;
  kid page says “Tomorrow”.
- Parent Home: the day-arc ornament became the parent's avatar (account).
- Money week strip lit both Fridays (the past one and the coming one);
  now only the coming payday, and today gets a ring.
- Claim lock copy in kid words; keys pill no longer runs off the edge.
- Star codes are exactly 4 digits (older codes still unlock).
- Quest/claimed card hero icon ~35% smaller.
- Child Home: past quests say “· Yesterday”; midnight openings say
  “Opens tomorrow” instead of “Available tomorrow, 00:00”.

## Verified working

- J-01 invite join, pairing with a 6-character code, star-code setup.
- J-02 create a personal chore from a template.
- J-03 child sends a quest; J-08 it appears instantly on the parent's Home
  and review deck; swipe-right approves; balance 240 → 270 kr.
- J-04 approving the Unlock Chore opens the Extras chest.
- J-05 claim (backpack fills), J-07 unclaim with a key (0 of 3 left), claim
  again with “locks right away”, send; J-09 redo sheet → Alex's card turns
  “Redo needed” live → redo sent → approved; J-11 celebration seen on Alex's
  phone (auto-closes after 4.5 s).
- J-13 slide-to-pay: Alex 295 → 225 kr, “Paid today at 10:10”; Alex's Money
  planet shows 225 kr, rocket on Sunday, this week's coins +55.
- House rules: unclaim allowance 2 → 3 arrives live on the child's keys.
- Kid page: balance, chores with outcomes, coins, Phones, pairing code,
  rename sheet, removal refused while a balance is open.
