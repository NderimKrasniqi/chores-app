# Direction C implementation coverage

**Status:** Active

This matrix maps every approved Direction C reference to a production screen family and a real application state. References are not implemented as independent routes when they are variants of one server-driven surface.

Status values: `Pending`, `Implementing`, `Implemented`, `Verified`.

## Shared entry and onboarding

| Approved reference                        | Production family / state                     | Status      |
| ----------------------------------------- | --------------------------------------------- | ----------- |
| `onboarding-approved.png`                 | Shared onboarding / four pages                | Implemented |
| `parent-auth-create-account-approved.png` | Parent authentication / create account        | Implemented |
| `parent-household-start-approved.png`     | Household start / create or join              | Implemented |
| `parent-create-household-approved.png`    | Household start / create form                 | Implemented |
| `child-profile-chooser-approved.png`      | Child access / saved profiles                 | Implemented |
| `child-pairing-entry-approved.png`        | Child access / pairing entry                  | Implemented |
| `child-pairing-scanner-approved.png`      | Child access / QR scanner                     | Implemented |
| `child-pin-setup-approved.png`            | Child access / PIN setup                      | Implemented |
| `child-pin-unlock-approved.png`           | Child access / PIN unlock                     | Implemented |
| `child-access-recovery-approved.png`      | Child access / revoked-grant cleanup recovery | Implemented |

## Child destinations and focused flows

| Approved reference                               | Production family / state                  | Status      |
| ------------------------------------------------ | ------------------------------------------ | ----------- |
| `child-home-approved.png`                        | Child Home / populated                     | Implemented |
| `child-extras-gate-approved.png`                 | Child Extras / locked                      | Implemented |
| `child-extras-pool-approved.png`                 | Child Extras / unlocked pool               | Implemented |
| `child-activity-approved.png`                    | Child Activity / history                   | Implemented |
| `child-activity-celebration-approved.png`        | Child Activity / transient celebration     | Implemented |
| `child-activity-empty-approved.png`              | Child Activity / empty                     | Implemented |
| `child-money-positive-approved.png`              | Child Money / positive balance             | Implemented |
| `child-money-zero-approved.png`                  | Child Money / zero balance                 | Implemented |
| `child-money-negative-approved.png`              | Child Money / negative carry               | Implemented |
| `child-profile-approved.png`                     | Child Profile / account and device context | Implemented |
| `child-chore-detail-approved.png`                | Personal Chore detail / available          | Implemented |
| `child-chore-detail-upcoming-approved.png`       | Personal Chore detail / scheduled          | Implemented |
| `child-chore-detail-submitted-approved.png`      | Personal Chore detail / submitted          | Implemented |
| `child-chore-detail-approved-state-approved.png` | Personal Chore detail / approved           | Implemented |
| `child-chore-detail-missed-approved.png`         | Personal Chore detail / missed             | Implemented |
| `child-chore-detail-redo-approved.png`           | Personal Chore detail / Redo required      | Implemented |
| `child-submit-empty-approved.png`                | Submit work / no photo                     | Implemented |
| `child-submit-photo-approved.png`                | Submit work / photo attached               | Implemented |
| `child-claim-locked-confirmation-approved.png`   | Claim confirmation / immediate lock        | Implemented |
| `child-active-claim-approved.png`                | Active Claim / unlocked                    | Implemented |
| `child-unclaim-confirmation-approved.png`        | Active Claim / unclaim confirmation        | Implemented |
| `child-claimable-redo-approved.png`              | Active Claim / Redo required               | Implemented |

## Parent destinations and focused flows

| Approved reference                                          | Production family / state                  | Status      |
| ----------------------------------------------------------- | ------------------------------------------ | ----------- |
| `parent-home-approved.png`                                  | Parent Home / attention dashboard          | Implemented |
| `parent-chores-approved.png`                                | Parent Chores / definitions                | Implemented |
| `parent-new-chore-personal-approved.png`                    | Chore editor / create Personal             | Implemented |
| `parent-new-chore-claimable-approved.png`                   | Chore editor / create Claimable            | Implemented |
| `parent-edit-chore-approved.png`                            | Chore editor / edit future occurrences     | Implemented |
| `parent-reviews-queue-approved.png`                         | Parent Reviews / queue                     | Implemented |
| `parent-review-detail-approved.png`                         | Parent Review / initial submission         | Implemented |
| `parent-set-redo-deadline-approved.png`                     | Parent Review / set Redo deadline          | Implemented |
| `parent-money-overview-approved.png`                        | Parent Money / overview                    | Implemented |
| `parent-payout-detail-approved.png`                         | Payout / pending external payment          | Implemented |
| `parent-payout-mark-paid-confirmation-approved.png`         | Payout / mark-paid confirmation            | Implemented |
| `parent-payout-paid-approved.png`                           | Payout / immutable paid state              | Implemented |
| `parent-payout-recovery-approved.png`                       | Payout / interrupted settlement recovery   | Implemented |
| `parent-family-approved.png`                                | Parent Family / overview                   | Implemented |
| `parent-household-settings-approved.png`                    | Household settings / grouped configuration | Implemented |
| `parent-household-switcher-approved.png`                    | Parent Account / Household switcher        | Implemented |
| `parent-account-approved.png`                               | Parent Account / identity and controls     | Implemented |
| `parent-activity-approved.png`                              | Parent Activity / history                  | Implemented |
| `parent-activity-celebration-approved.png`                  | Parent Activity / transient celebration    | Implemented |
| `parent-activity-empty-approved.png`                        | Parent Activity / empty                    | Implemented |
| `parent-active-claim-approved.png`                          | Active Claim / claimed                     | Implemented |
| `parent-active-claim-submitted-approved.png`                | Active Claim / submitted                   | Implemented |
| `parent-active-claim-redo-approved.png`                     | Active Claim / Redo required               | Implemented |
| `parent-active-claim-cancel-confirmation-approved.png`      | Active Claim / cancel confirmation         | Implemented |
| `parent-active-claim-cancellation-unavailable-approved.png` | Active Claim / cancellation deadline race  | Implemented |

## Parent Child access

| Approved reference                                            | Production family / state                       | Status      |
| ------------------------------------------------------------- | ----------------------------------------------- | ----------- |
| `parent-child-access-empty-approved.png`                      | Child access / no active code or devices        | Implemented |
| `parent-child-access-code-approved.png`                       | Child access / active pairing code              | Implemented |
| `parent-child-access-code-revoke-confirmation-approved.png`   | Child access / code revoke confirmation         | Implemented |
| `parent-child-access-expired-code-approved.png`               | Child access / expired code                     | Implemented |
| `parent-child-access-regenerated-code-approved.png`           | Child access / regenerated code success         | Implemented |
| `parent-child-access-device-approved.png`                     | Child access / active device                    | Implemented |
| `parent-child-access-device-revoke-confirmation-approved.png` | Child access / device revoke confirmation       | Implemented |
| `parent-child-access-revoked-device-approved.png`             | Child access / collapsed revoked-device history | Implemented |

## Parent invitations

| Approved reference                                   | Production family / state                               | Status      |
| ---------------------------------------------------- | ------------------------------------------------------- | ----------- |
| `parent-invitation-empty-approved.png`               | Parent invitation / no active invite                    | Implemented |
| `parent-invitation-code-approved.png`                | Parent invitation / freshly generated token             | Implemented |
| `parent-invitation-code-unavailable-approved.png`    | Parent invitation / active token unavailable on revisit | Implemented |
| `parent-invitation-regenerated-approved.png`         | Parent invitation / regenerated token success           | Implemented |
| `parent-invitation-revoke-confirmation-approved.png` | Parent invitation / revoke confirmation                 | Implemented |
| `parent-invitation-revoked-approved.png`             | Parent invitation / server-confirmed revocation         | Implemented |
| `parent-invitation-accept-empty-approved.png`        | Parent invite acceptance / empty                        | Implemented |
| `parent-invitation-accept-invalid-approved.png`      | Parent invite acceptance / invalid                      | Implemented |
| `parent-invitation-accept-revoked-approved.png`      | Parent invite acceptance / revoked                      | Implemented |
| `parent-invitation-accept-used-approved.png`         | Parent invite acceptance / already used                 | Implemented |
| `parent-invitation-accept-expired-approved.png`      | Parent invite acceptance / expired                      | Implemented |

## Completion rule

A row becomes `Implemented` only when the approved hierarchy is represented by production React Native code and the mapped state is derived from existing app behavior. It becomes `Verified` only after a simulator screenshot has been compared with the approved reference and obvious mismatches have been corrected.
