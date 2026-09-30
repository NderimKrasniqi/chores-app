# Pilot plan (TASK-25)

**Goal:** one real week (ideally two paydays) of your family using the app. It should turn up what breaks, confuses or annoys before any App Store work. The product rules in `product.md` and `specs.md` stay as they are. The pilot tests the app against them and doesn't reopen them.

## Before you start: getting the app onto the phones

Today the app runs in **Expo Go** and loads its code from the Mac running `npx expo start`. That only works while the Mac is on and every phone is on the same Wi-Fi, which is fine for an afternoon but not for a kid's phone all week. Pick one:

| Option                                                                 | Needs                                                                 | Catch                                                                                                                |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Expo Go + the Mac left running**                                     | Nothing new                                                           | Only works at home on the same Wi-Fi. Kids can't check quests elsewhere.                                             |
| **Development build** installed over USB (`npx expo run:ios --device`) | Xcode with your Apple ID; adds an `ios/` folder and `expo-dev-client` | Free Apple ID: the app expires after 7 days, max 3 devices. Still needs the Mac for code, unless you add EAS Update. |
| **TestFlight**                                                         | Apple Developer Program ($99/yr); overlaps with TASK-26               | The real thing: installs like a normal app, no Mac needed.                                                           |

The backend is the Convex **dev** deployment. That's fine for a family pilot; the data is real but only yours.

## Day 0: setup (J-01, J-02)

- [ ] Parent 1 creates an account and a household with payday, weekly abort passes and time zone.
- [ ] Add each kid. Pair each kid's phone by scanning the QR code, and pair one by typing the code.
- [ ] Parent 2 joins with an invite, if you have a second parent.
- [ ] Set up the real week: a daily personal chore per kid, one personal **unlock** chore, and 2–3 claimable Extras with different deadlines.
- [ ] Turn notifications on for everyone.

## Every day (J-03, J-08, J-11, J-12)

- [ ] Kids do their quests and send some with a photo, some without.
- [ ] Parents review from the Home deck. Approve most; send one back for a redo during the week (J-09).
- [ ] Kids high-five a sibling's approved chore (J-11).
- [ ] Note which notifications arrived, how late, and which felt like too many.

## During the week (J-04 – J-07, J-10)

- [ ] A kid finishes the unlock chore → Extras open. Before that, they're locked (J-04).
- [ ] Two kids go for the same Extra; only one gets it (J-05).
- [ ] A kid claims one Extra and can't claim a second until it's approved (J-06).
- [ ] A kid aborts an Extra before the lock and uses up a pass; another tries after the lock and can't (J-07).
- [ ] Let one locked Extra be missed on purpose. Its value comes off that kid's balance (J-10).

## Payday (J-13)

- [ ] On payday, check each kid's amount matches what you expect, pay by Swish, and mark it paid.
- [ ] A kid who ended below zero carries it into next week.

## Worth trying once

- [ ] Phone offline (flight mode): what the kid sees, and whether it catches up afterwards.
- [ ] A shared phone: lock/switch profile, and the PIN.
- [ ] Remove a paired phone from the parent side; the kid's phone should notice.
- [ ] Android, if anyone in the family uses one.

## Writing things down

Keep one list, ideally on a shared note. For each item write **what you did → what happened → what you expected**, with a screenshot if you can. Then sort each item:

- **Bug:** wrong money, wrong state, a crash or a stuck screen. Fix before release.
- **Confusing:** worked, but someone didn't understand it. Fix before release if it happens more than once.
- **Idea:** a new feature. Park it; it doesn't block release.

## Done when

- A full week ran, with at least one payday, one redo, one missed Extra and one abort.
- No open **bugs** from the list.
- `npm run verify` and the Maestro suite (`maestro test .maestro`) pass after the fixes.
