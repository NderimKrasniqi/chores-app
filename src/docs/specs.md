# Journey Specifications
**Status:** Current

## J-01 — Set up a household
**Contract:** A parent can establish a household, add child profiles, and give another parent equal household authority without requiring children to own email accounts.
- A parent creates the household and child profiles; another joined Parent can perform the same parent actions as the creator.
- A Child joins the intended profile using the household's QR/invite-code flow; an invalid join attempt does not attach the Child to a profile.
- Child-facing access does not require the Child to provide an email address.
- **Rules:** `D-01`
- **Excluded:** Exact PIN/session, QR-code, invite-code security, expiry, and device-pairing mechanics are owned by solution design.

## J-02 — Configure chores
**Contract:** Parents can define paid Personal and Claimable Chores whose future occurrences have predictable availability, value, deadline, recurrence, and eligibility.
- A Parent can create one-off or recurring Personal and Claimable Chore Definitions with a positive whole-SEK value and deadline.
- A Parent may set an explicit availability time; otherwise an occurrence becomes available from the beginning of its scheduled day.
- A Claimable Chore is available to all Children by default or may be restricted to selected Children.
- A Parent may designate at most one recurring Personal Chore as a Child's Unlock Chore.
- Editing or deleting a definition changes future generation only; existing occurrences and historical outcomes retain their snapshotted terms.
- Once a Claim exists, its occurrence value and deadline cannot be changed for that Claim.
- **Rules:** `D-03`, `D-06`, `D-11`, `D-16`, `D-18`, `D-19`
- **Excluded:** Automatic Swish payment configuration and multi-currency chore values.

## J-03 — Complete personal responsibilities
**Contract:** A Child earns a Personal Chore's value only by submitting it on time and receiving Parent approval; missing it creates no debt.
- An available Personal Chore can be submitted until its active deadline, with optional photo evidence.
- A submission recorded at or before the deadline remains eligible for approval even if the Parent reviews it later.
- Parent approval creates the chore earning. Submission alone does not.
- If no valid submission is made by the applicable deadline, the occurrence becomes missed, earns `0 kr`, and creates no penalty.
- **Rules:** `D-02`, `D-04`, `D-05`, `D-18`, `D-19`

## J-04 — Unlock extra earning opportunities
**Contract:** Claimable Chores are accessible only after the Child's current Unlock Chore occurrence has been approved.
- When the current Unlock Chore occurrence is approved, eligible Claimable Chores become accessible to that Child.
- When a newer Unlock Chore occurrence becomes current at its availability start, claim access is locked again until that occurrence is approved.
- Approval of an older occurrence may still produce its earning but cannot unlock claims after a newer occurrence has become current.
- A missed current Unlock Chore cannot be manually excused by a Parent to open Claimable Chores.
- **Rules:** `D-02`, `D-06`, `D-19`
- **Excluded:** Multiple simultaneous unlock requirements and Parent bypass of a missed unlock occurrence.

## J-05 — Find and claim extra chores
**Contract:** An unlocked, eligible Child can win an available Claimable Chore exclusively on a first-successful-claim basis.
- The Child sees Claimable Chore occurrences that are available and for which the Child is eligible.
- The first successful eligible claim becomes the sole Claim for that occurrence; competing later attempts fail without taking ownership.
- A claimed chore remains visible to the household as claimed by that Child rather than appearing available to siblings.
- A Child with another unresolved Claim cannot claim a second chore.
- An occurrence that reaches its deadline without any Claim expires unclaimed with no Child penalty and remains visible to Parents in history.
- **Rules:** `D-07`, `D-08`, `D-15`, `D-19`

## J-06 — Manage an active commitment
**Contract:** A Child works through one claimed chore at a time, and that claim remains active until it reaches a terminal outcome.
- A claimed chore occupies the Child's active-claim slot while being worked, while under review, and while in redo.
- Approval releases the slot so the Child may claim another chore the same day.
- A Parent may cancel an unresolved claimed occurrence without penalizing the Child or consuming a Child unclaim.
- Accepted value and deadline stay fixed for the active Claim.
- **Rules:** `D-08`, `D-11`
- **Excluded:** Multiple simultaneous active Claims for one Child.

## J-07 — Back out before commitment lock
**Contract:** A Child can unclaim only while both the time window and the weekly unclaim allowance permit it.
- Before the instant two hours prior to the deadline, a Child with remaining unclaim allowance may successfully unclaim; that consumes one weekly unclaim.
- At exactly the two-hour boundary or later, the Claim cannot be unclaimed.
- A Child who has exhausted the weekly allowance may still claim new chores, but those Claims are immediately non-unclaimable for the rest of that Payout Week.
- Claiming inside the two-hour lock window is allowed only with clear user-facing warning that the Claim is immediately locked.
- Parent cancellation does not consume the Child's weekly unclaim allowance.
- **Rules:** `D-09`, `D-10`, `D-11`

## J-08 — Submit and review completed work
**Contract:** Every claimed or personal chore requires Parent review, and an on-time submission is not harmed by review delay.
- A Child submits completed work by the applicable deadline and may attach a photo as optional evidence.
- While a claimed chore is awaiting review, the Child cannot claim another chore.
- Either Parent may approve or reject; if both act concurrently, only the first successful review decision changes the submission outcome.
- Approval records the earning and completes the occurrence.
- A first rejection of an on-time submission sends the occurrence to its single redo opportunity instead of immediately treating it as missed.
- **Rules:** `D-02`, `D-04`, `D-08`, `D-17`

## J-09 — Redo rejected work
**Contract:** Rejected on-time work receives exactly one correction opportunity with a new Parent-set deadline.
- After the first rejection, a Parent sets the redo deadline and the Child may submit one redo by that deadline.
- Parent approval of the redo completes the occurrence and creates the normal earning.
- If the redo is not submitted by its deadline, or the redo submission is rejected, no further redo is created.
- A failed Personal Chore earns `0 kr` with no penalty; a failed claimed Claimable Chore receives its full-value penalty.
- **Rules:** `D-02`, `D-05`, `D-12`
- **State model:** Review / Redo

## J-10 — Resolve missed commitments
**Contract:** Missing a locked claimed commitment costs its full value, while missing a Personal Chore never creates a monetary deduction.
- If a locked Claimable Chore has no valid submission by its applicable deadline, its full whole-SEK value is deducted from the Child's Running Balance.
- The same full-value penalty applies when the one allowed redo of a claimed chore ultimately fails.
- A penalty may push the Running Balance below zero, and that negative amount carries into later Payout Weeks.
- A Parent-cancelled Claim creates no penalty.
- **Rules:** `D-05`, `D-11`, `D-12`, `D-13`, `D-18`

## J-11 — Celebrate household progress
**Contract:** Approved chores create lightweight shared recognition without exposing sibling-private financial totals.
- When a chore is approved, household members can see a celebration/activity item identifying the Child, chore, and that chore's earned value.
- Claimed ownership and approved achievement may be visible to siblings.
- A sibling cannot use this social surface to view another Child's Running Balance or detailed financial history.
- **Rules:** `D-15`
- **Excluded:** Leaderboards, rankings, and public running earnings totals.

## J-12 — Keep the family informed
**Contract:** Material chore events produce timely push notifications to the household member who needs to act or know.
- Children are notified about relevant new claimable chores, approvals, rejected work requiring redo, upcoming chore deadlines, and an advance warning before an active Claim reaches its two-hour unclaim lock.
- Parents are notified when a Child submits work requiring review.
- A deadline reminder does not change the authoritative deadline, lock boundary, or submission state if delivery is delayed or missed.
- **Rules:** `D-04`, `D-10`
- **Excluded:** Notification delivery is not itself proof of deadline compliance; infrastructure/retry mechanics belong to solution design.

## J-13 — Settle earnings
**Contract:** Parents settle finalized positive balances on a configurable weekly cadence while negative balances and unresolved work carry forward correctly.
- Parents choose the Household payout weekday and may change it; a change made during an open Payout Week takes effect for the next period.
- On payout, finalized positive unsettled value is shown for manual payment through Swish; after paying, a Parent marks that payout paid.
- A paid payout is immutable in the first release and is not rewritten by later chore outcomes or edits.
- Work still under review or redo at settlement remains pending and its later earning or penalty enters the next unsettled payout period.
- If the Running Balance is negative at the end of a Payout Week, no positive payment is due and the negative balance carries forward to offset later earnings.
- The weekly unclaim count closes and resets with the Payout Week.
- **Rules:** `D-01`, `D-13`, `D-14`
- **State model:** Financial Ledger / Settlement
- **Excluded:** Automatic or embedded Swish initiation and in-app correction/reopening of an accidentally settled payout.
