import { spawnSync } from 'node:child_process';

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const smokeFunctions = [
  'dev/smoke/task07/maintenance:run',
  'dev/smoke/task07/maintenanceIsolation:run',
  'dev/smoke/task07/occurrence:run',
  'dev/smoke/task07/scheduling:run',
  'dev/smoke/task08/approval:run',
  'dev/smoke/task08/miss:run',
  'dev/smoke/task08/submission:run',
  'dev/smoke/task09/claimableVisibility:run',
  'dev/smoke/task09/unlockGate:run',
  'dev/smoke/task10/claim:run',
  'dev/smoke/task10/claimDeadline:run',
  'dev/smoke/task10/claimVisibility:run',
  'dev/smoke/task11/claimWarning:run',
  'dev/smoke/task11/commitmentRules:run',
  'dev/smoke/task11/parentCancellation:run',
  'dev/smoke/task11/unclaim:run',
  'dev/smoke/task11/unclaimAccounting:run',
  'dev/smoke/task12/claimableApproval:run',
  'dev/smoke/task12/claimableSubmission:run',
  'dev/smoke/task13/initialRejection:run',
  'dev/smoke/task13/personalReviewIsolation:run',
  'dev/smoke/task13/redoDeadline:run',
  'dev/smoke/task13/redoDeadlineFailure:run',
  'dev/smoke/task13/redoReview:run',
  'dev/smoke/task13/redoSubmission:run',
  'dev/smoke/task13/reviewAuthority:run',
  'dev/smoke/task14/maintenancePenalty:run',
  'dev/smoke/task14/missedClaimPenalty:run',
  'dev/smoke/task14/originalDeadlineCancellation:run',
  'dev/smoke/task14/penaltyLedger:run',
  'dev/smoke/task14/redoDeadlineCancellation:run',
  'dev/smoke/task14/runningBalance:run',
  'dev/smoke/task15/settlement:run',
  'dev/smoke/task16/evidence:run',
  'dev/smoke/task17/activity:run',
  'dev/smoke/task18/notificationInfrastructure:run',
  'dev/smoke/task18/orchestration:run',
  'dev/smoke/task22/parentPrincipalSeparation:run',
  'dev/smoke/task22/financialProjection:run',
  'dev/smoke/task22/claimCommitmentLock:run',
  'dev/smoke/task22/unlockActivation:run',
  'dev/smoke/task22/evidenceRetention:run',
  'dev/smoke/task22/maintenanceFanout:run',
];

for (const functionName of smokeFunctions) {
  const result = spawnSync(
    npx,
    ['convex', 'run', functionName],
    {
      encoding: 'utf8',
      env: process.env,
      maxBuffer: 10 * 1024 * 1024,
    },
  );

  if (result.error || result.status !== 0) {
    console.error(`Backend verification failed: ${functionName}`);

    if (result.stdout) {
      process.stderr.write(result.stdout);
    }

    if (result.stderr) {
      process.stderr.write(result.stderr);
    }

    if (result.error) {
      console.error(result.error);
    }

    process.exit(result.status ?? 1);
  }
}

console.log(
  `Backend verification passed: ${smokeFunctions.length}/${smokeFunctions.length}`,
);
