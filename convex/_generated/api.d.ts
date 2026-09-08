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
import type * as choreOccurrenceMaintenance from "../choreOccurrenceMaintenance.js";
import type * as choreOccurrenceTransitions from "../choreOccurrenceTransitions.js";
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
import type * as health from "../health.js";
import type * as households from "../households.js";
import type * as http from "../http.js";
import type * as lib_childAuthorization from "../lib/childAuthorization.js";
import type * as lib_choreOccurrenceGeneration from "../lib/choreOccurrenceGeneration.js";
import type * as lib_choreOccurrenceLifecycle from "../lib/choreOccurrenceLifecycle.js";
import type * as lib_choreOccurrenceMaintenance from "../lib/choreOccurrenceMaintenance.js";
import type * as lib_choreScheduling from "../lib/choreScheduling.js";
import type * as lib_claimCommitmentRules from "../lib/claimCommitmentRules.js";
import type * as lib_claimOwnership from "../lib/claimOwnership.js";
import type * as lib_claimUnclaimAccounting from "../lib/claimUnclaimAccounting.js";
import type * as lib_claimableAccessGate from "../lib/claimableAccessGate.js";
import type * as lib_claimableChoreCancellation from "../lib/claimableChoreCancellation.js";
import type * as lib_claimableChoreClaiming from "../lib/claimableChoreClaiming.js";
import type * as lib_claimableChoreExecution from "../lib/claimableChoreExecution.js";
import type * as lib_claimableChoreReview from "../lib/claimableChoreReview.js";
import type * as lib_claimableChoreUnclaiming from "../lib/claimableChoreUnclaiming.js";
import type * as lib_claimableChoreVisibility from "../lib/claimableChoreVisibility.js";
import type * as lib_claimableFailurePenalty from "../lib/claimableFailurePenalty.js";
import type * as lib_householdTime from "../lib/householdTime.js";
import type * as lib_initialChoreRejection from "../lib/initialChoreRejection.js";
import type * as lib_parentAuthorization from "../lib/parentAuthorization.js";
import type * as lib_personalChoreExecution from "../lib/personalChoreExecution.js";
import type * as lib_personalChoreReview from "../lib/personalChoreReview.js";
import type * as lib_redoChoreReview from "../lib/redoChoreReview.js";
import type * as lib_redoDeadline from "../lib/redoDeadline.js";
import type * as lib_redoDeadlineFailure from "../lib/redoDeadlineFailure.js";
import type * as lib_redoSubmission from "../lib/redoSubmission.js";
import type * as lib_runningBalance from "../lib/runningBalance.js";
import type * as parentInvites from "../parentInvites.js";
import type * as personalChoreReviews from "../personalChoreReviews.js";
import type * as personalChores from "../personalChores.js";
import type * as redoChoreReviews from "../redoChoreReviews.js";
import type * as redoDeadlineTransitions from "../redoDeadlineTransitions.js";
import type * as runningBalances from "../runningBalances.js";
import type * as schema_childAccess from "../schema/childAccess.js";
import type * as schema_chores from "../schema/chores.js";
import type * as schema_claims from "../schema/claims.js";
import type * as schema_households from "../schema/households.js";
import type * as schema_redos from "../schema/redos.js";

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
  choreOccurrenceMaintenance: typeof choreOccurrenceMaintenance;
  choreOccurrenceTransitions: typeof choreOccurrenceTransitions;
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
  health: typeof health;
  households: typeof households;
  http: typeof http;
  "lib/childAuthorization": typeof lib_childAuthorization;
  "lib/choreOccurrenceGeneration": typeof lib_choreOccurrenceGeneration;
  "lib/choreOccurrenceLifecycle": typeof lib_choreOccurrenceLifecycle;
  "lib/choreOccurrenceMaintenance": typeof lib_choreOccurrenceMaintenance;
  "lib/choreScheduling": typeof lib_choreScheduling;
  "lib/claimCommitmentRules": typeof lib_claimCommitmentRules;
  "lib/claimOwnership": typeof lib_claimOwnership;
  "lib/claimUnclaimAccounting": typeof lib_claimUnclaimAccounting;
  "lib/claimableAccessGate": typeof lib_claimableAccessGate;
  "lib/claimableChoreCancellation": typeof lib_claimableChoreCancellation;
  "lib/claimableChoreClaiming": typeof lib_claimableChoreClaiming;
  "lib/claimableChoreExecution": typeof lib_claimableChoreExecution;
  "lib/claimableChoreReview": typeof lib_claimableChoreReview;
  "lib/claimableChoreUnclaiming": typeof lib_claimableChoreUnclaiming;
  "lib/claimableChoreVisibility": typeof lib_claimableChoreVisibility;
  "lib/claimableFailurePenalty": typeof lib_claimableFailurePenalty;
  "lib/householdTime": typeof lib_householdTime;
  "lib/initialChoreRejection": typeof lib_initialChoreRejection;
  "lib/parentAuthorization": typeof lib_parentAuthorization;
  "lib/personalChoreExecution": typeof lib_personalChoreExecution;
  "lib/personalChoreReview": typeof lib_personalChoreReview;
  "lib/redoChoreReview": typeof lib_redoChoreReview;
  "lib/redoDeadline": typeof lib_redoDeadline;
  "lib/redoDeadlineFailure": typeof lib_redoDeadlineFailure;
  "lib/redoSubmission": typeof lib_redoSubmission;
  "lib/runningBalance": typeof lib_runningBalance;
  parentInvites: typeof parentInvites;
  personalChoreReviews: typeof personalChoreReviews;
  personalChores: typeof personalChores;
  redoChoreReviews: typeof redoChoreReviews;
  redoDeadlineTransitions: typeof redoDeadlineTransitions;
  runningBalances: typeof runningBalances;
  "schema/childAccess": typeof schema_childAccess;
  "schema/chores": typeof schema_chores;
  "schema/claims": typeof schema_claims;
  "schema/households": typeof schema_households;
  "schema/redos": typeof schema_redos;
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
