# Current Implementation Status

**Current milestone:** TASK-15 complete  
**Next milestone:** TASK-16 — Add optional private photo evidence with authorized upload/view and recoverable upload failure

## Completed

### TASK-01 — Application foundation

- Expo / React Native application bootstrapped.
- Expo Router configured.
- NativeWind configured.
- Convex backend connected.
- Connectivity seam established.

### TASK-02 — Parent authentication

- Better Auth integrated with Convex.
- Parent authentication implemented.
- Native session persistence uses `expo-secure-store`.
- Protected Convex functions resolve authenticated actors server-side.

### TASK-03 — Households and Children

- Parents can create Households.
- Household IANA timezone is stored.
- Payout weekday is configured.
- Weekly unclaim allowance is configured.
- Child profiles can be created and listed.
- Household membership is enforced server-side.

### TASK-04 — Second-parent access

- Parent invite creation implemented.
- Invite regeneration and revocation implemented.
- Invite tokens are not persisted in plaintext.
- Accepted Parents receive equal Household authority.

### TASK-05 — Child device access

- Better Auth anonymous Child-device identities implemented.
- Parent-generated QR pairing implemented.
- Manual pairing-code fallback implemented.
- Pairing credentials expire after 15 minutes.
- Pairing credentials are single-use.
- Pairing credentials are stored hashed at rest.
- Manual redemption is rate-limited.
- Parent-controlled Child-device revocation implemented.
- Server-authoritative access grants implemented.
- Shared-device Child profiles implemented.
- Local Child PIN gating implemented.
- Raw PINs are not persisted.
- Child access/session data uses `expo-secure-store`.
- Each saved Child keeps an isolated Better Auth SecureStore namespace.
- Multiple Child profiles can coexist on one physical device.
- Multi-Child devices require profile selection and PIN verification.
- A single saved Child can bypass the chooser on fresh startup when the profile was not explicitly locked.
- Explicit `Lock / switch profile` persists a local lock boundary and requires PIN verification before reopening that Child.
- Child grant IDs are bound locally so saved profiles can react to server-side revocation.
- Revoked saved Child profiles are removed locally when detected.
- Revocation of the currently active Child is enforced reactively.
- Live Parent revocation has been tested across physical devices.
- QR, manual pairing, shared-device access, revocation, and single-use behavior have been tested on physical iPhones.

### TASK-06 — Chore definitions

- Personal and Claimable Chore Definitions implemented.
- Positive whole-SEK values enforced.
- One-off recurrence implemented.
- Daily recurrence implemented.
- Weekly recurrence implemented.
- Monthly recurrence implemented.
- Recurrence intervals implemented.
- Household-local availability time implemented.
- Start-of-day default availability implemented.
- Household-local deadline time implemented.
- Deadline day offsets implemented.
- Personal Child assignment implemented.
- Claimable eligibility for all Children implemented.
- Restricted Claimable eligibility implemented.
- Recurring Personal Unlock Chores implemented.
- At most one active Unlock Chore per Child is enforced.
- Chore Definition editing implemented.
- Chore Definition archiving implemented.
- Archived definitions are excluded from active configuration.
- TASK-06 automated smoke tests cover creation, invalid values, Unlock constraints, update behavior, archive behavior, Unlock replacement, and cleanup.

### TASK-07 — Timezone-stable Chore Occurrences

- Concrete `choreOccurrences` persistence implemented.
- Chore Definition terms are snapshotted when each occurrence is generated.
- Chore Definition identity is retained on every occurrence.
- Occurrence title and description snapshots implemented.
- Positive whole-SEK value snapshots implemented.
- Personal Child assignment snapshots implemented.
- Claimable eligibility snapshots implemented.
- Claimable definitions configured for all Children resolve to explicit Child IDs at occurrence generation time.
- Household IANA timezone is snapshotted on each occurrence.
- Household-local scheduled date is persisted.
- Household-local availability and deadline terms are retained.
- Availability and deadline are resolved into immutable absolute epoch timestamps.
- Changing Household timezone does not move existing occurrences.
- Editing a Chore Definition does not rewrite existing occurrences.
- Future occurrences use the latest active definition and Household timezone.
- Archived definitions stop generating future occurrences.
- Generation is idempotent by Chore Definition and scheduled local date.
- One-off recurrence generation implemented.
- Daily recurrence generation implemented.
- Weekly recurrence generation implemented.
- Monthly recurrence generation implemented.
- Monthly days 29–31 skip months that do not contain the configured calendar day rather than silently clamping to month-end.
- Household-local calendar arithmetic is independent of device timezone.
- DST-aware IANA timezone resolution implemented with `date-fns` and `@date-fns/tz`.
- Future `scheduled` occurrences transition to `available` at the authoritative availability instant.
- Unclaimed Claimable occurrences transition to `expired_unclaimed` at the authoritative deadline.
- Lifecycle reconciliation is idempotent.
- Exact occurrence transitions use Convex durable scheduled functions.
- Rolling occurrence generation keeps a 14-day Household-local future horizon populated.
- A recurring 15-minute Convex maintenance job provides generation and lifecycle reconciliation safety-net behavior.
- Automated scheduling tests cover recurrence, monthly edge cases, IANA zones, deadline offsets, and DST behavior.
- Automated occurrence tests cover idempotency, eligibility snapshots, immutable history, timezone changes, archive behavior, lifecycle boundaries, and cleanup.
- Automated maintenance tests cover rolling generation, Household-local date resolution, availability reconciliation, unclaimed expiry reconciliation, idempotency, and cleanup.

### TASK-08 — Personal Chore execution, review, earnings, and misses

#### Child execution

- Authenticated Child authorization is resolved from the active Better Auth anonymous device identity.
- Child-facing Personal Chore queries resolve the Child server-side rather than accepting a client-supplied Child ID.
- Children only receive Personal Chore occurrences assigned to their own Child profile.
- Personal Chore occurrence visibility includes scheduled, available, submitted, approved, missed, and later lifecycle-compatible states.
- Child UI groups recurring occurrences by Chore Definition.
- The main Child list avoids dumping the entire 14-day generated occurrence window.
- Current unresolved work is shown first.
- When no current unresolved occurrence exists for a recurring definition, only the next upcoming occurrence is shown.
- Recent approved and missed Personal Chores are separated into a small history section.
- Child submission is available only while the occurrence is `available`.
- The backend independently re-validates submission eligibility even when the UI exposes a submit button.
- Submission timestamps are server-authoritative.
- A submission at the exact deadline remains valid.
- Submission after the deadline is rejected.
- Submission before availability is rejected.
- A Child cannot submit another Child's Personal Chore.
- A Claimable occurrence cannot be submitted through the Personal Chore execution path.
- Duplicate first-attempt submissions are prevented.

#### Durable submissions and review

- Durable `choreSubmissions` persistence implemented.
- Submissions retain Household, occurrence, Child, attempt number, and authoritative submission time.
- TASK-08 uses attempt number `1`; the structure is ready for the later single-redo lifecycle.
- Submission itself creates no financial effect.
- Durable `choreReviews` persistence implemented.
- Review records retain Household, occurrence, submission, decision, reviewing Parent, and review time.
- Parent review authorization is enforced server-side.
- Either authorized Parent can approve a pending Personal Chore submission.
- Pending review queries include Child identity, occurrence terms, submitted time, original deadline, value, and Unlock designation.
- Parent UI contains a dedicated `Reviews` section rather than adding more cards to the main Household overview.
- Parent Household UI is organized into `Overview`, `Chores`, `Reviews`, and `Access` sections.
- Approval is transactional.
- Approval verifies that the Personal Chore occurrence is still in the submitted state.
- Approval verifies that the submission belongs to the assigned Child and expected attempt.
- Approval verifies the authoritative `submittedAt` timestamp against the immutable occurrence deadline.
- Parent review delay does not invalidate an on-time Child submission.
- Duplicate successful approval is prevented.
- A successfully reviewed submission receives one durable review record.

#### Earnings ledger

- Durable `ledgerEntries` persistence implemented.
- TASK-08 introduces positive `earning` entries.
- Ledger entries retain Household, Child, occurrence, optional review, kind, amount, and creation time.
- Approval creates the Personal Chore earning.
- Submission alone does not create an earning.
- Approved earning value is taken from the immutable occurrence snapshot.
- Duplicate approval cannot create a duplicate earning.
- The ledger schema also reserves `penalty`, which TASK-14 now uses for failed claimed Claimable commitments.
- TASK-14 now derives Running Balance from Ledger Entries.
- Payout settlement remains deferred to TASK-15.

#### Missed Personal Chores

- Overdue unsubmitted Personal Chores transition to `missed`.
- Exact deadline remains eligible; the Personal miss boundary is strictly after `deadlineAt`.
- Personal miss scheduling uses the first instant after the valid deadline boundary.
- Lifecycle reconciliation never converts `submitted` work to missed while Parent review is pending.
- Rolling maintenance reconciles overdue Personal Chores as a safety net.
- A missed Personal Chore earns `0 kr`.
- A missed Personal Chore creates no ledger penalty.
- A missed Personal Chore creates no debt.
- No negative balance is created for failure to complete a Personal Chore.

#### TASK-08 verification

Automated TASK-08 smoke coverage includes:

- assigned-Child filtering;
- on-time Personal submission;
- duplicate submission rejection;
- before-availability rejection;
- late-submission rejection;
- exact-deadline submission;
- wrong-Child rejection;
- rejection of Claimable occurrences through the Personal execution path;
- pending Parent review visibility;
- approval after the original deadline for an on-time submission;
- occurrence approval state;
- single durable review creation;
- single positive earning creation;
- pending-review queue removal after approval;
- duplicate approval rejection;
- duplicate-earning prevention;
- overdue Personal occurrence generation as missed;
- exact deadline remaining valid;
- post-deadline miss transition;
- protection of submitted occurrences from miss reconciliation;
- rolling maintenance miss reconciliation;
- no penalty/debt ledger creation for Personal misses.

Physical-device verification includes:

- Child Personal Chore visibility;
- recurring occurrence presentation;
- Child submission;
- Parent review visibility;
- Parent approval;
- reactive Child state updates;
- multi-Child profile behavior;
- live Child-device revocation.

### TASK-09 — Claimable Unlock gate

- The Claimable Chore pool is gated by the Child's current Unlock Chore occurrence.
- The current Unlock is the newest Unlock occurrence whose availability has started.
- Future Unlock occurrences do not lock the pool early.
- No current Unlock occurrence means no active gate, so Claimables remain open.
- Approval of the current Unlock opens the pool.
- Submitted, available, missed, redo-required, failed, or otherwise unapproved current Unlocks keep the pool locked.
- Approval of an older Unlock cannot reopen the pool after a newer occurrence becomes current.
- Claimable visibility independently enforces availability, deadline, eligibility, and Unlock access.
- TASK-09 automated smoke tests cover Unlock transitions and Claimable visibility.
- Child UI reactively shows locked/unlocked state and available Claimable Chores.
- Maintenance smoke tests were hardened so synthetic Household-scoped test time cannot mutate unrelated development data.

### TASK-10 — Atomic Claimable Chore claiming

#### Durable Claim ownership

- Durable `choreClaims` persistence implemented.
- Claims retain Household, occurrence, Child, lifecycle state, and authoritative claim time.
- The immutable Chore Occurrence remains the source of value, deadline, timezone, and eligibility terms.
- Child and Household identity are resolved server-side from the authenticated Child session.

#### Atomic claiming rules

- Claiming re-checks the TASK-09 Unlock gate inside the mutation.
- Only available Claimable occurrences may be claimed.
- Eligibility is enforced server-side.
- Cross-Household claiming is rejected.
- Claiming before availability is rejected.
- Claiming at or after the deadline is rejected.
- First successful Claim wins ownership of the occurrence.
- A Child may own at most one unresolved Claim at a time.
- `claimed`, `submitted`, and `redo_required` occupy the active-Claim slot.
- Terminal Claim states release that slot.

#### Visibility

- Claimed occurrences disappear from the available pool for all eligible Children.
- Active Claim ownership remains visible.
- The claimant sees `You claimed this`.
- Other Children see `Claimed by <Child>`.
- Submitted and redo-required Claims remain visible as active ownership.
- Terminal Claims leave the active claimed-by surface.

#### Deadline integration

- Unclaimed Claimable occurrences still become `expired_unclaimed` at the deadline.
- An occurrence with an active or completed Claim is protected from being incorrectly marked `expired_unclaimed`.
- TASK-10 regression coverage verifies both sides of this deadline boundary.

#### Child UI and Maestro

- Available Claimable Chores expose a `Claim` action.
- Successful Claims reactively move from `Available` to `Claimed`.
- Additional Claim actions are disabled while the Child owns an unresolved Claim.
- Claimable presentation is split into a reusable view and Convex-backed wrapper.
- Local Maestro testing runs against Expo Go on the iOS Simulator with no EAS dependency.
- A basic app-shell Maestro smoke flow verifies accessibility automation.
- A development-only TASK-10 fixture drives the same production Claimable UI with deterministic state.
- Maestro verifies Claim action, claimant visibility, sibling claimed-by visibility, removal from Available, and one-active-Claim UI behavior.

#### TASK-10 automated verification

Backend smoke coverage includes:

- successful eligible Claim;
- exclusive ownership;
- duplicate-Claim rejection;
- one unresolved Claim per Child;
- active-slot release after terminal state;
- eligibility enforcement;
- future occurrence rejection;
- exact-deadline rejection;
- Unlock-gate enforcement;
- cross-Household rejection;
- claimed-by visibility;
- claimed occurrence removal from all available pools;
- submitted Claim active visibility;
- terminal Claim removal from active visibility;
- unclaimed deadline expiry;
- active Claim protection from `expired_unclaimed`.

### TASK-11 — Claim commitment, unclaim, and Parent cancellation

#### Weekly unclaim accounting

- Successful Child-initiated unclaims remain durable Claim history.
- `unclaimedAt` is the authoritative timestamp used for weekly unclaim accounting.
- Parent cancellation never writes `unclaimedAt` and never consumes Child allowance.
- Weekly usage is counted against the Household-configured unclaim allowance.
- Exhausting the allowance does not prevent future Claims; new Claims become immediately non-unclaimable for that Payout Week.
- Until durable Payout Periods arrive in TASK-15, TASK-11 resolves the current Payout Week from Household-local midnight on the configured payout weekday.
- Household-local payout boundaries use timezone-aware calendar arithmetic, including DST transitions.

#### Two-hour commitment lock

- The Child unclaim lock begins exactly two hours before the immutable occurrence deadline.
- One millisecond before the boundary remains eligible when allowance remains.
- At the exact boundary and afterward, Child unclaim is rejected.
- Lock decisions are re-derived server-side.
- Claiming inside the lock window remains permitted.

#### Locked-Claim acknowledgement

- Child Claimable queries expose derived commitment-lock and remaining-unclaim metadata.
- Claims that would be immediately non-unclaimable require explicit Child acknowledgement.
- Immediate lock can result from the two-hour time window or exhausted weekly allowance.
- The Claim mutation independently re-checks the commitment state and never trusts client calculations.
- Ordinary unlocked Claims require no additional acknowledgement.

#### Child unclaim lifecycle

- Only an actively `claimed`, unsubmitted Claim may be voluntarily unclaimed.
- Submitted and redo-required Claims cannot be Child-unclaimed.
- Successful unclaim transitions the durable Claim to `unclaimed`.
- A successful unclaim consumes exactly one weekly allowance.
- Rejected unclaim attempts consume no allowance and make no Claim mutation.
- A Child cannot unclaim another Child's Claim.
- Successful unclaim releases the Child's active-Claim slot.
- The occurrence returns to the available pool while still before its deadline.
- Historical `unclaimed` Claim rows remain durable.
- A later eligible Child may create a new Claim for that occurrence.
- Historical released ownership no longer blocks reclaim.

#### Parent cancellation

- Either authorized Parent may cancel an unresolved Claim.
- A `claimed` Claim remains Parent-cancellable through the exact original occurrence deadline.
- A `redo_required` Claim remains Parent-cancellable through the exact Redo deadline.
- Strictly after the applicable deadline, cancellation is rejected so delayed scheduler execution cannot erase an already-due failure consequence.
- An on-time `submitted` Claim remains Parent-cancellable after its submission deadline because Parent review delay does not turn valid submitted work into a missed commitment.
- Terminal Claims cannot be reopened through cancellation.
- Parent cancellation transitions both Claim and Chore Occurrence to `cancelled`.
- Cancellation retains authoritative cancellation time and Parent identity.
- Parent cancellation creates no Ledger Entry or penalty.
- Parent cancellation consumes no weekly Child unclaim.
- Cancellation releases the active-Claim slot.
- Cancelled Claims leave active claimed-by visibility.
- Cross-Household cancellation is rejected server-side.

#### TASK-11 UI and automated verification

- Child UI shows remaining weekly unclaims.
- Owned Claims show whether voluntary unclaim is still available or the commitment is locked.
- Child UI only exposes Unclaim while the derived commitment remains eligible.
- Immediately locked Claims use inline confirmation before acknowledgement is sent to Convex.
- Parent cancellation remains inside the existing compact Active claims section.
- Parent cancellation uses inline confirmation explaining the no-penalty and no-unclaim-consumption behavior.
- Development-only Maestro fixtures exercise the same reusable production presentation components.
- Maestro covers Child unclaim, pool return, allowance decrement, locked-Claim acknowledgement, locked owned-Claim presentation, and Parent cancellation.
- TASK-10 claiming, visibility, and deadline regressions remain green.

### TASK-12 — Claimable Chore submission, review, earnings, and active-Claim release

#### Child submission

- An authenticated Child may submit only their own actively `claimed` Claimable Chore.
- Child and Household identity are resolved server-side from the active Child access grant.
- Claim ownership, Household identity, occurrence kind, occurrence state, and immutable deadline are revalidated inside the mutation.
- Submission timestamps are server-authoritative.
- Submission at the exact immutable deadline remains valid.
- Submission after the deadline is rejected without changing Claim or occurrence state.
- Initial Claimable submission uses durable `choreSubmissions` attempt `1`.
- Duplicate initial submission is prevented.
- Successful submission atomically transitions both the Claim and Chore Occurrence to `submitted`.
- Submission itself creates no Ledger Entry and no earning.
- A submitted Claim remains unresolved and continues occupying the Child's single active-Claim slot.
- Submitted Claims cannot be Child-unclaimed or submitted a second time.

#### Parent review and approval

- Authorized Parents can list pending Claimable submissions in the existing Household `Reviews` section.
- Pending review resolution verifies the persisted submission, Claim ownership, Child identity, Household identity, Claimable occurrence, and submitted lifecycle state.
- Review eligibility uses the authoritative persisted `submittedAt` value rather than Parent review time.
- Parent review delay therefore cannot invalidate an on-time Child submission.
- Either authorized Parent may approve a pending Claimable submission.
- Approval creates one durable `approved` Chore Review.
- Approval creates one positive Ledger Entry using the immutable Chore Occurrence value.
- Duplicate approval cannot create a second review or duplicate earning.
- Successful approval transitions both the Claim and Chore Occurrence to `approved`.
- Approved Claim ownership leaves the unresolved active-Claim set, releasing the Child's active slot.

#### TASK-12 presentation and verification

- Child Claimable UI exposes `Submit for review` only for the Child's own actively `claimed` Claim.
- Submitted work remains visible as `Waiting for parent approval`.
- While review is pending, the UI continues to block a second active Claim.
- Parent Claimable reviews remain inside the existing `Reviews` section rather than adding another Household tab.
- Claimable review presentation is separated into a reusable view and Convex-backed wrapper.
- Development-only Maestro fixtures exercise the same reusable Child and Parent production presentation.
- Maestro verifies Claimable Claim → submission → pending review while the active slot stays occupied.
- Maestro verifies Parent approval → earning confirmation → removal from the pending-review queue.
- TASK-12 backend smoke coverage verifies on-time submission, exact-deadline submission, ownership and Household isolation, duplicate prevention, no earning on submission, active ownership while submitted, pending Parent review, approval after deadline for on-time work, immutable-value earning, terminal approval, active-slot release, duplicate financial-effect prevention, late persisted submission rejection, and Claim/submission ownership consistency.
- TASK-08 approval behavior and TASK-10/TASK-11 Claim ownership, visibility, deadline, unclaim, and Parent-cancellation regressions remain green.
- Rejection, redo deadlines, second submissions, and the first-successful concurrent Parent review lifecycle were delivered in TASK-13.

## Current backend organization

Public Convex domain modules remain at the `convex/` root so generated API paths remain stable.

Schema definitions are organized under:

```text
convex/schema/
```

Reusable private backend helpers are organized under:

```text
convex/lib/
```

Relevant current modules include:

```text
convex/
├── auth.ts
├── households.ts
├── parentInvites.ts
├── childPairing.ts
├── childAccess.ts
├── choreDefinitions.ts
├── choreOccurrences.ts
├── choreOccurrenceTransitions.ts
├── choreOccurrenceMaintenance.ts
├── personalChores.ts
├── personalChoreReviews.ts
├── claimableChores.ts
├── claimableClaimCancellations.ts
├── claimableChoreSubmissions.ts
├── claimableChoreReviews.ts
├── childRedos.ts
├── redoChoreReviews.ts
├── redoDeadlineTransitions.ts
├── runningBalances.ts
├── crons.ts
├── schema.ts
├── schema/
│   ├── households.ts
│   ├── childAccess.ts
│   ├── claims.ts
│   ├── chores.ts
│   └── redos.ts
└── lib/
    ├── childAuthorization.ts
    ├── parentAuthorization.ts
    ├── choreScheduling.ts
    ├── choreOccurrenceGeneration.ts
    ├── choreOccurrenceLifecycle.ts
    ├── choreOccurrenceMaintenance.ts
    ├── householdTime.ts
    ├── personalChoreExecution.ts
    ├── personalChoreReview.ts
    ├── claimableChoreClaiming.ts
    ├── claimableChoreCancellation.ts
    ├── claimableChoreExecution.ts
    ├── claimableChoreReview.ts
    ├── initialChoreRejection.ts
    ├── redoSubmission.ts
    ├── redoChoreReview.ts
    ├── redoDeadlineFailure.ts
    ├── claimableFailurePenalty.ts
    └── runningBalance.ts
```

Development-only automated verification currently includes TASK-06 through TASK-14 smoke suites, including dedicated TASK-14 coverage for:

- immutable penalty Ledger invariants;
- missed locked-Claim failure;
- maintenance penalty reconciliation;
- original-deadline Parent cancellation boundaries;
- Redo-deadline Parent cancellation boundaries;
- negative Running Balance and cross-week carry-forward.

## Current chore data model

The Chore Definition remains the Parent-configured recurring intent:

```text
Chore Definition
    ↓
Household-local recurrence intent
    ↓
Timezone-aware generation
    ↓
immutable Chore Occurrence snapshot
```

A generated occurrence retains:

```text
choreOccurrence
├── choreDefinitionId
├── kind
├── title / description
├── valueSek
├── scheduledLocalDate
├── timezone
├── availabilityStartsAt
├── deadlineAt
├── Personal assignment / Claimable eligibility
├── Unlock designation
└── lifecycle state
```

A generated occurrence is historical application state. Later edits to its Chore Definition or Household timezone do not rewrite it.

## Personal Chore lifecycle currently implemented

Before availability:

```text
scheduled
    │ availabilityStartsAt
    ▼
available
```

Successful Personal execution:

```text
available
    │ Child submits on time
    ▼
submitted
    │ Parent approves
    ▼
approved
    │
    └── positive earning ledger entry
```

Missed Personal responsibility:

```text
available
    │ now > deadlineAt
    │ no valid submission
    ▼
missed
    │
    ├── 0 kr earned
    ├── no penalty
    └── no debt
```

A valid submission protects the Child from Parent review delay:

```text
submittedAt <= deadlineAt
        │
        └── remains eligible for approval
            even when reviewed later
```

## Financial boundary currently implemented

The immutable Ledger is the authoritative financial source:

```text
approved Personal / Claimable / Redo work
        ↓
ledgerEntries
        ↓
earning +valueSek
```

```text
failed locked claimed Claimable commitment
        ↓
ledgerEntries
        ↓
penalty -valueSek
```

TASK-14 establishes the current Running Balance boundary:

- approved earnings use immutable Chore Occurrence value snapshots;
- missing a locked claimed Claimable Chore strictly after its original deadline creates one full-value negative penalty;
- a rejected or missed claimed Claimable Redo creates one full-value negative penalty;
- failed or missed Personal Chores remain penalty-free and cannot create debt;
- Parent cancellation creates no penalty;
- penalty creation is idempotent so scheduled retries and maintenance reconciliation cannot double-charge;
- an occurrence cannot simultaneously receive an earning and a failure penalty;
- Running Balance is derived from immutable Ledger Entries rather than stored as a mutable total;
- Running Balance may cross below zero;
- later earnings offset carried negative value before producing a positive balance;
- calendar-week changes do not reset a negative Running Balance;
- Child-facing balance access resolves the authenticated Child server-side and exposes only that Child's total;
- Parent-facing balance access is Household-authorized and cannot query a Child from another Household.

The following are intentionally deferred to TASK-15:

- durable Payout Periods;
- marking positive payouts as paid;
- settlement boundaries on Ledger Entries;
- manual Swish settlement tracking;
- closing/resetting weekly unclaim accounting against durable Payout Periods.

## Child-device UX boundary currently implemented

Saved Child device identities remain isolated from one another.

Current intended behavior:

```text
0 saved Children
→ pair / join flow
```

```text
1 saved Child
→ fresh app start may open that Child directly
→ unless explicitly locked
```

```text
2+ saved Children
→ profile chooser
→ Child selection
→ local PIN
```

```text
Lock / switch profile
→ persistent local lock boundary
→ PIN required before reopening that Child
```

```text
Parent revokes device access
→ Convex access becomes inactive
→ local revoked Child profile is removed
```

The Child PIN is a local profile boundary. Server authorization always depends on the active Better Auth device identity and current Convex access grant.

## Next — TASK-15

TASK-15 completes the settlement boundary around the immutable Ledger and TASK-14 Running Balance.

It will:

- introduce durable Payout Periods;
- resolve Household payout-week boundaries from the configured payout weekday and timezone;
- carry negative unsettled balances forward rather than creating a positive payout;
- keep unresolved work out of a closed payout until its later financial outcome exists;
- expose finalized positive unsettled value for manual Swish payment;
- allow an authorized Parent to mark a payout paid;
- keep paid payout history immutable;
- close/reset weekly unclaim accounting against the durable Payout Period.

### TASK-13 — Single-Redo review lifecycle and first-successful Parent review

#### Durable Redo facts

- Durable `choreRedos` persistence implemented.
- A Redo retains Household, occurrence, initial Submission, rejection Review, Parent-set local deadline date/time, absolute deadline, and creation time.
- The original Chore Occurrence deadline remains immutable.
- The active Redo deadline is stored separately from the original occurrence deadline.
- Redo deadline resolution uses the immutable occurrence timezone.
- A Redo deadline must be strictly after the rejection Review time.
- At most one Redo is created for an occurrence.

#### Initial rejection and Redo creation

- Either authorized Parent may reject an on-time first Submission.
- Only attempt `1` can create a Redo.
- Initial rejection creates one durable rejected Review and one durable Redo.
- Personal occurrences transition to `redo_required`.
- Claimable occurrences and their active Claims both transition to `redo_required`.
- A Claim remains active while Redo work is outstanding.
- Initial rejection creates no earning and no penalty.
- A late initial Submission cannot receive a Redo.
- Duplicate rejection cannot create another Review or Redo.
- Claimable ownership is revalidated transactionally.

#### Child Redo submission

- Redo submission is attempt `2`.
- Personal and Claimable Redo submission use separate explicit mutations from the attempt-1 paths.
- Redo eligibility is derived from the durable Redo record rather than the original occurrence deadline.
- Submission at the exact Redo deadline is valid.
- Submission after the Redo deadline is rejected.
- Duplicate attempt-2 submissions are prevented.
- Claimable Redo submission requires the same Child to own the active `redo_required` Claim.
- Claimable attempt-2 submission keeps the active Claim slot occupied while Parent review is pending.
- Redo submission itself creates no financial effect.

#### Final Redo review

- Parent approval of an on-time attempt-2 Submission completes the occurrence.
- Claimable Redo approval also transitions the Claim to `approved` and releases the active Claim slot.
- Approved Redos earn the immutable occurrence value.
- Parent review delay cannot invalidate an on-time Redo Submission.
- Parent rejection of attempt `2` is final.
- Rejected Personal Redos transition to `failed`.
- Rejected Claimable Redos transition both the occurrence and Claim to `failed`.
- No second Redo can be created.
- TASK-14 extends failed claimed Claimable Redos with the required full-value penalty.

#### Redo deadline failure

- Exact Redo deadline remains valid.
- Failure occurs only strictly after the Redo deadline.
- Initial rejection schedules a durable Convex transition for `deadlineAt + 1`.
- An unsubmitted Personal Redo becomes `failed` after its deadline.
- An unsubmitted Claimable Redo transitions both Claim and occurrence to `failed`.
- TASK-14 extends missed claimed Claimable Redo deadline failure with a full-value penalty; missed Personal Redos remain penalty-free.
- A failed Claimable Redo releases the active Claim slot.
- Scheduled deadline reconciliation is idempotent.
- The scheduled callback is harmless after timely attempt-2 submission, Parent cancellation, or another terminal transition.

#### First-successful Parent review authority

- Every Submission permits at most one successful Parent review decision.
- Competing Approve and Reject mutations use Convex transactional conflict detection and retry behavior.
- In a concurrent attempt-1 Approve-versus-Reject race, exactly one decision succeeds.
- The losing mutation cannot create a second Review, earning, or Redo.
- The durable lifecycle and financial result always match the first successful Review.
- Later conflicting review attempts cannot overwrite the authoritative decision.
- Attempt-2 review paths preserve the same one-decision-per-Submission invariant.

#### Parent and Child UI

- The existing Parent `Reviews` section supports rejecting attempt-1 Personal and Claimable submissions.
- Parent rejection requires a Household-local Redo date and time.
- Redo controls use stable automation IDs for date, time, and reject actions.
- Parent scrolling preserves taps while text inputs are active.
- Child Personal Redos display the authoritative Redo deadline and an attempt-2 submit action.
- Child Claimable Redos display the authoritative Redo deadline, explain that the Claim remains active, and expose attempt-2 submission.
- Parent `Reviews` includes a compact Redo review section.
- Parent Redo approval completes and earns.
- Parent Redo rejection clearly communicates that the result is final and failed.
- Development-only Maestro fixtures exercise the same reusable production presentation components.

#### TASK-13 automated verification

Backend smoke coverage includes:

- Redo deadline timezone and wall-clock resolution;
- initial rejection for Personal and Claimable submissions;
- exactly one durable Redo creation;
- attempt-2 Personal and Claimable submission;
- exact Redo-deadline submission acceptance;
- post-deadline Redo submission rejection;
- Redo approval and immutable-value earning;
- Redo rejection as terminal failure;
- Claim slot retention during Redo and release after terminal resolution;
- protection from Parent review delay;
- exact-deadline protection and post-deadline failure;
- idempotent Redo deadline reconciliation;
- harmless scheduled callbacks after timely submission or cancellation;
- first-successful concurrent Parent Approve-versus-Reject behavior;
- prevention of later conflicting review decisions.

TASK-13 smoke suites pass with:

- Redo deadline rules: `5/5`;
- initial rejection: `8/8`;
- Redo submission: `9/9`;
- Redo review: `9/9`;
- Redo deadline failure: `7/7`;
- concurrent review authority: `8/8`.

Regression coverage remains green for TASK-08 Personal approval, TASK-11 Parent cancellation, and TASK-12 Claimable submission and approval.

Maestro coverage verifies:

- attempt-1 Parent rejection with a Redo deadline;
- Child Personal and Claimable Redo presentation and submission;
- final Parent Redo approval and rejection;
- existing Claim, unclaim, Parent cancellation, TASK-12 submission, and TASK-12 Parent approval journeys.

### TASK-14 — Locked-Claim penalties, failed-Redo penalties, and negative Running Balance

#### Immutable penalty Ledger Entries

- Negative `penalty` Ledger Entries are created for financially failed claimed Claimable Chores.
- Penalty value is always the negative of the immutable Chore Occurrence `valueSek` snapshot.
- Later edits to the Chore Definition cannot alter an already accepted commitment's financial consequence.
- Penalty creation verifies that the Claim and occurrence are both terminally `failed`.
- A failed Personal Chore cannot create a penalty.
- An occurrence with an earning cannot also receive a failure penalty.
- Reconciliation detects an existing matching penalty and returns it idempotently.
- Duplicate penalties for the same occurrence are rejected as an invariant violation.

#### Missed locked original Claims

- A still-owned `claimed` Claimable occurrence remains submit-capable at the exact original deadline.
- Failure occurs only when `now > deadlineAt`.
- Strictly after the deadline, an unresolved owned Claim transitions both Claim and occurrence to `failed`.
- The same transaction creates one full-value penalty.
- Failed ownership leaves active claimed-by visibility and releases the Child's active-Claim slot.
- Never-claimed Claimable occurrences continue to become `expired_unclaimed` without penalty.
- Exact-deadline submission remains protected from later lifecycle reconciliation.
- Claimable occurrence generation schedules both the exact-deadline expiry check and the first post-deadline failure check.
- The recurring maintenance job reconciles overdue owned Claims as a safety net.
- Scheduled and maintenance reconciliation remain idempotent.

#### Failed Claimable Redos

- Rejection of attempt `2` is final and creates the full-value penalty for a claimed Claimable Chore.
- Missing the Redo deadline strictly after its authoritative `choreRedos.deadlineAt` creates the same full-value penalty.
- Personal Redo rejection and Personal Redo deadline failure remain penalty-free.
- Claimable Redo failure transitions both Claim and occurrence to `failed`.
- Repeated Redo reconciliation cannot double-charge the Child.
- An on-time attempt-2 submission remains protected from later Redo deadline reconciliation.

#### Parent cancellation deadline race

- Parent cancellation itself remains penalty-free and consumes no Child unclaim.
- A still-`claimed` commitment may be Parent-cancelled through the exact original occurrence deadline.
- Strictly after the original deadline, cancellation is rejected because the financial failure condition is already due.
- A `redo_required` Claim uses the Redo's own immutable deadline rather than the original occurrence deadline.
- Parent cancellation remains valid through the exact Redo deadline and is rejected strictly afterward.
- A valid on-time `submitted` Claim remains Parent-cancellable after its applicable deadline because Parent review delay is harmless.
- Late cancellation rejection does not mutate the unresolved Claim; normal scheduled or maintenance reconciliation subsequently records the failure and penalty.

#### Running Balance and negative carry-forward

- Running Balance is derived from immutable Ledger Entries rather than stored as mutable Child state.
- Until TASK-15 introduces settlement, all existing Ledger Entries participate in the current Running Balance.
- Positive earnings and negative penalties are summed for exactly one Child.
- A penalty may move the balance below zero.
- Negative balances are not clamped to zero.
- A later week's earning first offsets carried negative value.
- Future earnings may eventually move the Running Balance back above zero.
- Sibling Ledger Entries cannot affect another Child's Running Balance.

#### Financial privacy and public queries

- `runningBalances.getMine` accepts no Child ID.
- The Child's identity is resolved from authenticated Child-device access server-side.
- The Child-facing query exposes only that Child's Running Balance total.
- `runningBalances.getForChild` first authorizes the Parent for the requested Household.
- Parent lookup additionally verifies the requested Child belongs to that Household.
- Cross-Household Child balance lookup is rejected.
- Detailed sibling Ledger history is not exposed through the Running Balance surface.

#### Child UI and Maestro

- The Child home shows a compact `Running balance` surface near the top of the existing screen.
- No new Child tab or navigation surface was introduced.
- The displayed amount may be negative.
- The reusable presentation component is exercised by a development-only TASK-14 Maestro fixture.
- Maestro verifies rendering of a deterministic `-100 kr` Running Balance.
- Existing TASK-10 Claim, TASK-11 unclaim and Parent cancellation, TASK-12 submission and approval, and TASK-13 Redo flows remain green.

#### TASK-14 automated verification

Backend smoke coverage includes:

- refusal to penalize an unresolved Claim;
- immutable occurrence-value penalty calculation;
- idempotent penalty creation;
- prevention of earning-plus-penalty double financial outcomes;
- prevention of Personal debt;
- exact original deadline protection;
- post-deadline locked-Claim failure and full penalty;
- active-slot release after failed Claim;
- never-claimed expiry without penalty;
- exact-deadline submission protection;
- maintenance reconciliation and retry idempotence;
- missed Personal Redo with no penalty;
- missed claimed Claimable Redo full penalty;
- rejected Personal Redo with no penalty;
- rejected claimed Claimable Redo full penalty;
- exact Redo deadline protection;
- on-time Redo submission protection;
- original-Claim Parent cancellation before and at the deadline;
- rejection of original-Claim Parent cancellation strictly after deadline;
- Redo Parent cancellation before and at the Redo deadline;
- rejection of Redo Parent cancellation strictly after the Redo deadline;
- submitted Claim cancellation after an on-time submission;
- zero initial Running Balance;
- negative Running Balance creation;
- cross-week negative carry-forward;
- future earning offset of carried debt;
- return from negative to positive balance;
- sibling financial isolation.

Final TASK-10 through TASK-14 backend regression coverage passes.

Final Maestro regression coverage passes for:

- TASK-10 Claim UI;
- TASK-11 unclaim UI;
- TASK-11 Parent cancellation UI;
- TASK-12 Claimable submission UI;
- TASK-12 Parent review UI;
- TASK-13 Child Redo UI;
- TASK-13 Parent initial rejection UI;
- TASK-13 Parent Redo review UI;
- TASK-14 Running Balance UI.


### TASK-15 — Payout periods and manual settlement

- Durable Household Payout Periods implemented with immutable timezone, payout-weekday, start, and end snapshots.
- Existing open periods retain their configured closing boundary when the Household payout weekday changes.
- A changed payout weekday governs the next period.
- Exact Payout Period closure uses Convex scheduled internal functions with recurring maintenance reconciliation as a safety net.
- Payout Period closure snapshots one financial outcome per Child.
- Positive finalized unreserved balances create pending manual Swish payouts.
- Parent confirmation marks a pending payout paid; paid payouts cannot be reopened.
- Negative balances create no payment and carry into later periods.
- Prior pending or paid payout amounts are reserved so the same earnings cannot appear in multiple payouts.
- Financial effects finalized after a period cutoff enter a later payout.
- Work still under review or Redo is surfaced as a pending outcome and is not backdated into a closed payout.
- Running Balance now subtracts only confirmed paid payouts; pending payouts remain unsettled until Parent confirmation.
- Weekly Child unclaim accounting now uses the durable Payout Period boundary and resets when the period closes.
- Parent UI includes a dedicated Payouts section for current-period visibility, payout weekday configuration, manual Swish amounts, pending outcomes, negative carry, and Mark paid confirmation.
- TASK-15 automated regression coverage verifies settlement, negative carry, later-period outcomes, payout-day changes, weekly reset behavior, TASK-14 Running Balance, and TASK-11 unclaim accounting.
