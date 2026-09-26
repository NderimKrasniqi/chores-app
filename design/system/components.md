# Interaction components

| Component | Where | Notes |
| --- | --- | --- |
| `ActionButton` | everywhere | tones: primary, secondary, commit, destructive, destructiveSecondary, quiet |
| `HoldButton` | send work, redo | hold-to-complete; screen readers get an activate action |
| `StarKeypad` + `StarSlots` | child PIN setup/unlock | custom pad, shake on wrong code |
| `ReviewDeck` | parent reviews | swipe right approve / left redo; buttons mirror gestures |
| `SlideToPay` | parent Money | deliberate full slide; accessible confirm dialog |
| `ClaimedQuestCard` | child Extras | commitment timeline, stakes, key-spending unclaim sheet |
| `ChildQuestCard` | child quests | snap proof, hold to send, sent overlay |
| `ChildApprovalCelebrations` | child shell | full-screen win, sibling toast |
| `ServerConnectionNotice` | global | offline / connecting / recovering pill |
