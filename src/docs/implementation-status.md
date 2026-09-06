# Current Implementation Status

**Current milestone:** TASK-06 complete  
**Next milestone:** TASK-07 — timezone-stable chore occurrences

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

## Current backend organization

Public Convex domain modules remain at the `convex/` root so their generated API paths stay stable.

Schema definitions are organized under:

```text
convex/schema/
```

Current domain modules include:

```text
convex/
├── auth.ts
├── households.ts
├── parentInvites.ts
├── childPairing.ts
├── childAccess.ts
├── choreDefinitions.ts
└── task06SmokeTests.ts
```

## Next — TASK-07

TASK-07 will introduce concrete Chore Occurrences.

The key distinction will be:

```text
Chore Definition
    ↓
Household-local recurrence intent
    ↓
TASK-07 schedule generation
    ↓
Chore Occurrence
```

Each occurrence must snapshot the relevant schedule and value terms when it is generated.

TASK-07 must ensure:

- Household IANA timezone is authoritative.
- Device timezone does not affect deadlines.
- Local calendar recurrence resolves to absolute timestamps server-side.
- Existing occurrence timestamps do not move when a Household timezone changes.
- Definition edits affect future generation only.
- Archived definitions stop future generation.
- Existing occurrences preserve immutable schedule and value snapshots.
- Unresolved recurring occurrences may overlap.
- Unclaimed expiry is server-authoritative.
- Monthly recurrence behavior for days 29–31 is deterministic and documented.
