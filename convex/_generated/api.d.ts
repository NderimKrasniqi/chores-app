/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as childAccess from "../childAccess.js";
import type * as childPairing from "../childPairing.js";
import type * as childRedos from "../childRedos.js";
import type * as choreDefinitions from "../choreDefinitions.js";
import type * as choreOccurrences from "../choreOccurrences.js";
import type * as claimableChoreReviews from "../claimableChoreReviews.js";
import type * as claimableChoreSubmissions from "../claimableChoreSubmissions.js";
import type * as claimableChores from "../claimableChores.js";
import type * as claimableClaimCancellations from "../claimableClaimCancellations.js";
import type * as crons from "../crons.js";
import type * as dev_smoke_task06_choreDefinitions from "../dev/smoke/task06/choreDefinitions.js";
import type * as dev_smoke_task07_maintenance from "../dev/smoke/task07/maintenance.js";
import type * as dev_smoke_task07_maintenanceIsolation from "../dev/smoke/task07/maintenanceIsolation.js";
import type * as dev_smoke_task07_occurrence from "../dev/smoke/task07/occurrence.js";
import type * as dev_smoke_task07_scheduling from "../dev/smoke/task07/scheduling.js";
import type * as dev_smoke_task08_approval from "../dev/smoke/task08/approval.js";
import type * as dev_smoke_task08_miss from "../dev/smoke/task08/miss.js";
import type * as dev_smoke_task08_submission from "../dev/smoke/task08/submission.js";
import type * as dev_smoke_task09_claimableVisibility from "../dev/smoke/task09/claimableVisibility.js";
import type * as dev_smoke_task09_unlockGate from "../dev/smoke/task09/unlockGate.js";
import type * as dev_smoke_task10_claim from "../dev/smoke/task10/claim.js";
import type * as dev_smoke_task10_claimDeadline from "../dev/smoke/task10/claimDeadline.js";
import type * as dev_smoke_task10_claimVisibility from "../dev/smoke/task10/claimVisibility.js";
import type * as dev_smoke_task11_claimWarning from "../dev/smoke/task11/claimWarning.js";
import type * as dev_smoke_task11_commitmentRules from "../dev/smoke/task11/commitmentRules.js";
import type * as dev_smoke_task11_parentCancellation from "../dev/smoke/task11/parentCancellation.js";
import type * as dev_smoke_task11_unclaim from "../dev/smoke/task11/unclaim.js";
import type * as dev_smoke_task11_unclaimAccounting from "../dev/smoke/task11/unclaimAccounting.js";
import type * as dev_smoke_task12_claimableApproval from "../dev/smoke/task12/claimableApproval.js";
import type * as dev_smoke_task12_claimableSubmission from "../dev/smoke/task12/claimableSubmission.js";
import type * as dev_smoke_task13_initialRejection from "../dev/smoke/task13/initialRejection.js";
import type * as dev_smoke_task13_personalReviewIsolation from "../dev/smoke/task13/personalReviewIsolation.js";
import type * as dev_smoke_task13_redoDeadline from "../dev/smoke/task13/redoDeadline.js";
import type * as dev_smoke_task13_redoDeadlineFailure from "../dev/smoke/task13/redoDeadlineFailure.js";
import type * as dev_smoke_task13_redoReview from "../dev/smoke/task13/redoReview.js";
import type * as dev_smoke_task13_redoSubmission from "../dev/smoke/task13/redoSubmission.js";
import type * as dev_smoke_task13_reviewAuthority from "../dev/smoke/task13/reviewAuthority.js";
import type * as dev_smoke_task13_reviewAuthorityFixtures from "../dev/smoke/task13/reviewAuthorityFixtures.js";
import type * as dev_smoke_task14_maintenancePenalty from "../dev/smoke/task14/maintenancePenalty.js";
import type * as dev_smoke_task14_missedClaimPenalty from "../dev/smoke/task14/missedClaimPenalty.js";
import type * as dev_smoke_task14_originalDeadlineCancellation from "../dev/smoke/task14/originalDeadlineCancellation.js";
import type * as dev_smoke_task14_penaltyLedger from "../dev/smoke/task14/penaltyLedger.js";
import type * as dev_smoke_task14_redoDeadlineCancellation from "../dev/smoke/task14/redoDeadlineCancellation.js";
import type * as dev_smoke_task14_runningBalance from "../dev/smoke/task14/runningBalance.js";
import type * as dev_smoke_task15_settlement from "../dev/smoke/task15/settlement.js";
import type * as dev_smoke_task16_evidence from "../dev/smoke/task16/evidence.js";
import type * as dev_smoke_task16_evidenceFixture from "../dev/smoke/task16/evidenceFixture.js";
import type * as dev_smoke_task17_activity from "../dev/smoke/task17/activity.js";
import type * as dev_smoke_task18_notificationInfrastructure from "../dev/smoke/task18/notificationInfrastructure.js";
import type * as dev_smoke_task18_orchestration from "../dev/smoke/task18/orchestration.js";
import type * as dev_smoke_task22_claimCommitmentLock from "../dev/smoke/task22/claimCommitmentLock.js";
import type * as dev_smoke_task22_financialProjection from "../dev/smoke/task22/financialProjection.js";
import type * as dev_smoke_task22_parentPrincipalSeparation from "../dev/smoke/task22/parentPrincipalSeparation.js";
import type * as health from "../health.js";
import type * as householdActivity from "../householdActivity.js";
import type * as households from "../households.js";
import type * as http from "../http.js";
import type * as jobs_claims_transitions from "../jobs/claims/transitions.js";
import type * as jobs_notifications_data from "../jobs/notifications/data.js";
import type * as jobs_notifications_delivery from "../jobs/notifications/delivery.js";
import type * as jobs_occurrences_maintenance from "../jobs/occurrences/maintenance.js";
import type * as jobs_occurrences_transitions from "../jobs/occurrences/transitions.js";
import type * as jobs_payouts_maintenance from "../jobs/payouts/maintenance.js";
import type * as jobs_payouts_transitions from "../jobs/payouts/transitions.js";
import type * as jobs_redos_deadlineTransitions from "../jobs/redos/deadlineTransitions.js";
import type * as lib_activity_approvalActivity from "../lib/activity/approvalActivity.js";
import type * as lib_auth_childAuthorization from "../lib/auth/childAuthorization.js";
import type * as lib_auth_parentAuthorization from "../lib/auth/parentAuthorization.js";
import type * as lib_claims_accessGate from "../lib/claims/accessGate.js";
import type * as lib_claims_cancellation from "../lib/claims/cancellation.js";
import type * as lib_claims_claiming from "../lib/claims/claiming.js";
import type * as lib_claims_commitmentLifecycle from "../lib/claims/commitmentLifecycle.js";
import type * as lib_claims_commitmentRules from "../lib/claims/commitmentRules.js";
import type * as lib_claims_execution from "../lib/claims/execution.js";
import type * as lib_claims_ownership from "../lib/claims/ownership.js";
import type * as lib_claims_submittedClaim from "../lib/claims/submittedClaim.js";
import type * as lib_claims_unclaimAccounting from "../lib/claims/unclaimAccounting.js";
import type * as lib_claims_unclaiming from "../lib/claims/unclaiming.js";
import type * as lib_claims_visibility from "../lib/claims/visibility.js";
import type * as lib_evidence_submissionEvidence from "../lib/evidence/submissionEvidence.js";
import type * as lib_evidence_viewEvidence from "../lib/evidence/viewEvidence.js";
import type * as lib_finance_failurePenalty from "../lib/finance/failurePenalty.js";
import type * as lib_finance_financialProjection from "../lib/finance/financialProjection.js";
import type * as lib_finance_payoutOverview from "../lib/finance/payoutOverview.js";
import type * as lib_finance_payoutPeriods from "../lib/finance/payoutPeriods.js";
import type * as lib_finance_payoutSettlement from "../lib/finance/payoutSettlement.js";
import type * as lib_finance_pendingOutcomes from "../lib/finance/pendingOutcomes.js";
import type * as lib_finance_periodBalance from "../lib/finance/periodBalance.js";
import type * as lib_finance_runningBalance from "../lib/finance/runningBalance.js";
import type * as lib_notifications_events from "../lib/notifications/events.js";
import type * as lib_notifications_orchestration from "../lib/notifications/orchestration.js";
import type * as lib_notifications_recipients from "../lib/notifications/recipients.js";
import type * as lib_notifications_registration from "../lib/notifications/registration.js";
import type * as lib_occurrences_generation from "../lib/occurrences/generation.js";
import type * as lib_occurrences_lifecycle from "../lib/occurrences/lifecycle.js";
import type * as lib_occurrences_maintenance from "../lib/occurrences/maintenance.js";
import type * as lib_personal_execution from "../lib/personal/execution.js";
import type * as lib_redos_activeForChild from "../lib/redos/activeForChild.js";
import type * as lib_redos_deadline from "../lib/redos/deadline.js";
import type * as lib_redos_deadlineFailure from "../lib/redos/deadlineFailure.js";
import type * as lib_redos_submission from "../lib/redos/submission.js";
import type * as lib_reviews_claimable from "../lib/reviews/claimable.js";
import type * as lib_reviews_initialRejection from "../lib/reviews/initialRejection.js";
import type * as lib_reviews_pendingClaimable from "../lib/reviews/pendingClaimable.js";
import type * as lib_reviews_pendingPersonal from "../lib/reviews/pendingPersonal.js";
import type * as lib_reviews_pendingRedo from "../lib/reviews/pendingRedo.js";
import type * as lib_reviews_personal from "../lib/reviews/personal.js";
import type * as lib_reviews_redo from "../lib/reviews/redo.js";
import type * as lib_scheduling_choreScheduling from "../lib/scheduling/choreScheduling.js";
import type * as lib_scheduling_householdTime from "../lib/scheduling/householdTime.js";
import type * as migrations_claimCommitmentLocks from "../migrations/claimCommitmentLocks.js";
import type * as migrations_financialBalances from "../migrations/financialBalances.js";
import type * as parentInvites from "../parentInvites.js";
import type * as payouts from "../payouts.js";
import type * as personalChoreReviews from "../personalChoreReviews.js";
import type * as personalChores from "../personalChores.js";
import type * as pushNotifications from "../pushNotifications.js";
import type * as redoChoreReviews from "../redoChoreReviews.js";
import type * as runningBalances from "../runningBalances.js";
import type * as schema_childAccess from "../schema/childAccess.js";
import type * as schema_chores from "../schema/chores.js";
import type * as schema_claims from "../schema/claims.js";
import type * as schema_evidence from "../schema/evidence.js";
import type * as schema_finance from "../schema/finance.js";
import type * as schema_households from "../schema/households.js";
import type * as schema_notifications from "../schema/notifications.js";
import type * as schema_redos from "../schema/redos.js";
import type * as submissionEvidence from "../submissionEvidence.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  childAccess: typeof childAccess;
  childPairing: typeof childPairing;
  childRedos: typeof childRedos;
  choreDefinitions: typeof choreDefinitions;
  choreOccurrences: typeof choreOccurrences;
  claimableChoreReviews: typeof claimableChoreReviews;
  claimableChoreSubmissions: typeof claimableChoreSubmissions;
  claimableChores: typeof claimableChores;
  claimableClaimCancellations: typeof claimableClaimCancellations;
  crons: typeof crons;
  "dev/smoke/task06/choreDefinitions": typeof dev_smoke_task06_choreDefinitions;
  "dev/smoke/task07/maintenance": typeof dev_smoke_task07_maintenance;
  "dev/smoke/task07/maintenanceIsolation": typeof dev_smoke_task07_maintenanceIsolation;
  "dev/smoke/task07/occurrence": typeof dev_smoke_task07_occurrence;
  "dev/smoke/task07/scheduling": typeof dev_smoke_task07_scheduling;
  "dev/smoke/task08/approval": typeof dev_smoke_task08_approval;
  "dev/smoke/task08/miss": typeof dev_smoke_task08_miss;
  "dev/smoke/task08/submission": typeof dev_smoke_task08_submission;
  "dev/smoke/task09/claimableVisibility": typeof dev_smoke_task09_claimableVisibility;
  "dev/smoke/task09/unlockGate": typeof dev_smoke_task09_unlockGate;
  "dev/smoke/task10/claim": typeof dev_smoke_task10_claim;
  "dev/smoke/task10/claimDeadline": typeof dev_smoke_task10_claimDeadline;
  "dev/smoke/task10/claimVisibility": typeof dev_smoke_task10_claimVisibility;
  "dev/smoke/task11/claimWarning": typeof dev_smoke_task11_claimWarning;
  "dev/smoke/task11/commitmentRules": typeof dev_smoke_task11_commitmentRules;
  "dev/smoke/task11/parentCancellation": typeof dev_smoke_task11_parentCancellation;
  "dev/smoke/task11/unclaim": typeof dev_smoke_task11_unclaim;
  "dev/smoke/task11/unclaimAccounting": typeof dev_smoke_task11_unclaimAccounting;
  "dev/smoke/task12/claimableApproval": typeof dev_smoke_task12_claimableApproval;
  "dev/smoke/task12/claimableSubmission": typeof dev_smoke_task12_claimableSubmission;
  "dev/smoke/task13/initialRejection": typeof dev_smoke_task13_initialRejection;
  "dev/smoke/task13/personalReviewIsolation": typeof dev_smoke_task13_personalReviewIsolation;
  "dev/smoke/task13/redoDeadline": typeof dev_smoke_task13_redoDeadline;
  "dev/smoke/task13/redoDeadlineFailure": typeof dev_smoke_task13_redoDeadlineFailure;
  "dev/smoke/task13/redoReview": typeof dev_smoke_task13_redoReview;
  "dev/smoke/task13/redoSubmission": typeof dev_smoke_task13_redoSubmission;
  "dev/smoke/task13/reviewAuthority": typeof dev_smoke_task13_reviewAuthority;
  "dev/smoke/task13/reviewAuthorityFixtures": typeof dev_smoke_task13_reviewAuthorityFixtures;
  "dev/smoke/task14/maintenancePenalty": typeof dev_smoke_task14_maintenancePenalty;
  "dev/smoke/task14/missedClaimPenalty": typeof dev_smoke_task14_missedClaimPenalty;
  "dev/smoke/task14/originalDeadlineCancellation": typeof dev_smoke_task14_originalDeadlineCancellation;
  "dev/smoke/task14/penaltyLedger": typeof dev_smoke_task14_penaltyLedger;
  "dev/smoke/task14/redoDeadlineCancellation": typeof dev_smoke_task14_redoDeadlineCancellation;
  "dev/smoke/task14/runningBalance": typeof dev_smoke_task14_runningBalance;
  "dev/smoke/task15/settlement": typeof dev_smoke_task15_settlement;
  "dev/smoke/task16/evidence": typeof dev_smoke_task16_evidence;
  "dev/smoke/task16/evidenceFixture": typeof dev_smoke_task16_evidenceFixture;
  "dev/smoke/task17/activity": typeof dev_smoke_task17_activity;
  "dev/smoke/task18/notificationInfrastructure": typeof dev_smoke_task18_notificationInfrastructure;
  "dev/smoke/task18/orchestration": typeof dev_smoke_task18_orchestration;
  "dev/smoke/task22/claimCommitmentLock": typeof dev_smoke_task22_claimCommitmentLock;
  "dev/smoke/task22/financialProjection": typeof dev_smoke_task22_financialProjection;
  "dev/smoke/task22/parentPrincipalSeparation": typeof dev_smoke_task22_parentPrincipalSeparation;
  health: typeof health;
  householdActivity: typeof householdActivity;
  households: typeof households;
  http: typeof http;
  "jobs/claims/transitions": typeof jobs_claims_transitions;
  "jobs/notifications/data": typeof jobs_notifications_data;
  "jobs/notifications/delivery": typeof jobs_notifications_delivery;
  "jobs/occurrences/maintenance": typeof jobs_occurrences_maintenance;
  "jobs/occurrences/transitions": typeof jobs_occurrences_transitions;
  "jobs/payouts/maintenance": typeof jobs_payouts_maintenance;
  "jobs/payouts/transitions": typeof jobs_payouts_transitions;
  "jobs/redos/deadlineTransitions": typeof jobs_redos_deadlineTransitions;
  "lib/activity/approvalActivity": typeof lib_activity_approvalActivity;
  "lib/auth/childAuthorization": typeof lib_auth_childAuthorization;
  "lib/auth/parentAuthorization": typeof lib_auth_parentAuthorization;
  "lib/claims/accessGate": typeof lib_claims_accessGate;
  "lib/claims/cancellation": typeof lib_claims_cancellation;
  "lib/claims/claiming": typeof lib_claims_claiming;
  "lib/claims/commitmentLifecycle": typeof lib_claims_commitmentLifecycle;
  "lib/claims/commitmentRules": typeof lib_claims_commitmentRules;
  "lib/claims/execution": typeof lib_claims_execution;
  "lib/claims/ownership": typeof lib_claims_ownership;
  "lib/claims/submittedClaim": typeof lib_claims_submittedClaim;
  "lib/claims/unclaimAccounting": typeof lib_claims_unclaimAccounting;
  "lib/claims/unclaiming": typeof lib_claims_unclaiming;
  "lib/claims/visibility": typeof lib_claims_visibility;
  "lib/evidence/submissionEvidence": typeof lib_evidence_submissionEvidence;
  "lib/evidence/viewEvidence": typeof lib_evidence_viewEvidence;
  "lib/finance/failurePenalty": typeof lib_finance_failurePenalty;
  "lib/finance/financialProjection": typeof lib_finance_financialProjection;
  "lib/finance/payoutOverview": typeof lib_finance_payoutOverview;
  "lib/finance/payoutPeriods": typeof lib_finance_payoutPeriods;
  "lib/finance/payoutSettlement": typeof lib_finance_payoutSettlement;
  "lib/finance/pendingOutcomes": typeof lib_finance_pendingOutcomes;
  "lib/finance/periodBalance": typeof lib_finance_periodBalance;
  "lib/finance/runningBalance": typeof lib_finance_runningBalance;
  "lib/notifications/events": typeof lib_notifications_events;
  "lib/notifications/orchestration": typeof lib_notifications_orchestration;
  "lib/notifications/recipients": typeof lib_notifications_recipients;
  "lib/notifications/registration": typeof lib_notifications_registration;
  "lib/occurrences/generation": typeof lib_occurrences_generation;
  "lib/occurrences/lifecycle": typeof lib_occurrences_lifecycle;
  "lib/occurrences/maintenance": typeof lib_occurrences_maintenance;
  "lib/personal/execution": typeof lib_personal_execution;
  "lib/redos/activeForChild": typeof lib_redos_activeForChild;
  "lib/redos/deadline": typeof lib_redos_deadline;
  "lib/redos/deadlineFailure": typeof lib_redos_deadlineFailure;
  "lib/redos/submission": typeof lib_redos_submission;
  "lib/reviews/claimable": typeof lib_reviews_claimable;
  "lib/reviews/initialRejection": typeof lib_reviews_initialRejection;
  "lib/reviews/pendingClaimable": typeof lib_reviews_pendingClaimable;
  "lib/reviews/pendingPersonal": typeof lib_reviews_pendingPersonal;
  "lib/reviews/pendingRedo": typeof lib_reviews_pendingRedo;
  "lib/reviews/personal": typeof lib_reviews_personal;
  "lib/reviews/redo": typeof lib_reviews_redo;
  "lib/scheduling/choreScheduling": typeof lib_scheduling_choreScheduling;
  "lib/scheduling/householdTime": typeof lib_scheduling_householdTime;
  "migrations/claimCommitmentLocks": typeof migrations_claimCommitmentLocks;
  "migrations/financialBalances": typeof migrations_financialBalances;
  parentInvites: typeof parentInvites;
  payouts: typeof payouts;
  personalChoreReviews: typeof personalChoreReviews;
  personalChores: typeof personalChores;
  pushNotifications: typeof pushNotifications;
  redoChoreReviews: typeof redoChoreReviews;
  runningBalances: typeof runningBalances;
  "schema/childAccess": typeof schema_childAccess;
  "schema/chores": typeof schema_chores;
  "schema/claims": typeof schema_claims;
  "schema/evidence": typeof schema_evidence;
  "schema/finance": typeof schema_finance;
  "schema/households": typeof schema_households;
  "schema/notifications": typeof schema_notifications;
  "schema/redos": typeof schema_redos;
  submissionEvidence: typeof submissionEvidence;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
