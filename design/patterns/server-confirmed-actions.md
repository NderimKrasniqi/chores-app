# Server-Confirmed Actions

**Status:** Draft

Consequential actions require live server confirmation.

Examples:

- Claim
- Unclaim
- Submit
- Approve
- Request redo
- Parent cancellation
- Payout settlement

## Interaction states

### Ready

Action is available.

### Checking

The app is validating current authoritative state.

### Pending

Request has been sent and final outcome is not yet known.

### Confirmed

Server confirmed the state transition.

### Failed

The request did not complete.

### Retry

The user may attempt the action again if the authoritative time/state still permits it.

### Offline unavailable

Cached information may remain visible, but the action is disabled.

Never backdate an offline interaction across a lock or deadline.
