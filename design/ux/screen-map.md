# Production Screen Map

**Status:** Review

This map defines the production screen and state coverage required before React Native implementation. Variants may share one implementation, but each observable state must be designed and verified.

## Shared onboarding and access

| ID   | Surface               | Required variants                                                                  |
| ---- | --------------------- | ---------------------------------------------------------------------------------- |
| S-01 | Welcome               | First launch; returning access through Help                                        |
| S-02 | How it works          | Standard; reduced-motion illustration                                              |
| S-03 | Real rewards          | Standard; larger-text layout                                                       |
| S-04 | Choose your role      | Parent; Child; accessibility focus order                                           |
| S-05 | Parent authentication | Sign in; sign up; validation; pending; failure                                     |
| S-06 | Household start       | Create Household; join with Parent invite; invalid/expired invite                  |
| S-07 | Child profile chooser | No saved profiles; one trusted profile; multiple profiles; revoked profile removed |
| S-08 | Child pairing         | QR scan; manual code; camera denied; invalid/expired/used code; success            |
| S-09 | Child PIN             | Create; confirm; unlock; incorrect attempts; temporary lockout                     |
| S-10 | Access recovery       | Revoked device cleanup; connection failure; retry                                  |

## Child application

| ID   | Surface               | Required variants                                                                                                                                                      |
| ---- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C-01 | Home                  | Fixed header/balance/navigation with independently scrollable Chore list; normal list; urgent deadline; empty; active Claim summary; Redo priority; waiting for review |
| C-02 | Personal Chore detail | Upcoming; available; submitted; approved; missed; cancelled; Redo required                                                                                             |
| C-03 | Submit work           | No photo; optional photo attached; uploading; upload failure; submitting; confirmed; server failure                                                                    |
| C-04 | Extras gate           | No current Unlock Chore; awaiting availability; available; submitted; Redo required; missed/failed; approved                                                           |
| C-05 | Extras pool           | Available list; empty; another Child claimed item; ineligible item excluded; active-Claim restriction                                                                  |
| C-06 | Claim confirmation    | Unlocked Claim; immediately time-locked Claim; allowance-exhausted Claim; concurrent claim loss                                                                        |
| C-07 | Active Claim detail   | Unlocked; locked by time; locked by allowance; under review; Redo required; cancelled; failed                                                                          |
| C-08 | Unclaim confirmation  | Allowed with remaining count; boundary crossed; allowance exhausted; server failure                                                                                    |
| C-09 | Redo submission       | Personal; Claimable; deadline approaching; optional photo; deadline missed; final failure                                                                              |
| C-10 | Activity              | New celebration; history; empty; sibling-safe content                                                                                                                  |
| C-11 | Money                 | Positive balance; zero; negative carry; payout-day context; pending outcome explanation                                                                                |
| C-12 | Child profile menu    | Lock/switch; Household identity; Help; notification/device status                                                                                                      |

## Parent application

| ID   | Surface              | Required variants                                                                                                   |
| ---- | -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| P-01 | Home                 | Normal; reviews due; active Claims; no activity; multiple Children; new celebration                                 |
| P-02 | Chores               | Personal/Claimable lists; empty; paused/deleted definition treatment; future-only edit explanation                  |
| P-03 | Create or edit Chore | Personal; Claimable; one-off; recurring; eligibility; availability; deadline; value; Unlock designation; validation |
| P-04 | Reviews queue        | Personal; Claimable; Redo; empty; concurrent decision already resolved                                              |
| P-05 | Review detail        | Evidence absent/present/loading/failure; approve pending/success/failure; reject path                               |
| P-06 | Set Redo deadline    | Valid date/time; validation; server pending; deadline race; final rejection warning for attempt two                 |
| P-07 | Active Claim detail  | Claimed; submitted; Redo; cancellation confirmation; cancellation no longer allowed                                 |
| P-08 | Money overview       | Open payout period; positive/zero/negative Child balances; pending outcomes; payout-day change notice               |
| P-09 | Payout detail        | Manual Swish amount; mark paid confirmation; pending; paid immutable; failure/recovery                              |
| P-10 | Activity             | Celebration; history; empty; immutable historical values                                                            |
| P-11 | Family               | Child list; Parent list; no Children; multiple equal-authority Parents                                              |
| P-12 | Child access         | Create pairing code; QR; code expired/regenerated; active/revoked devices; revoke confirmation                      |
| P-13 | Parent invitation    | Create; copy/share; revoke; regenerate; accept; invalid/expired/revoked                                             |
| P-14 | Household settings   | Name; timezone; payout weekday; weekly unclaim allowance; future-effect explanations                                |
| P-15 | Parent account       | Identity; Household switch; Help; notification settings; sign out                                                   |

## Shared system states

Every applicable surface must define:

- initial loading or skeleton;
- empty content with a relevant next action;
- inline recoverable error;
- full-screen blocking error;
- offline read-only mode;
- connecting and recovering states;
- server-confirmed action pending state;
- success feedback without implying unconfirmed finality;
- permission request and denial recovery;
- deadline or concurrency conflict after stale data;
- large text, screen reader, reduced motion, and increased contrast behavior.

## Image-generation anchors

Image generation establishes visual treatment for these canonical screens first:

1. C-01 Child Home
2. P-01 Parent Home
3. C-05 Extras pool
4. C-02/C-03 Chore detail and submission
5. P-02 Chores
6. P-04/P-05 Reviews queue and detail
7. P-08 Money overview
8. P-11 Family

State variants and exact interaction behavior are then specified in deterministic HTML rather than inferred from generated imagery.
