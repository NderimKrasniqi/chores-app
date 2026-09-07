# Current Implementation Status

**Current milestone:** TASK-11 complete
**Next milestone:** TASK-12 — Deliver claimed-chore submission, parent review, approved earnings, and active-claim release

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
- The ledger schema also reserves `penalty` as a future entry kind for later tasks.
- Running balances and payout settlement are intentionally deferred to later milestones.

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
- `claimed`, `submitted`, and `redo_required` Claims remain Parent-cancellable.
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
├── crons.ts
├── schema.ts
├── schema/
│   ├── households.ts
│   ├── childAccess.ts
│   └── chores.ts
└── lib/
    ├── childAuthorization.ts
    ├── parentAuthorization.ts
    ├── choreScheduling.ts
    ├── choreOccurrenceGeneration.ts
    ├── choreOccurrenceLifecycle.ts
    ├── choreOccurrenceMaintenance.ts
    ├── householdTime.ts
    ├── personalChoreExecution.ts
    └── personalChoreReview.ts
```

Development-only automated verification currently includes:

```text
convex/
├── task06SmokeTests.ts
├── task07SchedulingSmokeTests.ts
├── task07OccurrenceSmokeTests.ts
├── task07MaintenanceSmokeTests.ts
├── task08SubmissionSmokeTests.ts
├── task08ApprovalSmokeTests.ts
└── task08MissSmokeTests.ts
```

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

TASK-08 establishes the immutable ledger seam:

```text
approved Personal Chore
        ↓
ledgerEntries
        ↓
earning +valueSek
```

The following are intentionally not yet implemented:

- Claimable Chore earnings.
- Claim penalties.
- Redo failure penalties.
- Running balance presentation.
- Weekly payout periods.
- Swish settlement tracking.

Those are introduced by later milestones.

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

## Next — TASK-12

TASK-12 adds execution and approval for an owned Claimable Chore.

It will:

- allow the owning Child to submit the claimed occurrence;
- keep submitted work in the active-Claim slot while Parent review is pending;
- allow either authorized Parent to review the submission;
- protect an on-time Child submission from Parent review delay;
- create the approved Claimable Chore earning from immutable occurrence terms;
- release the active-Claim slot after approval;
- preserve the TASK-11 commitment, cancellation, and historical Claim invariants.

TASK-13 will then add the single-redo review lifecycle.
