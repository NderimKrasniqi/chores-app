# Direction C implementation coverage

**Status:** Active

This matrix maps every approved Direction C reference to a production screen family and a real application state. References are not implemented as independent routes when they are variants of one server-driven surface.

Status values: `Pending`, `Implementing`, `Implemented`, `Revalidating`, `Verified`.

All Direction C rows were moved to `Revalidating` on 2026-09-21 after the prior
verification evidence was found to cover only 36 fixture-route captures. A row
returns to `Verified` only after the production route is exercised with seeded
development data (or a documented transient-state hook), a fresh simulator
screenshot is captured, and the normalized reference comparison is retained.
The shared action, urgency, and raised-surface palette was subsequently
aligned against fresh Parent Home/Chores captures; rows that were previously
`Verified` are back to `Revalidating` until screenshots confirm the updated
shared styling.

## Shared entry and onboarding

| Approved reference                        | Production family / state                     | Status       |
| ----------------------------------------- | --------------------------------------------- | ------------ |
| `onboarding-approved.png`                 | Shared onboarding / four pages                | Revalidating |
| `parent-auth-create-account-approved.png` | Parent authentication / create account        | Revalidating |
| `parent-household-start-approved.png`     | Household start / create or join              | Revalidating |
| `parent-create-household-approved.png`    | Household start / create form                 | Revalidating |
| `child-profile-chooser-approved.png`      | Child access / saved profiles                 | Revalidating |
| `child-pairing-entry-approved.png`        | Child access / pairing entry                  | Revalidating |
| `child-pairing-scanner-approved.png`      | Child access / QR scanner                     | Revalidating |
| `child-pin-setup-approved.png`            | Child access / PIN setup                      | Revalidating |
| `child-pin-unlock-approved.png`           | Child access / PIN unlock                     | Revalidating |
| `child-access-recovery-approved.png`      | Child access / revoked-grant cleanup recovery | Revalidating |

## Child destinations and focused flows

| Approved reference                               | Production family / state                  | Status       |
| ------------------------------------------------ | ------------------------------------------ | ------------ |
| `child-home-approved.png`                        | Child Home / populated                     | Revalidating |
| `child-extras-gate-approved.png`                 | Child Extras / locked                      | Revalidating |
| `child-extras-pool-approved.png`                 | Child Extras / unlocked pool               | Revalidating |
| `child-activity-approved.png`                    | Child Activity / history                   | Revalidating |
| `child-activity-celebration-approved.png`        | Child Activity / transient celebration     | Revalidating |
| `child-activity-empty-approved.png`              | Child Activity / empty                     | Revalidating |
| `child-money-positive-approved.png`              | Child Money / positive balance             | Revalidating |
| `child-money-zero-approved.png`                  | Child Money / zero balance                 | Revalidating |
| `child-money-negative-approved.png`              | Child Money / negative carry               | Revalidating |
| `child-profile-approved.png`                     | Child Profile / account and device context | Revalidating |
| `child-chore-detail-approved.png`                | Personal Chore detail / available          | Revalidating |
| `child-chore-detail-upcoming-approved.png`       | Personal Chore detail / scheduled          | Revalidating |
| `child-chore-detail-submitted-approved.png`      | Personal Chore detail / submitted          | Revalidating |
| `child-chore-detail-approved-state-approved.png` | Personal Chore detail / approved           | Revalidating |
| `child-chore-detail-missed-approved.png`         | Personal Chore detail / missed             | Revalidating |
| `child-chore-detail-redo-approved.png`           | Personal Chore detail / Redo required      | Revalidating |
| `child-submit-empty-approved.png`                | Submit work / no photo                     | Revalidating |
| `child-submit-photo-approved.png`                | Submit work / photo attached               | Revalidating |
| `child-claim-locked-confirmation-approved.png`   | Claim confirmation / immediate lock        | Revalidating |
| `child-active-claim-approved.png`                | Active Claim / unlocked                    | Revalidating |
| `child-unclaim-confirmation-approved.png`        | Active Claim / unclaim confirmation        | Revalidating |
| `child-claimable-redo-approved.png`              | Active Claim / Redo required               | Revalidating |

## Parent destinations and focused flows

| Approved reference                                          | Production family / state                  | Status       |
| ----------------------------------------------------------- | ------------------------------------------ | ------------ |
| `parent-home-approved.png`                                  | Parent Home / attention dashboard          | Revalidating |
| `parent-chores-approved.png`                                | Parent Chores / definitions                | Revalidating |
| `parent-new-chore-personal-approved.png`                    | Chore editor / create Personal             | Revalidating |
| `parent-new-chore-claimable-approved.png`                   | Chore editor / create Claimable            | Revalidating |
| `parent-edit-chore-approved.png`                            | Chore editor / edit future occurrences     | Revalidating |
| `parent-reviews-queue-approved.png`                         | Parent Reviews / queue                     | Revalidating |
| `parent-review-detail-approved.png`                         | Parent Review / initial submission         | Revalidating |
| `parent-set-redo-deadline-approved.png`                     | Parent Review / set Redo deadline          | Revalidating |
| `parent-money-overview-approved.png`                        | Parent Money / overview                    | Revalidating |
| `parent-payout-detail-approved.png`                         | Payout / pending external payment          | Revalidating |
| `parent-payout-mark-paid-confirmation-approved.png`         | Payout / mark-paid confirmation            | Revalidating |
| `parent-payout-paid-approved.png`                           | Payout / immutable paid state              | Revalidating |
| `parent-payout-recovery-approved.png`                       | Payout / interrupted settlement recovery   | Revalidating |
| `parent-family-approved.png`                                | Parent Family / overview                   | Revalidating |
| `parent-household-settings-approved.png`                    | Household settings / grouped configuration | Revalidating |
| `parent-household-switcher-approved.png`                    | Parent Account / Household switcher        | Revalidating |
| `parent-account-approved.png`                               | Parent Account / identity and controls     | Revalidating |
| `parent-activity-approved.png`                              | Parent Activity / history                  | Revalidating |
| `parent-activity-celebration-approved.png`                  | Parent Activity / transient celebration    | Revalidating |
| `parent-activity-empty-approved.png`                        | Parent Activity / empty                    | Revalidating |
| `parent-active-claim-approved.png`                          | Active Claim / claimed                     | Revalidating |
| `parent-active-claim-submitted-approved.png`                | Active Claim / submitted                   | Revalidating |
| `parent-active-claim-redo-approved.png`                     | Active Claim / Redo required               | Revalidating |
| `parent-active-claim-cancel-confirmation-approved.png`      | Active Claim / cancel confirmation         | Revalidating |
| `parent-active-claim-cancellation-unavailable-approved.png` | Active Claim / cancellation deadline race  | Revalidating |

## Parent Child access

| Approved reference                                            | Production family / state                       | Status       |
| ------------------------------------------------------------- | ----------------------------------------------- | ------------ |
| `parent-child-access-empty-approved.png`                      | Child access / no active code or devices        | Revalidating |
| `parent-child-access-code-approved.png`                       | Child access / active pairing code              | Revalidating |
| `parent-child-access-code-revoke-confirmation-approved.png`   | Child access / code revoke confirmation         | Revalidating |
| `parent-child-access-expired-code-approved.png`               | Child access / expired code                     | Revalidating |
| `parent-child-access-regenerated-code-approved.png`           | Child access / regenerated code success         | Revalidating |
| `parent-child-access-device-approved.png`                     | Child access / active device                    | Revalidating |
| `parent-child-access-device-revoke-confirmation-approved.png` | Child access / device revoke confirmation       | Revalidating |
| `parent-child-access-revoked-device-approved.png`             | Child access / collapsed revoked-device history | Revalidating |

## Parent invitations

| Approved reference                                   | Production family / state                               | Status       |
| ---------------------------------------------------- | ------------------------------------------------------- | ------------ |
| `parent-invitation-empty-approved.png`               | Parent invitation / no active invite                    | Revalidating |
| `parent-invitation-code-approved.png`                | Parent invitation / freshly generated token             | Revalidating |
| `parent-invitation-code-unavailable-approved.png`    | Parent invitation / active token unavailable on revisit | Revalidating |
| `parent-invitation-regenerated-approved.png`         | Parent invitation / regenerated token success           | Revalidating |
| `parent-invitation-revoke-confirmation-approved.png` | Parent invitation / revoke confirmation                 | Revalidating |
| `parent-invitation-revoked-approved.png`             | Parent invitation / server-confirmed revocation         | Revalidating |
| `parent-invitation-accept-empty-approved.png`        | Parent invite acceptance / empty                        | Revalidating |
| `parent-invitation-accept-invalid-approved.png`      | Parent invite acceptance / invalid                      | Revalidating |
| `parent-invitation-accept-revoked-approved.png`      | Parent invite acceptance / revoked                      | Revalidating |
| `parent-invitation-accept-used-approved.png`         | Parent invite acceptance / already used                 | Revalidating |
| `parent-invitation-accept-expired-approved.png`      | Parent invite acceptance / expired                      | Revalidating |

## Completion rule

A row becomes `Implemented` only when the approved hierarchy is represented by production React Native code and the mapped state is derived from existing app behavior. It becomes `Verified` only after a simulator screenshot has been compared with the approved reference and obvious mismatches have been corrected.

### Fresh verification evidence

- `child-profile-chooser-approved.png`: production saved-profile chooser with
  real Alex and Maya local contexts; simulator capture, normalized reference,
  overlay, diff, and metrics retained in
  `verification/direction-c-pixel-parity-2026-09-21/child-profile-chooser/iteration-18/`.
- `child-home-approved.png`: production Alex Home with three live seeded
  occurrences (available Unlock Chore, available Personal Chore, and submitted
  Personal Chore) plus the real 240 kr balance; simulator capture, normalized
  reference, overlay, diff, and metrics retained in
  `verification/direction-c-pixel-parity-2026-09-21/child-home-alex/iteration-10/`.
- `child-extras-gate-approved.png`: production locked Extras destination driven
  by Alex's live, unapproved Unlock Chore; simulator capture, normalized
  reference, overlay, diff, and metrics retained in
  `verification/direction-c-pixel-parity-2026-09-21/child-extras-gate/iteration-07/`.
- `child-extras-pool-approved.png`: production unlocked Extras destination with
  Alex's approved Unlock Chore, one live weekly unclaim, three available real
  Extras, and Maya's live claimed Extra; simulator capture, normalized
  reference, overlay, diff, and metrics retained in
  `verification/direction-c-pixel-parity-2026-09-21/child-extras-pool/iteration-05/`.

- `child-activity-approved.png`: production Alex Activity history from the
  guarded `activity_history` fixture; simulator capture, normalized reference,
  overlay, diff, and metrics retained in
  `verification/direction-c-pixel-parity-2026-09-21/child-activity/iteration-12/`.
  The date-group rail now passes behind row-centered nodes (with the approved
  slight upward anchor), so history and celebration require fresh production-
  route screenshots before returning to `Verified`.
- `child-activity-empty-approved.png`: production Alex Activity empty state
  from the guarded `activity_empty` fixture; simulator capture, normalized
  reference, overlay, diff, and metrics retained in
  `verification/direction-c-pixel-parity-2026-09-21/child-activity-empty/iteration-16/`.
- `child-activity-celebration-approved.png`: production Alex Activity
  celebration via the documented development-only transient hook; simulator
  capture, normalized reference, overlay, diff, and metrics retained in
  `verification/direction-c-pixel-parity-2026-09-21/child-activity-celebration/iteration-07/`.

- `parent-chores-approved.png`: production Chores comparison retained in
  `verification/direction-c-pixel-parity-2026-09-21/parent-chores/production-synthetic-parent-2026-09-23/iteration-04/`
  (MAE 27.219, RMSE 60.684, blurred MAE 23.170, threshold 20.627%). The
  guarded `parent_chores` fixture now matches the reference's three active
  definitions, including the dog-and-plant artwork for `Feed the dog`; the
  shared palette correction also improved the green controls and raised
  surfaces. Visual review still shows artwork/card-density differences, so the
  row remains `Revalidating`.

- `parent-home-approved.png`: populated production Parent Home comparison is
  retained in
  `verification/direction-c-pixel-parity-2026-09-21/parent-home/production-synthetic-parent-2026-09-23/populated-seeded/iteration-07/`
  (MAE 31.297, RMSE 68.553, blurred MAE 27.027, threshold 21.351%). Visual
  review confirms the shared coral/green/surface palette is closer to the
  approved image and the child summary stays on one line. The live greeting
  identity/time and lower activity-card spacing/art still differ; the row stays
  `Revalidating` pending those layout details.

- `parent-reviews-queue-approved.png`: the retained iteration-05 comparison
  lacked the reference's `Photo` chip because the guarded review fixture had no
  evidence attached. The dev fixture now includes the two expected pending
  submissions and the Alex submission references
  `assets/images/direction-c/submission-photo.png`; this was added without
  resetting the existing four approved activity reviews. A readback confirms
  the evidence ID and both pending titles. The seeded asset is illustrative,
  not the bedroom photo shown on the approved Review detail screen, so detail
  image parity remains open. A fresh simulator comparison is still required;
  the queue row remains `Revalidating`.

- `parent-activity-approved.png`: production Parent Activity with the guarded
  `activity_history` fixture and a connected, date-group timeline rail passing
  through row-centered dots;
  simulator capture, normalized reference, overlay, diff, and metrics retained
  in `verification/direction-c-pixel-parity-2026-09-21/parent-activity/production-synthetic-parent-2026-09-23/iteration-18/`
  (MAE 22.486, RMSE 53.958, blurred MAE 17.068, threshold 15.909%). The
  production-route capture now uses the corrected synthetic household name and
  approved fixture times; the cleaned Parent-only table, dishwasher, and laundry
  art removes embedded sparkle rays while preserving child artwork. The timeline
  markers align to the row centers without shifting cards. The row remains
  `Revalidating`: visible type/art details still differ from the reference.
- `parent-activity-celebration-approved.png`: production Parent Activity
  transient capture and approved-reference comparison are retained in
  `verification/direction-c-pixel-parity-2026-09-21/parent-activity-celebration/production-synthetic-parent-2026-09-23/iteration-05/`
  (MAE 25.116, RMSE 57.801, blurred MAE 19.460, threshold 17.878%). The latest
  simulator capture confirms that the approved household name and 08:14 fixture
  time are shown, all four activity cards fit without clipping, and the parent
  celebration copy stays on one line. The parent-only vertical compaction
  improves the comparison; art scale and residual spacing/type differences keep
  this row `Revalidating`.
- `parent-activity-empty-approved.png`: production Parent Activity on the
  guarded `activity_empty` fixture, with the corrected household name; the
  simulator comparison is retained in
  `verification/direction-c-pixel-parity-2026-09-21/parent-activity-empty/production-synthetic-parent-2026-09-23/iteration-07/`
  (MAE 16.510, RMSE 44.991, blurred MAE 12.367, threshold 11.292%). Screenshot
  review confirmed the illustration scale/placement, approved copy, and green
  Add-a-chore button match the reference; this state is `Verified`.
- Activity loading is retained separately in
  `verification/direction-c-pixel-parity-2026-09-21/child-activity-loading/iteration-00/`.
  The guarded development-only route makes the existing production loading
  branch deterministic without changing the Convex query path.

- `child-money-positive-approved.png`: production Alex Money with a seeded
  `240 kr` balance, open `12–18 Sep` payout week, and pending `70 kr` payout;
  simulator capture, normalized reference, overlay, diff, and metrics retained
  in `verification/direction-c-pixel-parity-2026-09-21/child-money-positive/iteration-06/`.
- `child-money-zero-approved.png`: production Alex Money with a seeded `0 kr`
  balance and no-payout result; simulator capture, normalized reference,
  overlay, diff, and metrics retained in
  `verification/direction-c-pixel-parity-2026-09-21/child-money-zero/iteration-04/`.
- `child-money-negative-approved.png`: production Alex Money with a seeded
  `-40 kr` carry-forward result; simulator capture, normalized reference,
  overlay, diff, and metrics retained in
  `verification/direction-c-pixel-parity-2026-09-21/child-money-negative/iteration-09/`.
- `child-profile-approved.png`: production child profile with real Alex and
  Maya contexts; simulator capture, normalized reference, overlay, diff, and
  metrics retained in
  `verification/direction-c-pixel-parity-2026-09-21/child-profile/iteration-03/`
  (MAE 27.680, RMSE 62.694, blurred MAE 24.396, threshold 18.608%).
- `child-chore-detail-approved.png`: available Personal Chore detail on the
  production route; comparison retained in
  `verification/direction-c-pixel-parity-2026-09-21/child-chore-detail-approved/iteration-05/`
  (MAE 26.923, RMSE 58.423, blurred MAE 23.026, threshold 18.843%).
- `child-chore-detail-upcoming-approved.png`: scheduled Personal Chore detail
  with a seeded tomorrow start; comparison retained in
  `verification/direction-c-pixel-parity-2026-09-21/child-chore-detail-upcoming/iteration-14/`
  (MAE 30.195, RMSE 63.152, blurred MAE 26.049, threshold 22.254%).
- `child-chore-detail-submitted-approved.png`: submitted Personal Chore detail
  on the production route; comparison retained in
  `verification/direction-c-pixel-parity-2026-09-21/child-chore-detail-submitted/iteration-03/`
  (MAE 27.777, RMSE 60.500, blurred MAE 23.914, threshold 19.978%).
- `child-chore-detail-approved-state-approved.png`: approved Unlock Chore
  detail with reward and Extras open; comparison retained in
  `verification/direction-c-pixel-parity-2026-09-21/child-chore-detail-approved-state/iteration-10/`
  (MAE 27.152, RMSE 59.750, blurred MAE 23.246, threshold 20.008%).
- `child-chore-detail-missed-approved.png`: missed Unlock Chore detail with
  zero reward and locked Extras; the post-inset comparison is retained in
  `verification/direction-c-pixel-parity-2026-09-21/child-chore-detail-missed/iteration-06/`
  (MAE 29.021, RMSE 61.250, blurred MAE 24.809, threshold 21.269%).
- `child-chore-detail-redo-approved.png`: Personal Chore redo-required detail
  with the corrected note placement; comparison retained in
  `verification/direction-c-pixel-parity-2026-09-21/child-chore-detail-redo/iteration-15/`
  (MAE 31.631, RMSE 64.663, blurred MAE 27.640, threshold 22.469%).
- `parent-new-chore-personal-approved.png`: production Personal chore editor
  with seeded real household members and schedule values; comparison retained
  in `verification/direction-c-pixel-parity-2026-09-21/parent-new-chore-personal/iteration-09/`
  (MAE 21.665, RMSE 52.169, blurred MAE 18.553, threshold 14.186%).
- `parent-new-chore-claimable-approved.png`: production Claimable chore editor
  with the seeded all-children eligibility state; comparison retained in
  `verification/direction-c-pixel-parity-2026-09-21/parent-new-chore-claimable/iteration-06/`
  (MAE 20.397, RMSE 51.616, blurred MAE 17.587, threshold 12.851%).
- `parent-edit-chore-approved.png`: production edit-chore state with the seeded
  notice and future schedule; comparison retained in
  `verification/direction-c-pixel-parity-2026-09-21/parent-edit-chore/iteration-09/`
  (MAE 20.126, RMSE 48.884, blurred MAE 15.543, threshold 13.617%).
- `parent-family-approved.png`: current production Family capture is retained
  in `verification/direction-c-pixel-parity-2026-09-21/parent-family/iteration-07/`
  (MAE 25.804, RMSE 59.300, blurred MAE 21.780, threshold 18.309%). Visual
  review found the target's active Alex device is absent in the current dev
  household (and its live parent label is `Visual Parent` rather than `Sam`);
  this is fixture/data drift, not yet a layout verification. The row remains
  `Revalidating`.
- `parent-household-settings-approved.png`: production household settings with
  the seeded Stockholm timezone, Friday payout day, and two weekly unclaims;
  comparison retained in
  `verification/direction-c-pixel-parity-2026-09-21/parent-household-settings/iteration-08/`
  (MAE 17.968, RMSE 48.730, blurred MAE 13.775, threshold 12.845%). The
  seeded values match; screenshot review shows the help callout and lower
  authority row still sit slightly below the approved layout. The row remains
  `Revalidating` after the shared palette update.
- `parent-household-switcher-approved.png`: production household switcher with
  seeded household cards, Friday/Sunday payout data, current-household state,
  and the multi-household notice; comparison retained in
  `verification/direction-c-pixel-parity-2026-09-21/parent-household-switcher/iteration-13/`
  (MAE 24.492, RMSE 57.115, blurred MAE 19.679, threshold 17.365%).
- `parent-account-approved.png`: production Parent Account screenshot after
  the simulator restart, compared in
  `verification/direction-c-pixel-parity-2026-09-21/parent-account/iteration-09/`
  (MAE 23.08, RMSE 57.693, blurred MAE 20.2, threshold 15.664%). The live
  test identity is `Visual Parent` with a longer email and one household, so
  the profile card wraps and the conditional Switch household action is
  correctly absent; the approved reference uses Sam and multiple memberships.
  The screen remains `Revalidating` until compared with reference-compatible
  account data. No product behavior was changed to force the action on.
- `parent-active-claim-approved.png`: production claimed Extra detail with
  seeded Walk the dog claim, Alex claimant, neutral deadline treatment, active
  commitment notice, and cancel action; comparison retained in
  `verification/direction-c-pixel-parity-2026-09-21/parent-active-claim/iteration-07/`
  (MAE 19.928, RMSE 53.117, blurred MAE 16.706, threshold 13.395%).
- `parent-active-claim-submitted-approved.png`: production submitted claim
  state with the waiting-for-review status chip; comparison retained in
  `verification/direction-c-pixel-parity-2026-09-21/parent-active-claim-submitted/iteration-01/`
  (MAE 20.081, RMSE 53.005, blurred MAE 16.915, threshold 13.45%).
- `parent-active-claim-redo-approved.png`: production redo-required claim with
  the red redo deadline icon and seeded tomorrow deadline; comparison retained
  in `verification/direction-c-pixel-parity-2026-09-21/parent-active-claim-redo/iteration-02/`
  (MAE 20.299, RMSE 52.922, blurred MAE 17.201, threshold 13.41%).
- `parent-active-claim-cancel-confirmation-approved.png`: production cancel
  confirmation sheet with preserved no-penalty copy and keep/cancel actions;
  comparison retained in
  `verification/direction-c-pixel-parity-2026-09-21/parent-active-claim-cancel-confirmation/iteration-01/`
  (MAE 22.158, RMSE 48.743, blurred MAE 19.729, threshold 16.747%).
- `parent-active-claim-cancellation-unavailable-approved.png`: production
  deadline-race state with the red unavailable notice; comparison retained in
  `verification/direction-c-pixel-parity-2026-09-21/parent-active-claim-cancellation-unavailable/iteration-01/`
  (MAE 18.911, RMSE 50.019, blurred MAE 15.97, threshold 12.528%).
- `parent-child-access-expired-code-approved.png`: seeded expired pairing code,
  frozen expiry time, production access layout, and corrected illustration;
  simulator screenshot and reference comparison retained in
  `verification/direction-c-pixel-parity-2026-09-21/parent-child-access-expired-code/iteration-01/`
  (MAE 16.485, RMSE 43.409, blurred MAE 13.576, threshold 11.743%).

### 2026-09-23 UI/UX pass

- Compared the approved Parent Home, Chores, Reviews, Money, Family, Child Home,
  Extras, and Child Money compositions with their retained side-by-side captures.
  The current production account has no seeded chores or payouts, so populated
  reference states cannot be reverified against its live data.
- Tightened the Parent Money period, payout, and balance layout and confirmed the
  updated period artwork and spacing on a fresh Expo bundle in the iPhone 17
  simulator. The capture shows the live empty-payout state, not the approved
  populated payout example; `parent-money-overview-approved.png` stays
  `Revalidating`.
- Tightened Parent Reviews queue card height, artwork, type, and spacing against
  the approved queue image. The live account has no pending submissions, so
  `parent-reviews-queue-approved.png` stays `Revalidating` until a populated
  production-route capture is available.
- Parent Home child cards now open Money; Parent Money balance rows no longer
  show chevrons without a destination. Parent tabs reset their scroll position
  when the destination changes. A simulator tap from a Home child card reached
  Money on the fresh bundle.

### 2026-09-23 seeded production-route follow-up

- Seeded the guarded `Visual Parent` personal dev household with `parent_home`,
  `parent_chores`, `reviews_queue`, and `money_overview` scenarios. Production
  route captures and normalized comparisons are retained under
  `verification/direction-c-pixel-parity-2026-09-21/<screen>/production-synthetic-parent-2026-09-23/`.
  This supersedes the earlier note that populated live states were unavailable.
- Compared populated Parent Home, Chores, Reviews queue and detail, Money
  overview and payout detail, the payout confirmation, chore create/edit,
  Family, household settings, Child access empty/code/revoke, and the Redo
  deadline against their approved reference compositions. Corrected card
  hierarchy, artwork selection, type and spacing, footer positioning, and
  modal action visibility. The Review queue comparison reached MAE 22.765;
  household settings reached 17.809; Child access revoke confirmation improved
  from 33.12 to 24.108 after its action became fully visible.
- The live fixture identity is `Visual Parent`, while some references use Sam,
  and the current Family fixture lacks Alex's paired device. Those are data
  mismatches in the comparisons. Review detail also lacks the reference photo:
  automatic approval review rejected uploading a crop of the approved design
  image to dev Convex storage without explicit authorization. No upload was
  performed. Its geometry and action visibility were checked, but photo parity
  remains unverified.
- Confirmation sheets were checked individually. The active-claim sheet's
  existing bottom inset matched its reference better, so the trial extra
  padding was removed. Other unverified extra sheet padding was also removed.
  No row is promoted to `Verified` solely from a pixel metric; the matrix
  remains `Revalidating` for remaining data and transient-state differences.
- Captured and compared 13 additional local reference states: household start,
  Child access recovery, Child device revoke confirmation, five Parent invite
  states, and five invite acceptance states. Their `iteration-01` comparison
  folders are under the same verification root. An initial batch accidentally
  caught Expo Go's loading view; every screenshot was recaptured after loading
  and those comparison files were overwritten with actual screen content.
  These fixture comparisons identify remaining typography, artwork, and
  vertical-spacing differences, especially on invite acceptance and recovery;
  they do not satisfy the production-route verification gate above.
- The Parent invitation revoke sheet improved from MAE 37.433 to 27.268 after
  removing duplicated bottom padding and reducing its compact authority notice
  and header type. The Child access recovery view now restores the reference's
  circular artwork backdrop; its comparison improved from 42.97 to 41.588.
  Both remain `Revalidating` because their artwork/typography still differ.
- `child_home` is currently seeded in the guarded dev household, and a
  15-minute Alex pairing credential was created. The simulator remains signed
  into the Parent session, so the Child pairing, PIN, claim, and submission
  production routes were not reached in this pass. Paid and interrupted payout
  states also still require their distinct server outcomes. These states remain
  `Revalidating`; alias comparisons for Child Home and chore detail are already
  recorded earlier in this document.

### 2026-09-23 remaining-state comparison follow-up

- Every one of the 76 approved reference **files** now has a named simulator
  comparison folder. This is a comparison inventory, not a claim that every
  state is production-route verified or pixel matched. The onboarding reference
  is a four-page collage; each panel was cropped and compared separately to its
  single-screen simulator view. The invalid whole-collage comparison was removed.
- Added development-only visual states for onboarding welcome, Child pairing
  entry and scanner, PIN setup/unlock, populated Child Home, personal Chore
  detail, active claim and its confirmation/redo variants, and submission with
  and without a photo. These render production components with local fixture
  props and retain normalized comparisons in the matching reference folders.
  They do not replace production-route checks with authenticated Child data.
- Child active-claim and submission headers were corrected to clear the iOS
  status bar. The claim action now reads “Submit for review.” The photo preview
  and submission spacing were reduced so the approval guidance is fully visible
  above the fixed action; the latest photo comparison improved from MAE 59.578
  to 46.572. The development photo is bundled illustration geometry, not the
  approved room photograph, so photo parity remains open.
- The synthetic Alex 70 kr payout was marked paid through the real Parent Money
  route in the guarded personal development household. The settled detail was
  captured and compared (MAE 19.581). This changed only the development payout
  record; it did not transfer money. The interrupted settlement view was
  rendered through a development-only transient-state route, and its clipped
  status control was fixed. Its final comparison is MAE 27.316, with both the
  recovery message and checking control visible. The actual network-interruption
  transition has not been reproduced on the production route.
- All rows remain `Revalidating` because several reference data/asset states
  differ from the current dev account, all four onboarding panels still have
  noticeable illustration/layout differences, and local visual fixtures do not meet the production-route
  verification rule. The approved photo crop was not uploaded after automatic
  approval review rejected that cloud upload without explicit authorization.
- Onboarding now supports development-only entry to each page. All four were
  captured after tightening heading sizes and card placement and adding lower
  artwork to the role chooser. Their latest panel MAEs are 57.870 (welcome),
  47.711 (how it works), 54.262 (rewards), and 44.901 (role); the existing
  bundled illustrations differ visibly from the approved compositions.

### 2026-09-24 shared invite and scanner follow-up

- Rechecked all five Parent invite acceptance outcomes in the simulator after
  aligning the shared form's notice, input, error card, and secondary action.
  Blank validation text no longer reserves a hidden line below the input.
  Fresh local visual comparison MAEs are 41.194 (empty), 37.514 (invalid),
  38.297 (revoked), 38.223 (used), and 37.838 (expired). These improve on the
  previous 49.020, 44.070, 45.030, 44.950, and 44.530 respectively. The
  remaining illustration and color differences are visible; these fixture
  captures do not establish server error behavior.
- The simulator camera fallback now shows a light QR screen inside the preview
  phone, closer to the approved scanner composition. The fresh comparison is
  MAE 51.707 (previously 53.354). Physical devices continue to show the live
  camera feed; that path still needs an on-device check.
