# Direction C implementation coverage

**Status:** Active

This matrix maps every approved Direction C reference to a production screen family and a real application state. References are not implemented as independent routes when they are variants of one server-driven surface.

Status values: `Pending`, `Implementing`, `Implemented`, `Verified`.

## Shared entry and onboarding

| Approved reference                        | Production family / state                     | Status   |
| ----------------------------------------- | --------------------------------------------- | -------- |
| `onboarding-approved.png`                 | Shared onboarding / four pages                | Verified |
| `parent-auth-create-account-approved.png` | Parent authentication / create account        | Verified |
| `parent-household-start-approved.png`     | Household start / create or join              | Verified |
| `parent-create-household-approved.png`    | Household start / create form                 | Verified |
| `child-profile-chooser-approved.png`      | Child access / saved profiles                 | Verified |
| `child-pairing-entry-approved.png`        | Child access / pairing entry                  | Verified |
| `child-pairing-scanner-approved.png`      | Child access / QR scanner                     | Verified |
| `child-pin-setup-approved.png`            | Child access / PIN setup                      | Verified |
| `child-pin-unlock-approved.png`           | Child access / PIN unlock                     | Verified |
| `child-access-recovery-approved.png`      | Child access / revoked-grant cleanup recovery | Verified |

## Child destinations and focused flows

| Approved reference                               | Production family / state                  | Status   |
| ------------------------------------------------ | ------------------------------------------ | -------- |
| `child-home-approved.png`                        | Child Home / populated                     | Verified |
| `child-extras-gate-approved.png`                 | Child Extras / locked                      | Verified |
| `child-extras-pool-approved.png`                 | Child Extras / unlocked pool               | Verified |
| `child-activity-approved.png`                    | Child Activity / history                   | Verified |
| `child-activity-celebration-approved.png`        | Child Activity / transient celebration     | Verified |
| `child-activity-empty-approved.png`              | Child Activity / empty                     | Verified |
| `child-money-positive-approved.png`              | Child Money / positive balance             | Verified |
| `child-money-zero-approved.png`                  | Child Money / zero balance                 | Verified |
| `child-money-negative-approved.png`              | Child Money / negative carry               | Verified |
| `child-profile-approved.png`                     | Child Profile / account and device context | Verified |
| `child-chore-detail-approved.png`                | Personal Chore detail / available          | Verified |
| `child-chore-detail-upcoming-approved.png`       | Personal Chore detail / scheduled          | Verified |
| `child-chore-detail-submitted-approved.png`      | Personal Chore detail / submitted          | Verified |
| `child-chore-detail-approved-state-approved.png` | Personal Chore detail / approved           | Verified |
| `child-chore-detail-missed-approved.png`         | Personal Chore detail / missed             | Verified |
| `child-chore-detail-redo-approved.png`           | Personal Chore detail / Redo required      | Verified |
| `child-submit-empty-approved.png`                | Submit work / no photo                     | Verified |
| `child-submit-photo-approved.png`                | Submit work / photo attached               | Verified |
| `child-claim-locked-confirmation-approved.png`   | Claim confirmation / immediate lock        | Verified |
| `child-active-claim-approved.png`                | Active Claim / unlocked                    | Verified |
| `child-unclaim-confirmation-approved.png`        | Active Claim / unclaim confirmation        | Verified |
| `child-claimable-redo-approved.png`              | Active Claim / Redo required               | Verified |

## Parent destinations and focused flows

| Approved reference                                          | Production family / state                  | Status   |
| ----------------------------------------------------------- | ------------------------------------------ | -------- |
| `parent-home-approved.png`                                  | Parent Home / attention dashboard          | Verified |
| `parent-chores-approved.png`                                | Parent Chores / definitions                | Verified |
| `parent-new-chore-personal-approved.png`                    | Chore editor / create Personal             | Verified |
| `parent-new-chore-claimable-approved.png`                   | Chore editor / create Claimable            | Verified |
| `parent-edit-chore-approved.png`                            | Chore editor / edit future occurrences     | Verified |
| `parent-reviews-queue-approved.png`                         | Parent Reviews / queue                     | Verified |
| `parent-review-detail-approved.png`                         | Parent Review / initial submission         | Verified |
| `parent-set-redo-deadline-approved.png`                     | Parent Review / set Redo deadline          | Verified |
| `parent-money-overview-approved.png`                        | Parent Money / overview                    | Verified |
| `parent-payout-detail-approved.png`                         | Payout / pending external payment          | Verified |
| `parent-payout-mark-paid-confirmation-approved.png`         | Payout / mark-paid confirmation            | Verified |
| `parent-payout-paid-approved.png`                           | Payout / immutable paid state              | Verified |
| `parent-payout-recovery-approved.png`                       | Payout / interrupted settlement recovery   | Verified |
| `parent-family-approved.png`                                | Parent Family / overview                   | Verified |
| `parent-household-settings-approved.png`                    | Household settings / grouped configuration | Verified |
| `parent-household-switcher-approved.png`                    | Parent Account / Household switcher        | Verified |
| `parent-account-approved.png`                               | Parent Account / identity and controls     | Verified |
| `parent-activity-approved.png`                              | Parent Activity / history                  | Verified |
| `parent-activity-celebration-approved.png`                  | Parent Activity / transient celebration    | Verified |
| `parent-activity-empty-approved.png`                        | Parent Activity / empty                    | Verified |
| `parent-active-claim-approved.png`                          | Active Claim / claimed                     | Verified |
| `parent-active-claim-submitted-approved.png`                | Active Claim / submitted                   | Verified |
| `parent-active-claim-redo-approved.png`                     | Active Claim / Redo required               | Verified |
| `parent-active-claim-cancel-confirmation-approved.png`      | Active Claim / cancel confirmation         | Verified |
| `parent-active-claim-cancellation-unavailable-approved.png` | Active Claim / cancellation deadline race  | Verified |

## Parent Child access

| Approved reference                                            | Production family / state                       | Status   |
| ------------------------------------------------------------- | ----------------------------------------------- | -------- |
| `parent-child-access-empty-approved.png`                      | Child access / no active code or devices        | Verified |
| `parent-child-access-code-approved.png`                       | Child access / active pairing code              | Verified |
| `parent-child-access-code-revoke-confirmation-approved.png`   | Child access / code revoke confirmation         | Verified |
| `parent-child-access-expired-code-approved.png`               | Child access / expired code                     | Verified |
| `parent-child-access-regenerated-code-approved.png`           | Child access / regenerated code success         | Verified |
| `parent-child-access-device-approved.png`                     | Child access / active device                    | Verified |
| `parent-child-access-device-revoke-confirmation-approved.png` | Child access / device revoke confirmation       | Verified |
| `parent-child-access-revoked-device-approved.png`             | Child access / collapsed revoked-device history | Verified |

## Parent invitations

| Approved reference                                   | Production family / state                               | Status   |
| ---------------------------------------------------- | ------------------------------------------------------- | -------- |
| `parent-invitation-empty-approved.png`               | Parent invitation / no active invite                    | Verified |
| `parent-invitation-code-approved.png`                | Parent invitation / freshly generated token             | Verified |
| `parent-invitation-code-unavailable-approved.png`    | Parent invitation / active token unavailable on revisit | Verified |
| `parent-invitation-regenerated-approved.png`         | Parent invitation / regenerated token success           | Verified |
| `parent-invitation-revoke-confirmation-approved.png` | Parent invitation / revoke confirmation                 | Verified |
| `parent-invitation-revoked-approved.png`             | Parent invitation / server-confirmed revocation         | Verified |
| `parent-invitation-accept-empty-approved.png`        | Parent invite acceptance / empty                        | Verified |
| `parent-invitation-accept-invalid-approved.png`      | Parent invite acceptance / invalid                      | Verified |
| `parent-invitation-accept-revoked-approved.png`      | Parent invite acceptance / revoked                      | Verified |
| `parent-invitation-accept-used-approved.png`         | Parent invite acceptance / already used                 | Verified |
| `parent-invitation-accept-expired-approved.png`      | Parent invite acceptance / expired                      | Verified |

## Completion rule

A row becomes `Implemented` only when the approved hierarchy is represented by production React Native code and the mapped state is derived from existing app behavior. It becomes `Verified` only after a simulator screenshot has been compared with the approved reference and obvious mismatches have been corrected.
