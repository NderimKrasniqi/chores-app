# Evidence Retention

Submission photo evidence is private application data.

## Durable evidence

A photo referenced by `choreSubmissions.evidenceStorageId` is retained with the
Submission history.

Automatic cleanup must never delete a Storage object while it is referenced by:

- a Submission;
- an active upload intent;
- a private evidence view token.

## Upload intents

Evidence upload intents are transient coordination records.

They expire after the configured upload window or the applicable Chore/Redo
deadline, whichever comes first.

After expiry:

- a registered file that was never attached to a Submission is deleted;
- the expired upload-intent row is deleted;
- a file already referenced by a Submission remains durable.

## View tokens

Private evidence view tokens are temporary authorization artifacts.

Expired tokens are deleted by bounded maintenance and are not durable business
history.

## Unregistered storage orphans

A client can upload a file successfully and crash before `registerUpload`.
That leaves a Convex `_storage` object with no application reference.

Maintenance scans `_storage` incrementally.

Automatic orphan deletion is deliberately conservative:

- the object must be an unreferenced JPEG;
- it must be older than the evidence orphan grace window;
- no Submission, upload intent, or view token may reference it.

The current grace window is 24 hours.

If Convex Storage is later used for another JPEG-based feature, the evidence
orphan ownership rules must be extended before that feature ships.

## Maintenance bounds

Each scheduled evidence-maintenance transaction processes a fixed-size batch of:

- expired upload intents;
- expired view tokens;
- one page of `_storage` metadata.

The storage cursor is persisted so no invocation needs to scan all historical
Storage objects.
