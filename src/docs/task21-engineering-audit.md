# TASK-21 Engineering Audit

**Status:** Complete — findings approved for TASK-22 stabilization

## Scope

Complete engineering audit of the first-release implementation before production UI work.

Reviewed:

- Parent and Child authentication
- Household authorization
- Parent invites
- Child device pairing and revocation
- SecureStore shared-device architecture
- Chore definitions and occurrence generation
- Personal and Claimable execution
- Claim ownership and commitment rules
- Parent review and Redo lifecycle
- Ledger, Running Balance, payouts, and settlement
- Photo evidence storage and authorization
- Household activity
- Push notification registration and delivery
- Offline/server-confirmed mutation behavior
- Convex scheduled work and maintenance
- Public Convex API boundaries
- Reactive query architecture
- Test architecture and release verification
- Expo SDK 57 and current Convex design guidance

## P0

### P0-01 — Parent and Child principal separation

Anonymous Better Auth identities are intentionally used for Child devices.

Parent authority is currently represented only by a `householdMembers` row with
`role: "parent"`.

Some Parent membership creation and authorization paths do not reject anonymous
Better Auth identities.

Consequences:

- an anonymous Child-device identity possessing a Parent invite could accept it
  and become a Parent;
- an anonymous identity can create a Household and insert itself as Parent;
- duplicated Parent authorization helpers may continue trusting a bad historical
  membership row.

Required stabilization:

1. Define one authoritative server-side Parent-principal check.
2. Anonymous Better Auth users must never pass that check.
3. All Parent Household authorization must use that check.
4. Household creation must require a non-anonymous Parent principal.
5. Parent invite acceptance must require a non-anonymous Parent principal.
6. Parent-membership creation must never accept an anonymous identity.
7. Add adversarial regression coverage proving Child identities cannot exercise
   Parent authority even if supplied valid Parent resources.

## P1

### P1-01 — Bounded operational read models

Several reactive operational queries derive current UI state by reading
lifetime history.

Examples include:

- Personal Chore occurrence history;
- Claimable occurrence and Claim history;
- Redo history;
- pending Parent review queues.

Required stabilization:

- preserve durable history;
- introduce indexed and bounded current/upcoming/recent projections;
- do not make production UI depend on lifetime `.collect()` queries.

### P1-02 — Financial aggregation

Running Balance currently derives totals by reading all historical Ledger
Entries and Payouts for a Child.

Payout settlement also repeatedly scans cumulative financial and occurrence
history.

Required stabilization:

- preserve the immutable Ledger as authoritative history;
- introduce bounded aggregation/checkpoint state;
- make current balance and settlement computation bounded as history grows;
- remove avoidable N+1 payout-period reads.

### P1-03 — Time-driven reactive state

Some queries calculate advisory state using `Date.now()`.

A Convex subscription does not automatically rerun merely because wall-clock
time crossed a two-hour lock or deadline boundary.

Mutations remain authoritative, but UI projections can become stale.

Required stabilization:

- keep mutation-side server-time validation;
- represent consequential time transitions through durable state/scheduled work,
  or otherwise provide an explicit reactive clock boundary;
- production UI must not advertise an action after its server-authoritative
  eligibility window has closed.

### P1-04 — Global maintenance fan-out

Occurrence and payout maintenance currently iterate all Households inside global
maintenance mutations.

Required stabilization:

- keep existing idempotent Household/occurrence helpers;
- dispatch bounded batches of Households/work;
- ensure each scheduled transaction has predictable read/write limits.

### P1-05 — Evidence retention and orphan cleanup

Private Child photo evidence can remain in Convex Storage after an upload intent
expires or an upload is abandoned.

A crash can also occur after uploading the file but before registering the
Storage ID, creating an orphan object without an application row.

Required stabilization:

- reconcile expired unused evidence intents;
- delete associated unused files;
- periodically reconcile orphan `_storage` objects where safely identifiable;
- document intended evidence retention behavior.

### P1-06 — Unnecessary public backend capabilities

`choreOccurrences.generateForWindow` remains public although automatic
occurrence generation now owns this responsibility.

Required stabilization:

- verify no production client requires the endpoint;
- remove it or convert it to an internal/development-only capability.

### P1-07 — Repeatable automated verification

The repository has strong smoke/Maestro coverage but no single automated
verification entry point or CI gate.

Required stabilization:

- add explicit TypeScript verification command;
- add deterministic backend regression/security test command;
- establish GitHub CI for fast deterministic checks;
- keep Maestro as a separate simulator/mobile regression gate where appropriate.

## P2

### P2-01 — Historical grant queries

Several Child authorization, pairing, and evidence paths load all device grants
for an auth identity and filter revoked grants in memory.

Add access patterns/indexes that make active-grant lookup bounded.

### P2-02 — Revoked SecureStore session cleanup

Inactive saved Child profiles removed after server revocation can leave their
isolated Better Auth SecureStore credentials behind.

Explicitly clear the revoked namespace where possible.

### P2-03 — Convex return validators

Some older public Convex functions omit explicit `returns` validators.

Normalize public and internal APIs to validated contracts.

### P2-04 — Parent authorization duplication

Older modules contain local Parent Household authorization implementations.

Consolidate them behind the authoritative Parent auth helper.

### P2-05 — Local Child PIN verifier

The PIN is local device gating rather than backend authentication, and the
verifier is stored in SecureStore.

A deliberately slow password/PIN derivation mechanism would nevertheless
provide stronger offline resistance than a single salted SHA-256 digest.

### P2-06 — Push observability

Push-token registration intentionally operates best-effort, but all client
registration errors are currently swallowed.

Add privacy-safe diagnostic/observability behavior without making Push
authoritative.

## DEFER — Production UI

Do not spend TASK-22 substantially restructuring temporary presentation code
that TASK-24 will replace.

Defer:

- temporary screen composition;
- visual component decomposition done only for aesthetics;
- final navigation;
- final design system;
- production layouts and styling;
- App Store metadata/assets/distribution configuration.

Foundational frontend infrastructure remains in scope when needed:

- auth/session switching;
- SecureStore lifecycle;
- actor/application boundaries;
- connectivity/server-confirmation semantics;
- stable production-facing backend contracts.

## TASK-22 execution order

1. P0-01 Parent/Child principal separation
2. Adversarial Parent authorization regression coverage
3. P1-01 bounded chore/review operational queries
4. P1-02 financial aggregation
5. P1-03 time-driven reactive architecture
6. P1-05 evidence retention/orphan cleanup
7. P1-04 bounded maintenance fan-out
8. P1-06 public API reduction
9. P1-07 repeatable verification and CI
10. P2-01 active-grant query improvements
11. P2-02 SecureStore revocation cleanup
12. P2-03/P2-04 API validator and authorization consolidation
13. Selected remaining P2 hardening

Each stabilization checkpoint must receive focused regression coverage before
moving to the next one.
