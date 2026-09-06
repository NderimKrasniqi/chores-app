# Domain Model
**Status:** Approved — current

## Canonical Language
- **Household** — the family unit that owns parent settings, child profiles, chores, payout cadence, and shared activity.
- **Parent** — an adult household member with the same domain authority as every other Parent in that Household.
- **Child** — a child household member who receives Personal Chores, may claim eligible Claimable Chores, submits work, and owns a private running balance; the product targets ages 8–18, but that range is not modeled as a hard domain eligibility limit.
- **Chore Definition** — the durable parent-authored template for a Personal Chore or Claimable Chore, including recurrence and default configuration for future occurrences.
- **Chore Occurrence** — one concrete scheduled instance of a Chore Definition with its own availability start, deadline, value, lifecycle, and immutable historical outcome.
- **Availability Window** — the interval from an occurrence's availability start through its deadline; if a Parent does not configure an availability time, the start is derived from the beginning of the scheduled day.
- **Personal Chore** — a paid Chore Occurrence assigned to one Child; missing it earns nothing but never creates a monetary penalty.
- **Unlock Chore** — the one designated recurring Personal Chore whose approved current occurrence gates that Child's access to Claimable Chores.
- **Claimable Chore** — a paid Chore Occurrence that eligible Children may compete to claim exclusively.
- **Claim** — a Child's exclusive commitment to one Claimable Chore Occurrence.
- **Submission** — a Child's declaration that work is complete, optionally accompanied by photo evidence, recorded at a submission time.
- **Review** — a Parent's approval or rejection of a Submission.
- **Redo** — the single correction opportunity created by rejecting an on-time Submission, with a new Parent-set deadline.
- **Payout Week** — the household settlement period defined by the Parent-configured payout weekday.
- **Ledger Entry** — an immutable financial event such as an approved earning, a missed-commitment penalty, or a settled payout.
- **Running Balance** — the sum of the Child's unsettled Ledger Entries and any carried negative balance.

## Core Invariants
- **D-01 — Equal parent authority:** Every Parent in a Household has the same authority over chore configuration, review, settlement, and household settings.
- **D-02 — Approval is authoritative:** No chore produces an earning or unlock effect merely because a Child submitted it; a Parent must approve the submitted work.
- **D-03 — Occurrence history is durable:** Editing or deleting a Chore Definition never rewrites the value, deadline, financial effect, approval, penalty, or settlement history of past Chore Occurrences.
- **D-04 — On-time submission protects the Child:** A Submission recorded no later than its active deadline is on time; Parent review delay cannot convert that on-time Submission into a missed chore.
- **D-05 — Personal chores cannot create debt:** A missed Personal Chore earns zero and creates no monetary penalty.
- **D-06 — Unlock access is earned, not overridden:** Each Child has at most one designated Unlock Chore at a time, and access to Claimable Chores depends on approval of the relevant current occurrence; a missed unlock occurrence cannot be bypassed manually by a Parent.
- **D-07 — Claims are exclusive and eligibility-bound:** At most one Child may own a Claim on a Claimable Chore Occurrence, and only a Child eligible for that occurrence may claim it.
- **D-08 — One active claim per Child:** A Child may have at most one unresolved Claim at a time; submission or rejection does not release that claim slot, while approval does.
- **D-09 — Child unclaim rights are bounded:** The Household defines one weekly unclaim allowance applied equally to all Children; only successful Child-initiated unclaims consume it, and exhausting it does not prevent future claims but removes further unclaim rights for that Payout Week.
- **D-10 — Commitment lock is deterministic:** A Child may unclaim only before the instant two hours prior to the occurrence deadline; at that boundary or later, the Claim is locked. A claim accepted inside the lock window is locked immediately.
- **D-11 — Accepted claim terms are stable:** Once a Claim exists, that occurrence's value and deadline cannot be changed for that Claim; a Parent may cancel it without penalizing the Child.
- **D-12 — Missed locked claims have full monetary consequence:** Failure to submit a locked Claimable Chore by its applicable deadline deducts the full occurrence value from the Child's balance.
- **D-13 — Balances may cross zero:** Penalties may make a Child's Running Balance negative, and a negative balance carries into later Payout Weeks until offset by future earnings.
- **D-14 — Settled history is not retroactive:** Finalized payouts and historical Ledger Entries are not rewritten by later reviews, chore edits, or configuration changes; unresolved work remains pending until its outcome is final.
- **D-15 — Sibling financial privacy is limited, not absolute:** Household members may see shared claim/activity facts and individual chore values, but one Child's total Running Balance and detailed financial history are not visible to sibling Children.
- **D-16 — Recurring occurrences are independent snapshots:** Each recurrence creates an independent Chore Occurrence whose value and deadline are fixed when that occurrence is created; editing or deleting the Chore Definition affects future occurrence generation but does not mutate existing occurrences.
- **D-17 — Each submission has one authoritative review decision:** A Submission may receive at most one successful Parent review decision; if Parents act concurrently, the first successful decision wins and later conflicting attempts cannot overwrite it.
- **D-18 — Chore values use positive whole SEK:** In the first release, every paid chore value is greater than zero and denominated in whole Swedish kronor; fractional values and other currencies are invalid.
- **D-19 — Every occurrence has a deterministic availability window:** Each Chore Occurrence has an availability start and deadline. A Parent may configure an explicit availability time; otherwise the availability start is derived from the beginning of the scheduled day. The occurrence cannot be acted on before that start.
- **D-20 — Household timezone is schedule-authoritative:** One IANA Household Timezone governs recurrence, availability, deadline, and payout-calendar resolution. Changing it affects future occurrence/period generation only; already-created occurrences and open/settled periods keep their previously resolved absolute instants.

## State Models

### Chore Occurrence
| State | Entered by | Allowed next outcomes |
|---|---|---|
| Scheduled | Recurrence or one-off creation before its availability start | Becomes Available when the availability start is reached, or may be cancelled by a Parent |
| Available | Availability start is reached | Personal: awaiting submission until deadline; Claimable: may be claimed, or expires unclaimed at deadline |
| Submitted | Child submits by the active deadline | Approved or rejected by Parent |
| Redo Required | Parent rejects the first on-time submission | Redo submitted by the redo deadline, or failed when that deadline is missed |
| Approved | Parent approves valid submitted work | Terminal for the occurrence |
| Missed / Failed | Applicable deadline passes without a valid submission, or the single redo is missed/rejected | Terminal for the occurrence |
| Cancelled | Parent cancels an eligible current occurrence | Terminal; no Child penalty |
| Expired Unclaimed | Claimable occurrence reaches its deadline without any Claim | Terminal; no Child penalty |

**Redo limit:** An occurrence can enter `Redo Required` at most once. If the redo submission is rejected, or no redo is submitted by the redo deadline, the occurrence resolves as failed. A failed Personal Chore earns 0 with no penalty; a failed claimed Claimable Chore receives the normal monetary penalty.

**Recurrence, availability, and editing:** Recurring occurrences are independent and may overlap in unresolved states. Each occurrence has an availability start and deadline; an explicit Parent-configured availability time overrides the default start-of-scheduled-day rule. A newer occurrence becoming available does not cancel, merge, or rewrite an older occurrence that is still under review or redo. Edits to a Chore Definition apply only to future occurrence generation; an existing unresolved occurrence keeps its snapshotted availability start, value, and deadline. A Parent may cancel an unresolved current occurrence where cancellation is otherwise allowed, but terminal occurrences cannot be reopened by editing the definition.

### Claim
| State | Trigger | Notes |
|---|---|---|
| Claimed, Unlocked | Eligible Child claims before the 2-hour lock boundary and still has unclaim rights | Child may unclaim before the lock boundary |
| Claimed, Locked | Time reaches the lock boundary, the Child has exhausted weekly unclaims, or the Child claims inside the lock window | Child cannot unclaim |
| Submitted / Under Review | Child submits work on time | Still occupies the Child's active-claim slot |
| Redo Required | Parent rejects first on-time submission | Still occupies the active-claim slot; one redo only |
| Approved | Parent approves | Terminal; releases active-claim slot and creates earning |
| Unclaimed | Child successfully unclaims while allowed | Terminal; consumes one weekly unclaim |
| Cancelled | Parent cancels | Terminal; no penalty and no Child unclaim consumed |
| Failed | Applicable deadline missed, or single redo fails | Terminal; creates full-value penalty |

### Personal Unlock
- Claim access begins only after Parent approval of the relevant Unlock Chore Occurrence.
- A missed unlock occurrence cannot be manually excused to open Claimable Chores.
- The current Unlock Chore Occurrence is the newest scheduled occurrence whose availability start has been reached. Before that start, a future occurrence does not lock claim access.
- Approval of an older Unlock Chore Occurrence still earns its approved value, but it does not unlock Claimable Chores once a newer unlock occurrence has become current; the current occurrence must be approved.

### Review / Redo
- Every initial Submission may be approved or rejected by a Parent.
- Rejection of an on-time initial Submission creates exactly one Redo with a new Parent-set deadline.
- A second rejection is not permitted to create another Redo; it resolves the occurrence as failed.
- Each Submission can be reviewed successfully only once. If two Parents attempt to review the same Submission, the first successful review determines its next state and the later conflicting action has no domain effect.

### Financial Ledger / Settlement
- Approved chore earnings and missed locked-claim penalties are represented as durable financial effects.
- Negative balances carry across payout periods.
- Positive finalized amounts are manually paid through Swish and marked settled by a Parent.
- Financial outcomes finalized after a settled payout are posted to the next unsettled payout period; a settled payout is never reopened.
- If the payout weekday changes during an open Payout Week, the current period closes on the previously configured payout day and the new weekday governs the next period.
- Weekly unclaim usage remains attached to the current Payout Week and resets only when that period closes.
- A Payout marked paid is immutable in the first release; the domain provides no in-app correction or reopening transition for a real-world payment mistake.
- Chore earnings and penalties are denominated in whole SEK; a chore value must be a positive whole-krona amount.

## Domain Boundaries
- **Chore execution** owns occurrence, claim, submission, review, redo, and deadline semantics.
- **Household finance** owns earnings, penalties, running balance, payout periods, and settlement history.
- **Household social visibility** may expose approved activity facts without exposing sibling-private total balances or detailed financial history.

## Unresolved Domain Questions
None.
