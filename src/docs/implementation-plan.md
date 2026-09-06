# Implementation Plan
**Status:** Approved — current

## Phase 1 — Establish trusted household access
- [ ] TASK-01 Bootstrap the Expo, NativeWind, and Convex application with an unprotected connectivity seam
- [ ] TASK-02 Implement Better Auth parent sign-in with `expo-secure-store` session persistence and protected Convex actor resolution
- [ ] TASK-03 Implement household creation, child profiles, timezone, payout-day, and default unclaim settings
- [ ] TASK-04 Implement second-parent invite acceptance, revocation/regeneration, and equal household authority
- [ ] TASK-05 Implement child QR/manual-code pairing, device revocation, and `expo-secure-store`-protected PIN-gated shared-device access

## Phase 2 — Establish chore configuration and scheduling
- [ ] TASK-06 Implement parent chore definitions with recurrence, values, eligibility, availability, and unlock designation
- [ ] TASK-07 Generate timezone-stable chore occurrences with immutable schedule snapshots and unclaimed expiry

## Phase 3 — Prove the responsibility-to-commitment loop
- [ ] TASK-08 Deliver personal-chore viewing, on-time submission, parent approval, earnings, and no-penalty misses
- [ ] TASK-09 Gate the claimable-chore pool on approval of the current unlock-chore occurrence
- [ ] TASK-10 Implement atomic exclusive claiming, eligibility checks, one-active-claim enforcement, and claimed-by visibility
- [ ] TASK-11 Implement weekly unclaim accounting, the two-hour commitment lock, locked-claim warning, and parent cancellation
- [ ] TASK-12 Deliver claimed-chore submission, parent review, approved earnings, and active-claim release
- [ ] TASK-13 Implement the single-redo review lifecycle and first-successful concurrent parent review behavior
- [ ] TASK-14 Apply missed locked-claim and failed-redo penalties with negative running-balance carry-forward

## Phase 4 — Complete settlement, evidence, and household engagement
- [ ] TASK-15 Implement payout periods, manual Swish settlement tracking, pending outcomes, and weekly resets
- [ ] TASK-16 Add optional private photo evidence with authorized upload/view and recoverable upload failure
- [ ] TASK-17 Add household approval celebrations and activity history with sibling financial privacy
- [ ] TASK-18 Add Expo push registration and notifications for chore, review, redo, deadline, and pre-lock events

## Phase 5 — Harden and close the first release
- [ ] TASK-19 Enforce read-only offline fallback and server-confirmed recovery states across consequential actions
- [ ] TASK-20 Verify the integrated first-release surface across all approved household, chore, review, financial, and notification journeys
