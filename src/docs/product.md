# Product
**Status:** Approved

## Problem & Solution
Parents need a structured way to manage household responsibilities and allowance without constant manual tracking or nagging, while children aged 8–18 need a clear connection between responsibility, commitment, and earning money. The product is a family chores app where parents create paid personal and claimable chores, children submit completed work for parental approval, and approved work contributes to a running balance that parents settle manually through Swish.

## Principles
- Normal responsibilities come before access to extra earning opportunities.
- Every completed chore requires parental review and approval before it counts as completed or earned.
- Claiming an extra chore is a real commitment: backing out is limited, and missing a locked commitment has a monetary consequence.
- Children can compete casually through visible household achievements without exposing private total balances or detailed histories.
- Parent review delay must not disadvantage a child who submitted work on time.
- Historical earnings, penalties, approvals, and payouts remain trustworthy even when chore definitions later change or are deleted.

## Product Journeys
### J-01 — Set up a household
Parents create a household and child profiles; additional parents join with equal authority, and children access their profiles without requiring email accounts.

### J-02 — Configure chores
Parents create personal or claimable chores with monetary value, deadlines, recurrence, eligibility, and an optional designated personal unlock chore.

### J-03 — Complete personal responsibilities
Children complete and submit personal chores before their deadlines, optionally attaching photo evidence, and earn the chore value after parental approval.

### J-04 — Unlock extra earning opportunities
Approval of the current designated personal unlock chore enables that child to access eligible claimable chores until the next unlock occurrence requires completion.

### J-05 — Find and claim extra chores
Eligible children browse the shared claimable chore pool and exclusively claim an available chore on a first-come, first-served basis.

### J-06 — Manage an active commitment
A child works on one active claimed chore at a time and can claim another after the current one is approved.

### J-07 — Back out before commitment lock
Children may unclaim eligible chores before the lock window while they still have weekly unclaims remaining; the household-wide weekly unclaim allowance is configured by parents.

### J-08 — Submit and review completed work
Children submit completed chores, optionally with a photo, and parents approve them or reject them for redo without penalizing on-time submissions for review delay.

### J-09 — Redo rejected work
Rejected on-time work can be redone against a new parent-set deadline before it becomes a missed personal chore or a penalized claimed chore.

### J-10 — Resolve missed commitments
Missing a locked claimed chore subtracts its full value from the child's running balance, while missed personal chores simply earn nothing.

### J-11 — Celebrate household progress
Approved chores generate household-visible celebrations showing who completed the chore and how much it was worth, without publishing each child's total balance.

### J-12 — Keep the family informed
Push notifications alert children and parents about relevant chores, reviews, redos, deadlines, and the approaching unclaim lock window.

### J-13 — Settle earnings
Parents choose the household payout weekday, pay finalized positive balances manually through Swish, mark payouts as paid, and carry negative balances forward.

## Material Constraints
- Target child age range is 8–18.
- Multiple parents in a household have equal parental control.
- Every chore completion requires parental approval.
- Both personal and claimable chores may recur.
- Personal chores earn money when approved but never create a monetary penalty when missed.
- One designated personal chore per child gates access to claimable chores; a missed unlock occurrence cannot be manually bypassed by a parent.
- Claimable chores are exclusive once claimed and may be restricted to selected children.
- A child may have only one active claimed chore at a time but may complete and claim multiple chores in the same day sequentially.
- A claim can normally be unclaimed only until two hours before its deadline; claiming inside that window is allowed with an explicit warning that the claim is immediately locked.
- Parents configure one weekly unclaim allowance that applies equally to all children; after a child exhausts it, that child may continue claiming but cannot unclaim further chores during that payout week.
- Once a claimable chore occurrence is claimed, its value and deadline are fixed for that claim; a parent may cancel it without penalizing the child.
- Weekly balances may fall below zero, and negative balances carry into later payout weeks.
- Children can see shared claimable-chore activity and who claimed or completed chores, but each child's total balance and detailed history remain private from siblings.

## First Useful Release
- Parent-led household setup with equal parent roles and child profiles joined by QR code or short invite code.
- Creation and recurrence of paid personal and claimable chores with deadlines, values, eligibility, and an unlock chore.
- Child chore views, exclusive claiming, one-active-claim enforcement, unclaim allowance, and two-hour commitment lock.
- Submission with optional photo evidence, parental approval/rejection, redo deadlines, missed-chore handling, and monetary penalties for missed claimed chores.
- Running child balances with negative carry-forward and parent-controlled weekly payout day.
- Manual Swish settlement tracking and mark-as-paid behavior.
- Household activity celebrations and push notifications for material chore and review events.

## Deferred
- Automatic or embedded Swish payment initiation/integration.
- Leaderboards, rankings, or public running earnings totals.
- Multiple simultaneous active claimed chores for one child.
- Child email-account requirements.
- Parent override of a missed unlock-chore occurrence.

## Downstream Ownership
- Domain modeling owns canonical terminology, recurrence/occurrence semantics, claim and submission lifecycles, review/redo transitions, balance and settlement invariants, unclaim accounting, concurrency rules, and historical-record behavior.
- Journey specification owns observable scenario behavior and edge outcomes for the approved journeys.
- Solution design owns authentication and child-device pairing mechanics, PIN/session behavior, photo storage, push-notification infrastructure, persistence/runtime boundaries, and future Swish integration boundaries.
