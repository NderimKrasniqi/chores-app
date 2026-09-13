# Production Navigation

**Status:** Review

This navigation model is the proposed production structure for TASK-23. Product and domain documentation remain authoritative for behavior.

## Shared entry flow

```text
First launch
  → Shared onboarding
  → Choose role
      → Parent authentication
          → Create or join household
          → Parent app
      → Child access
          → Select saved profile or pair a new profile
          → Create or enter local PIN
          → Child app
```

- Shared onboarding has four pages: Welcome, How it works, Real rewards, and Choose your role.
- Back is available after the first page.
- Skip on pages one through three moves to Choose your role.
- Choose your role cannot be skipped.
- Completed onboarding is available again from account/help surfaces.
- Child access never requires a Child email account.

## Child navigation

The Child experience uses four persistent bottom destinations.

| Destination | Purpose                                                  | Primary content                                                                               |
| ----------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Home        | Answer “What do I need to do now?”                       | Running balance summary, Personal Chores, active Claim summary, urgent Redo or review states  |
| Extras      | Find and manage extra earning opportunities              | Unlock state, eligible Claimable Chores, active Claim, unclaim allowance and lock state       |
| Activity    | See household progress without exposing private balances | Approved chore celebrations and shared claimed/completed facts                                |
| Money       | Understand the Child's private financial position        | Running balance, payout-day context, finalized earnings and penalties available to this Child |

The header avatar opens profile actions rather than adding a fifth tab:

- lock or switch Child profile;
- view the active Household and Child identity;
- open help/onboarding;
- open notification and device-access information where appropriate.

### Child navigation rules

- Home prioritizes Personal Chores before Extras.
- The Child Home header, Running Balance, Extras explanation, and bottom navigation remain stable while the `Your chores` list scrolls vertically in its own bounded region.
- Home shows the available chore list directly and does not use a separate `See all` route.
- An unresolved Claim may be summarized on Home but is managed from Extras.
- In the unlocked Extras pool, the available-chore list scrolls in a bounded region while the destination header, access status, allowance guidance, and bottom navigation remain stable.
- Submission, photo attachment, claim confirmation, unclaim confirmation, and Redo actions open as focused detail routes or sheets rather than adding tabs.
- Another Child's Running Balance or detailed financial history is never reachable.
- A locked Extras gate explains the current Unlock Chore without offering a Parent override.

## Parent navigation

The Parent experience uses five persistent bottom destinations.

| Destination | Purpose                                            | Primary content                                                                                                   |
| ----------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Home        | Show what needs attention across the Household     | Reviews due, active commitments, Child summaries, Household activity, quick actions                               |
| Chores      | Configure responsibility and earning opportunities | Personal and Claimable definitions, schedules, eligibility, values, Unlock Chores, create/edit flows              |
| Reviews     | Resolve submitted work                             | Pending Personal, Claimable, and Redo submissions; evidence; approve/reject decisions                             |
| Money       | Settle Household earnings                          | Child balances, open payout period, pending outcomes, Swish amounts, mark-paid flow, payout history               |
| Family      | Manage people, access, and Household settings      | Children, equal-authority Parents, invitations, paired Child devices, timezone, payout weekday, unclaim allowance |

The header avatar opens Parent account actions:

- account identity;
- switch Household when more than one exists;
- help/onboarding;
- notification settings;
- sign out.

### Parent navigation rules

- Review counts appear as badges on Reviews and as an actionable Home card.
- On Chores, the header, Add chore action, Personal/Claimable control, and bottom navigation remain stable while the active-definition list scrolls in a bounded region.
- Chore creation and editing are focused routes launched from Chores.
- Review decisions are focused routes launched from Reviews or a Home attention card.
- Marking a payout paid requires an explicit confirmation step.
- Parent cancellation of an active Claim is available from its detail surface and explains that it creates no penalty or Child unclaim usage.
- All Parents in a Household see the same controls; the UI must not imply owner-only authority.

## Route and overlay guidance

- Bottom destinations preserve their navigation stack when switching tabs.
- Full-screen routes handle forms, evidence review, and complex details.
- Bottom sheets handle short confirmations and warnings.
- Destructive or financially consequential actions require explicit confirmation language.
- System Back returns to the prior route without silently committing changes.
- Deep links and notifications open the exact relevant detail after authorization and access checks.

## Offline and server-confirmed behavior

- Cached content may remain readable offline.
- Claim, unclaim, submit, review, and payout settlement controls are disabled without a live server connection.
- Pending actions communicate “checking with server” rather than showing optimistic completion.
- An interrupted action enters a recovery state that tells the user not to repeat it until the authoritative result is known.
- Reconnection refreshes deadline, Claim ownership, review, and balance state before actions re-enable.

## Accessibility baseline

- Every primary target is at least 44 by 44 points.
- Navigation has text labels in addition to icons.
- Color never carries state by itself.
- Layout supports larger text without clipping critical amounts, deadlines, or actions.
- Illustrations are decorative unless they communicate status; decorative art is hidden from assistive technology.
- Motion and celebrations respect reduced-motion preferences.
