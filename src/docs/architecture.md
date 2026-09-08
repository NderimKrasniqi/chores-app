# Architecture

## Technology Stack

- **Client:** React Native with Expo
- **Language:** TypeScript
- **Navigation:** Expo Router
- **Styling:** NativeWind using Tailwind CSS utilities
- **Backend:** Convex
- **Persistence:** Convex database
- **Realtime:** Convex reactive queries
- **Server logic:** Convex queries, mutations, actions, and internal functions
- **Scheduling:** Convex scheduled functions for exact future transitions plus cron reconciliation/safety-net jobs
- **Photo storage:** Convex file storage; clients store only storage IDs and view evidence through a household-authorized Convex HTTP action rather than public bearer URLs
- **Authentication:** Better Auth integrated with Convex via `@convex-dev/better-auth` and `@better-auth/expo`
- **Secure device storage:** `expo-secure-store` for Better Auth session material and sensitive device-local child access data; never AsyncStorage/plaintext storage
- **Push notifications:** Expo Notifications + Expo Push Service; Convex actions send pushes and inspect delivery receipts
- **Timezone/runtime dates:** IANA Household Timezone; local schedule calculation with `date-fns` + `@date-fns/tz`, persisted as absolute instants on occurrences/periods
- **Payments:** Manual Swish settlement; no Swish API dependency in the first release

## System Architecture

### Client application

The Expo application owns presentation, navigation, local interaction state, camera/image selection, `expo-secure-store`-backed secure device storage, and push-notification registration. It is never authoritative for household permissions, chore eligibility, deadlines, claim ownership, approvals, balances, penalties, or payouts.

### Convex backend

Convex is the authoritative application backend. Mutations enforce household authorization and all state transitions. Reactive queries distribute household state changes to connected clients. Scheduled functions drive exact recurrence/deadline/lock/payout transitions, while reconciliation cron jobs repair missed scheduling metadata without duplicating domain effects. Convex actions deliver best-effort push notifications after authoritative state transitions.

### Authoritative state

- **Identity:** Better Auth is the authentication/session authority. Convex accepts only Better Auth identities validated through the Convex + Better Auth integration.
- **Authorization:** Convex, based on authenticated actor plus household membership/role.
- **Time:** Convex server time plus the Household's persisted IANA timezone. Local recurrence/payout rules are resolved server-side into absolute instants; clients and push delivery are never authoritative for deadline compliance.
- **Money:** immutable Convex ledger entries; running balances are derived, not directly edited.
- **Claim ownership:** Convex transaction/mutation result; the client cannot reserve a chore optimistically as authoritative state.
- **Review outcome:** first valid Convex review mutation wins; later conflicting review attempts are rejected.
- **External payment outcome:** parent confirmation is authoritative inside the app for first-release Swish settlement; Swish itself is outside the integration boundary.

### Major modules

- Household and membership
- Child profiles and access
- Chore definitions and recurring occurrence generation
- Claiming and unclaim allowance
- Submission, photo evidence, review, and single-redo lifecycle
- Ledger, payout weeks, and settlement
- Activity feed and household celebrations
- Push-notification orchestration

### Dependency direction

Expo UI -> typed client/domain adapters -> Convex public functions -> domain transition helpers -> persistence/scheduling/integration adapters.

External services never bypass Convex domain authorization or mutate client state directly.

### Cross-cutting constraints

- Household data is isolated by household membership on every server-owned read/write path.
- QR join secrets use cryptographically secure randomness. The QR token carries at least 128 bits of entropy; manual fallback codes are separately generated human-friendly codes protected by short expiry and attempt/rate limits. Only hashes are persisted. Credentials expire after 15 minutes, are single-use, revocable, invalidated on successful redemption, and never logged in plaintext.
- Better Auth session/token material on native devices is persisted only through `expo-secure-store`; it must not be written to AsyncStorage, SQLite, logs, or other plaintext/general-purpose local persistence.
- A child PIN is only a local profile lock. The raw PIN is never persisted; only the minimum verifier/derived secret needed for local verification may be kept in `expo-secure-store`, and revocation/sign-out clears the associated secure entries.
- Child total balances/history remain private from siblings; household activity events may expose approved chore names and values as specified.
- Photo evidence is private household data. Upload URLs are issued only after authorization; stored file IDs are not public URLs; reads go through an authenticated Convex HTTP action that re-checks household access before returning bytes. Raw `storage.getUrl()` bearer URLs are not used for evidence viewing.
- Deadline and payout calculations use server-owned absolute timestamps derived from the Household's IANA timezone; device timezone changes never move existing deadlines.
- Push notifications are advisory. Failure or delay of push delivery cannot delay, advance, or reverse a domain transition.
- Scheduled transition handlers are idempotent: retries/reconciliation cannot duplicate occurrences, penalties, ledger entries, or payout closures.
- Structured server logs/metrics cover failed auth/join redemption, claim conflicts, scheduled-transition failures/retries, photo-serving authorization failures, push-send/receipt failures, and payout mutations; secrets, PINs, join codes, and photo contents are never logged.
- Financial history, review outcomes, and settled payouts are immutable; corrections require additive state rather than destructive rewrites.
- Network/offline UI may display cached last-synced data, but claim, unclaim, submit, approve/reject, and payout-settlement actions require server confirmation. Locally queued actions are never backdated across a deadline or lock boundary.
- Optional photo upload failure is recoverable: retry upload or submit without photo. Photo transport failure cannot itself create a missed-chore outcome.

## Architecture Decisions

### ADR-01 — Expo/React Native client with NativeWind

**Decision:** Build the iOS/Android client with React Native + Expo, TypeScript, Expo Router, and NativeWind/Tailwind CSS.

**Why:** The product needs one mobile codebase with strong support for photos, push notifications, deep links/invites, and conventional household UI while retaining a TypeScript end-to-end development model.

**Consequences:** Native capability work follows Expo-compatible packages/builds. Styling uses Tailwind-style utilities through NativeWind rather than browser CSS semantics.

**Rejected alternatives:** Flutter; plain React Native styling without NativeWind.

### ADR-02 — Convex as authoritative backend

**Decision:** Use Convex for application data, server functions, realtime subscriptions, scheduling, and initial photo storage.

**Why:** The product has concurrency-sensitive exclusive claims, realtime household state, recurring occurrences, exact deadline transitions, review workflows, and immutable monetary history. Convex keeps these server-owned within a TypeScript backend and provides transactional mutations, reactive queries, and durable scheduling primitives.

**Consequences:** Domain invariants are enforced in Convex mutations/internal helpers. Clients subscribe reactively but never become authoritative. Scheduled work must be idempotent because retries or duplicate scheduling must not duplicate penalties, ledger entries, or occurrences.

**Rejected alternatives:** Supabase/Postgres, which remains viable but would require more explicit SQL/RLS/realtime/scheduling composition for this release.

### ADR-03 — Better Auth for authentication and device sessions

**Decision:** Use Better Auth as the authentication/session framework, integrated directly with Convex through `@convex-dev/better-auth` and with Expo through `@better-auth/expo`. Convex remains authoritative for household membership, parent/child role, and all product authorization.

**Parent access:** Parents use normal Better Auth accounts. Initial sign-in methods can include email/password and selected social providers; provider selection is an implementation/configuration detail unless it changes onboarding requirements.

**Child access:** Children do not require email accounts. A parent creates the child profile in Convex. When a child device joins, the app establishes a Better Auth anonymous authenticated session on that device, then redeems a short-lived household-issued QR/manual join credential to bind that authenticated device identity to the intended Child profile. Multiple authorized device identities may point to the same Child profile.

**Join credential security:** QR/manual join credentials are application-level Convex credentials, not long-lived authentication secrets. They are single-use, short-lived, hashed at rest, rate-limited for manual entry, revocable by a parent, and invalidated on successful redemption. Redemption requires an authenticated Better Auth session and creates a Convex child-device access grant.

**Local child PIN:** A child PIN is only a local shared-device/profile lock. It is not a backend authentication factor and is never sufficient to authorize a Convex operation. Better Auth session/token material is persisted with `expo-secure-store`. The raw child PIN is never stored; only a verifier/derived local secret may be stored in SecureStore. AsyncStorage or other plaintext/general-purpose persistence is prohibited for session material, raw PINs, or equivalent child-access secrets.

**Shared devices:** The app may maintain multiple authorized local child access contexts on one device. Selecting a child profile and passing that profile's local PIN selects the associated Better Auth/device access context. Server authorization still resolves the authenticated Better Auth identity to an active Convex access grant before returning or mutating household data.

**Revocation:** Parents can revoke a child device access grant. Revocation takes effect server-side even if the device still holds local Better Auth session material. Lost-device recovery therefore does not require changing the Child profile itself.

**Why:** Better Auth provides a TypeScript-owned authentication layer with first-party Expo support, secure native session storage integration, an anonymous-session plugin suitable for email-less child device identities, and a maintained Convex integration. Keeping household authorization in Convex avoids coupling product roles to authentication-provider roles.

**Consequences:** Auth setup must follow the pinned compatible versions documented by the Convex + Better Auth component and must install/configure `expo-secure-store` for native session persistence. Client UI must use Convex-authenticated state before issuing protected Convex calls. Child QR redemption is custom product logic in Convex rather than an assumption that Better Auth's one-time-token plugin can mint an unrelated child's session. Sign-out and device-access revocation must clear the relevant SecureStore material on that device when the client next processes the revocation.

**Rejected alternatives:** Clerk; Convex Auth; modeling child access as email/password accounts.

### ADR-04 — Server-authoritative household time and best-effort Expo push

**Decision:** Store one IANA Household Timezone, resolve local recurrence/payout rules into immutable absolute instants on future occurrences/periods, execute exact domain transitions with Convex scheduled functions, use reconciliation cron jobs as a safety net, and deliver user notifications through Expo Notifications / Expo Push Service only after authoritative state changes.

**Why:** The product has recurrence, a hard two-hour commitment boundary, deadline penalties, payout cadence, travel/device-timezone changes, and push reminders. Correctness must not depend on a phone clock or best-effort push delivery, and DST/local-calendar intent must remain stable.

**Consequences:** Chore definitions retain local scheduling intent plus the Household Timezone context; concrete occurrences store resolved absolute instants. Changing household timezone affects future generation only. Push send/receipt handling is retryable and token-invalidating but cannot duplicate or control domain outcomes.

**Rejected alternatives:** Client-authoritative timers/local notifications for state transitions; storing UTC-only recurrence rules without household timezone intent; treating push delivery as proof of reminder/deadline state.

### ADR-05 — Server-confirmed consequential actions; read-only offline fallback

**Decision:** Allow cached/last-synced reading while offline, but require live server confirmation for claim, unclaim, submission, review, and payout-settlement actions. Do not backdate queued actions when connectivity returns. Treat optional photo upload as a separable best-effort step so a Child can retry or submit without photo.

**Why:** The product has hard deadlines, a two-hour commitment boundary, exclusive claims, parent-review concurrency, and monetary effects. Accepting delayed offline writes would make device clocks and replay order capable of changing authoritative outcomes.

**Consequences:** The client must show pending/checking/failure states rather than optimistic finality for consequential actions. Connectivity errors remain retryable while the relevant server-side time window is still open. Optional evidence upload cannot block a valid text-only submission.

**Rejected alternatives:** Offline-first queued writes with client timestamps; optimistic authoritative claims/reviews; making photo upload mandatory for submission.

### ADR-06 — Private photo evidence through authorized file serving

**Decision:** Keep photo evidence in Convex File Storage, persist storage IDs with the submission, issue uploads only through authorized server functions, and serve evidence through an authenticated Convex HTTP action that checks household access before returning file bytes. Do not expose `storage.getUrl()` links for private evidence.

**Why:** Convex-generated file URLs are bearer URLs: once disclosed, app-level authorization cannot revoke access without deleting the file. Chore photos are private household data whose viewer access can change when membership/device grants are revoked.

**Consequences:** Photo viewing adds an authorized HTTP hop and evidence should be client-resized/compressed for mobile viewing. File deletion follows submission/household data-lifecycle operations rather than URL revocation.

**Rejected alternatives:** Direct Convex bearer URLs; adding Cloudflare R2 solely for expiring photo URLs in the first release.

## Technical Investigations

- **Completed:** Current Convex + Better Auth documentation confirms Expo integration through `@convex-dev/better-auth`, a component-compatible pinned Better Auth version, SecureStore-backed Expo sessions, and support for Better Auth's Anonymous plugin. Implementation must use the then-current compatible versions rather than assuming package `latest` compatibility.
- **Completed:** Convex File Storage security model confirms generated file URLs are reusable bearer URLs; private evidence therefore uses authorized HTTP serving (ADR-06).
- **Implementation-time verification:** Expo push credentials, receipt polling, transient retry/backoff behavior, and invalid-token cleanup in production builds.
- **Implementation-time verification:** DST transition tests and payout/recurrence boundary calculations in representative IANA zones including `Europe/Stockholm`.
- **Pre-release verification:** Swedish/EU privacy review for parent-managed child profiles, photo evidence, notification data, retention/deletion, and required store/privacy disclosures. This may change policy/copy/retention details but does not change the current authority boundaries.

## Unresolved Technical Unknowns

- Final production Parent/Child UI/UX, navigation composition, design system, and presentation-component boundaries are intentionally unresolved. Existing client screens and development fixtures prove approved behavior but are not the final presentation architecture.
- Final shared-device/profile-switch interaction details are UI implementation work; the server-side identity, access-grant, revocation, and sibling-privacy boundaries are already fixed and sufficient for implementation planning.
- Final parent sign-in provider mix (email/password, Apple, Google) is configuration work unless a future product decision makes one mandatory.


## Evidence retention

Private Submission evidence uses bounded retention maintenance for abandoned
uploads, expired view tokens, and conservatively identifiable Storage orphans.

See `evidence-retention.md` for the retention and orphan-cleanup contract.
