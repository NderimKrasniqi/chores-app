# Animation plans

Written by the `improve-animations` audit at commit `e6d90b3`. Each plan
stands alone. Give one plan to any agent and it has everything it needs.

| #   | Plan                                                                                                                       | Severity | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------- | -------- | ------ |
| 001 | [Keep one starfield across the kid's tabs](001-stable-starfield-across-kid-tabs.md)                                        | HIGH     | DONE   |
| 002 | [Start the review swipe and slide-to-pay from where the element is](002-drags-start-where-the-card-is.md)                  | MEDIUM   | DONE   |
| 003 | [Move the next review card forward instead of teleporting it](003-review-deck-promotes-next-card.md)                       | MEDIUM   | DONE   |
| 004 | [Let the quest-map rocket change course mid-flight](004-rocket-retargets-mid-flight.md)                                    | MEDIUM   | DONE   |
| 005 | [Stop parent Home signals and week-board dots re-animating on every visit](005-no-entrance-replay-on-parent-tab-switch.md) | MEDIUM   | DONE   |
| 006 | [Make the launch splash hand-off a quick, plain fade](006-splash-handoff-fade.md)                                          | MEDIUM   | DONE   |

## Recommended order

1. **001**: one line, fixes the most frequent kid action.
2. **005**: two wrappers, fixes the most frequent parent screens.
3. **002**, then **003**: both edit `src/components/chores/review-deck.tsx`
   (`TopCard`). Do 002 first. 003's `cardStyle` replacement keeps
   `translateX: x.get()`, so it composes with 002's drag-start change. Run them
   one after the other, not in parallel.
4. **004**: self-contained in `src/components/art/star-map.tsx`.
5. **006**: self-contained in `src/components/animated-icon.tsx`.

## Dependencies

- 003 depends on 002 only by file (same component). Neither changes the
  other's lines, but applying them in parallel will conflict.
- All others are independent.

## Not planned here

Proposed by the separate find-animation-opportunities pass. Not duplicated:
shared ScrimSheet for the eight slide-up `Modal` sheets, kid-side press
feedback, the onboarding pager, the server-connection pill, the high-five
button, "All caught up!", and the new linked-phone row.
