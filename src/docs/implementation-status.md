# Current Implementation Status

**Current milestone:** TASK-07 complete  
**Next milestone:** TASK-08 — Personal Chore execution, submission, approval, earnings, and misses

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
- Revoked active Child contexts are removed locally when detected.
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
├── crons.ts
├── schema.ts
├── schema/
│   ├── households.ts
│   ├── childAccess.ts
│   └── chores.ts
└── lib/
    ├── choreScheduling.ts
    ├── choreOccurrenceGeneration.ts
    ├── choreOccurrenceLifecycle.ts
    ├── choreOccurrenceMaintenance.ts
    └── householdTime.ts
```

Development-only automated verification currently includes:

```text
convex/
├── task06SmokeTests.ts
├── task07SchedulingSmokeTests.ts
├── task07OccurrenceSmokeTests.ts
└── task07MaintenanceSmokeTests.ts
```

## Chore scheduling model

The current scheduling boundary is:

```text
Chore Definition
    ↓
Household-local recurrence intent
    ↓
Timezone-aware generation
    ↓
Chore Occurrence snapshot
    ├── scheduledLocalDate
    ├── timezone
    ├── availabilityStartsAt
    ├── deadlineAt
    ├── valueSek
    ├── assignment / eligibility
    └── lifecycle state
```

A generated occurrence is historical application state. Later edits to its Chore Definition or Household timezone do not rewrite it.

## Occurrence lifecycle currently implemented

TASK-07 owns:

```text
scheduled
    │ availabilityStartsAt
    ▼
available
```

For an unclaimed Claimable occurrence:

```text
available
    │ deadlineAt
    ▼
expired_unclaimed
```

Later tasks extend this lifecycle with claims, submissions, reviews, redo, approval, failure, cancellation, and financial effects.

## Next — TASK-08

TASK-08 introduces the Personal Chore execution loop.

It must add:

- Child-authorized Personal Chore queries.
- Personal Chore availability visibility.
- On-time submission.
- Server-authoritative submission timestamps.
- Prevention of submissions after the applicable deadline.
- Parent review of Personal Chore submissions.
- Approval lifecycle.
- Approved earning creation.
- Missed Personal Chore resolution.
- Zero earnings for missed Personal Chores.
- No monetary penalty or debt for missed Personal Chores.
- Durable history that continues to use the immutable occurrence snapshots established in TASK-07.
