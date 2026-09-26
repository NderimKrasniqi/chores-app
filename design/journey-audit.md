# Journey audit — Quest Path redesign

Date: 2026-09-26 · Branch: `redesign/playful`
Source of truth: `src/docs/product.md`, `src/docs/specs.md` (J-01 … J-13).

Legend: ✅ covered · ⚠️ works but weak/unclear · ❌ missing · 💡 proposal (needs your call)

---

## J-01 — Set up a household

| Step | Screen | Status |
| --- | --- | --- |
| Parent signs in / creates account | Parent auth | ✅ |
| Create household + kids + payday + unclaims | Household setup (growing house) | ✅ |
| Second parent joins with equal authority | Invite envelope → Join with invite | ✅ |
| Child joins the intended profile (QR / 6-char code) | Link a phone (parent) → Dock with your family (child) | ✅ |
| Invalid join doesn't attach | Join screen error + rate limit | ✅ |
| **Add a kid after setup** | — | ❌ No backend mutation and no UI. A family with a new child (or a typo in a name) is stuck. |
| Rename / remove a kid | — | ❌ Same. |

## J-02 — Configure chores

| Step | Screen | Status |
| --- | --- | --- |
| Personal / Extra, one-off / recurring, value, deadline | Chore builder | ✅ |
| Availability time | Builder "Opens at" | ✅ (free text HH:mm — ⚠️ easy to mistype) |
| Eligibility (everyone / some kids) | Builder "Who can claim it" | ✅ |
| One recurring Unlock chore per child | Builder switch | ✅ |
| Edits affect only future occurrences | Archive dialog says so | ⚠️ Editing says nothing — a parent may expect today's chore to change |
| Claimed Extra keeps its terms | — | ⚠️ Editing a claimed Extra gives no hint the active claim keeps the old value/deadline |
| Reward must be a positive whole SEK | Coin stepper | ⚠️ Stepper allows 0 → server error on save |
| Date chips | Builder | ⚠️ "Today/Tomorrow" use the phone's time zone, not the household's |

## J-03 — Complete personal responsibilities

| Step | Screen | Status |
| --- | --- | --- |
| See today's chores | Quest path | ✅ |
| Submit with optional photo | Quest card: snap proof + hold to send | ✅ |
| Review delay doesn't hurt | "A slow check never counts against you" | ✅ |
| Missed = 0 kr, no penalty | Quest path "Missed · 0 kr, no penalty" | ✅ |

## J-04 — Unlock extra earning opportunities

| Step | Screen | Status |
| --- | --- | --- |
| Locked until current unlock chore approved | Extras gate (chest) | ✅ (all states fixed today) |
| Newer unlock occurrence re-locks | Gate re-appears | ⚠️ Child is never told *when* Extras will lock again ("open until tomorrow 07:00") |
| Missed unlock can't be excused | Gate: "Missed this time…" | ✅ |

## J-05 — Find and claim extra chores

| Step | Screen | Status |
| --- | --- | --- |
| See eligible available Extras | Bonus quests list | ✅ |
| First claim wins | Claim button | ⚠️ Losing the race shows the raw server error, not "Maya got it first" |
| Claimed shows as claimed by sibling | "Claimed by Maya" card | ✅ |
| One active claim | Backpack full | ✅ |
| **Expired unclaimed Extras visible to parents in history** | — | ❌ Parents have no chore history at all (a `choreOccurrences.listForHousehold` query exists but no screen uses it) |

## J-06 — Manage an active commitment

| Step | Screen | Status |
| --- | --- | --- |
| Slot held while working / review / redo | Backpack + claimed quest card | ✅ |
| Approval frees the slot | Celebration → backpack empties | ✅ |
| **Parent cancels without penalty** | Home → active Extras → cancel | ⚠️ Reachable again (was dead before today) but still the old Direction C layout |

## J-07 — Back out before commitment lock

| Step | Screen | Status |
| --- | --- | --- |
| Unclaim before 2h lock with keys left | Claimed card → key sheet | ✅ (tested live) |
| Locked at/after 2h boundary | Timeline + "Locked in" | ✅ |
| Out of keys → new claims lock immediately | Keys row + lock sheet | ✅ (tested live) |
| Warning when claiming inside lock window | Lock-clunk sheet | ✅ |
| Parent allowance change | House rules stepper | ✅ |

## J-08 — Submit and review completed work

| Step | Screen | Status |
| --- | --- | --- |
| Child submits (+photo) | Quest card / claimed card | ✅ |
| Parent reviews | Review deck (swipe / buttons) | ✅ |
| See the photo | Under the deck | ⚠️ Old evidence viewer layout |
| Two parents review at once | Deck | ⚠️ Second parent gets a raw error instead of "Sam already approved this" |

## J-09 — Redo rejected work

| Step | Screen | Status |
| --- | --- | --- |
| Parent sets redo deadline | Redo sheet (day + time chips) | ✅ |
| Child does one redo | Quest card / claimed card redo state | ✅ |
| Failed redo → 0 kr / penalty | Quest path + Money coins | ✅ |
| **Child knows what to fix** | — | ❌ There's no way for a parent to say why. The child just sees "Redo". |

## J-10 — Resolve missed commitments

| Step | Screen | Status |
| --- | --- | --- |
| Stakes shown before/while committed | Lock sheet, stakes panel | ✅ |
| Penalty applied, can go negative | Money planet eclipse + coin row | ✅ |
| Child *notices* a penalty happened | — | ⚠️ Only as a row in Money; nothing on Home |
| Parent sees penalties | — | ⚠️ Only as a lower/red balance; no per-child history |

## J-11 — Celebrate household progress

| Step | Screen | Status |
| --- | --- | --- |
| Own approval | Full-screen celebration (incl. while app closed) | ✅ |
| Sibling approval | Toast + Family sky | ✅ |
| No balances exposed | Privacy line; values only | ✅ |

## J-12 — Keep the family informed

| Step | Screen | Status |
| --- | --- | --- |
| Push delivery | Backend + registration | ✅ (not re-tested) |
| **Tapping a notification opens the right place** | — | ❌ No response handler; every push just opens the app where it was |
| Permission ask | System prompt on first launch | ⚠️ Asked cold with no explanation (we saw it pop over "Dock with your family") |

## J-13 — Settle earnings

| Step | Screen | Status |
| --- | --- | --- |
| Choose / change payday | Payday board, House rules | ⚠️ Doesn't say a change applies from the *next* week |
| Pay + mark paid | Slide to pay (+ accessible confirm) | ✅ |
| Paid is final | No undo | ✅ |
| Unresolved work carries forward | Payout card note | ✅ |
| Negative carries forward | Child: eclipse + copy · Parent: red bar | ⚠️ Parent isn't told why nothing is due for that kid |
| Unclaims reset weekly | Keys "this week" | ✅ |

## Cross-cutting

- ⚠️ Offline banner still old layout.
- ⚠️ Stale Maestro flows + dead legacy components (cleanup step).
- ⚠️ Some arbitrary text sizes render at body size (seen in the review deck) — simulator pass.

---

## Proposals — where I'd change the product (your call)

1. **💡 "What to fix" note on redo.** Let the parent add a short optional note when asking for a redo (quick chips like "Missed a spot", "Not finished", plus free text), shown on the child's redo card. Today a child gets "Redo" with no reason — for 8-year-olds especially that's frustrating. *Needs a small backend field.*
2. **💡 Kid page for parents.** Tapping a kid on Home opens one place with: today's chores and their states, this week's coins (earnings/penalties), their active Extra (with cancel), and their phones. It fixes the "parent sees penalties only as a red bar" and "no history" gaps together, and gives expired Extras a home. *Mostly new UI; one new parent query for a child's ledger entries.*
3. **💡 Manage kids after setup.** Add / rename / remove a kid from the Family tab. *Backend mutations needed; removal must keep history.*
4. **💡 Notification taps deep-link** to the review deck (parent), the quest card, redo, or Extras (child).
5. **💡 Explain before asking for notifications** — a short friendly screen ("We'll tell you when a Parent approves…") right before the system prompt, instead of the cold prompt mid-join.
6. **💡 Friendly race/collision messages** — "Maya got it first", "Sam already approved this" — instead of raw server text.
7. **Keep as is (I considered and don't recommend):** auto-initiating Swish payments (deferred in the product doc and needs phone numbers); letting parents excuse a missed unlock chore (explicitly excluded by the rules).
