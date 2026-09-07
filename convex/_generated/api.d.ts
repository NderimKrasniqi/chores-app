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
import type * as lib_householdTime from "../lib/householdTime.js";
import type * as lib_initialChoreRejection from "../lib/initialChoreRejection.js";
import type * as lib_parentAuthorization from "../lib/parentAuthorization.js";
import type * as lib_personalChoreExecution from "../lib/personalChoreExecution.js";
import type * as lib_personalChoreReview from "../lib/personalChoreReview.js";
import type * as lib_redoChoreReview from "../lib/redoChoreReview.js";
import type * as lib_redoDeadline from "../lib/redoDeadline.js";
import type * as lib_redoDeadlineFailure from "../lib/redoDeadlineFailure.js";
import type * as lib_redoSubmission from "../lib/redoSubmission.js";
import type * as parentInvites from "../parentInvites.js";
import type * as personalChoreReviews from "../personalChoreReviews.js";
import type * as personalChores from "../personalChores.js";
import type * as redoChoreReviews from "../redoChoreReviews.js";
import type * as redoDeadlineTransitions from "../redoDeadlineTransitions.js";
import type * as schema_childAccess from "../schema/childAccess.js";
import type * as schema_chores from "../schema/chores.js";
import type * as schema_claims from "../schema/claims.js";
import type * as schema_households from "../schema/households.js";
import type * as schema_redos from "../schema/redos.js";
import type * as task06SmokeTests from "../task06SmokeTests.js";
import type * as task07MaintenanceIsolationSmokeTests from "../task07MaintenanceIsolationSmokeTests.js";
import type * as task07MaintenanceSmokeTests from "../task07MaintenanceSmokeTests.js";
import type * as task07OccurrenceSmokeTests from "../task07OccurrenceSmokeTests.js";
import type * as task07SchedulingSmokeTests from "../task07SchedulingSmokeTests.js";
import type * as task08ApprovalSmokeTests from "../task08ApprovalSmokeTests.js";
import type * as task08MissSmokeTests from "../task08MissSmokeTests.js";
import type * as task08SubmissionSmokeTests from "../task08SubmissionSmokeTests.js";
import type * as task09ClaimableVisibilitySmokeTests from "../task09ClaimableVisibilitySmokeTests.js";
import type * as task09UnlockGateSmokeTests from "../task09UnlockGateSmokeTests.js";
import type * as task10ClaimDeadlineSmokeTests from "../task10ClaimDeadlineSmokeTests.js";
import type * as task10ClaimSmokeTests from "../task10ClaimSmokeTests.js";
import type * as task10ClaimVisibilitySmokeTests from "../task10ClaimVisibilitySmokeTests.js";
import type * as task11ClaimWarningSmokeTests from "../task11ClaimWarningSmokeTests.js";
import type * as task11CommitmentRulesSmokeTests from "../task11CommitmentRulesSmokeTests.js";
import type * as task11ParentCancellationSmokeTests from "../task11ParentCancellationSmokeTests.js";
import type * as task11UnclaimAccountingSmokeTests from "../task11UnclaimAccountingSmokeTests.js";
import type * as task11UnclaimSmokeTests from "../task11UnclaimSmokeTests.js";
import type * as task12ClaimableApprovalSmokeTests from "../task12ClaimableApprovalSmokeTests.js";
import type * as task12ClaimableSubmissionSmokeTests from "../task12ClaimableSubmissionSmokeTests.js";
import type * as task13InitialRejectionSmokeTests from "../task13InitialRejectionSmokeTests.js";
import type * as task13RedoDeadlineFailureSmokeTests from "../task13RedoDeadlineFailureSmokeTests.js";
import type * as task13RedoDeadlineSmokeTests from "../task13RedoDeadlineSmokeTests.js";
import type * as task13RedoReviewSmokeTests from "../task13RedoReviewSmokeTests.js";
import type * as task13RedoSubmissionSmokeTests from "../task13RedoSubmissionSmokeTests.js";
import type * as task13ReviewAuthorityFixtures from "../task13ReviewAuthorityFixtures.js";
import type * as task13ReviewAuthoritySmokeTests from "../task13ReviewAuthoritySmokeTests.js";

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
  "lib/householdTime": typeof lib_householdTime;
  "lib/initialChoreRejection": typeof lib_initialChoreRejection;
  "lib/parentAuthorization": typeof lib_parentAuthorization;
  "lib/personalChoreExecution": typeof lib_personalChoreExecution;
  "lib/personalChoreReview": typeof lib_personalChoreReview;
  "lib/redoChoreReview": typeof lib_redoChoreReview;
  "lib/redoDeadline": typeof lib_redoDeadline;
  "lib/redoDeadlineFailure": typeof lib_redoDeadlineFailure;
  "lib/redoSubmission": typeof lib_redoSubmission;
  parentInvites: typeof parentInvites;
  personalChoreReviews: typeof personalChoreReviews;
  personalChores: typeof personalChores;
  redoChoreReviews: typeof redoChoreReviews;
  redoDeadlineTransitions: typeof redoDeadlineTransitions;
  "schema/childAccess": typeof schema_childAccess;
  "schema/chores": typeof schema_chores;
  "schema/claims": typeof schema_claims;
  "schema/households": typeof schema_households;
  "schema/redos": typeof schema_redos;
  task06SmokeTests: typeof task06SmokeTests;
  task07MaintenanceIsolationSmokeTests: typeof task07MaintenanceIsolationSmokeTests;
  task07MaintenanceSmokeTests: typeof task07MaintenanceSmokeTests;
  task07OccurrenceSmokeTests: typeof task07OccurrenceSmokeTests;
  task07SchedulingSmokeTests: typeof task07SchedulingSmokeTests;
  task08ApprovalSmokeTests: typeof task08ApprovalSmokeTests;
  task08MissSmokeTests: typeof task08MissSmokeTests;
  task08SubmissionSmokeTests: typeof task08SubmissionSmokeTests;
  task09ClaimableVisibilitySmokeTests: typeof task09ClaimableVisibilitySmokeTests;
  task09UnlockGateSmokeTests: typeof task09UnlockGateSmokeTests;
  task10ClaimDeadlineSmokeTests: typeof task10ClaimDeadlineSmokeTests;
  task10ClaimSmokeTests: typeof task10ClaimSmokeTests;
  task10ClaimVisibilitySmokeTests: typeof task10ClaimVisibilitySmokeTests;
  task11ClaimWarningSmokeTests: typeof task11ClaimWarningSmokeTests;
  task11CommitmentRulesSmokeTests: typeof task11CommitmentRulesSmokeTests;
  task11ParentCancellationSmokeTests: typeof task11ParentCancellationSmokeTests;
  task11UnclaimAccountingSmokeTests: typeof task11UnclaimAccountingSmokeTests;
  task11UnclaimSmokeTests: typeof task11UnclaimSmokeTests;
  task12ClaimableApprovalSmokeTests: typeof task12ClaimableApprovalSmokeTests;
  task12ClaimableSubmissionSmokeTests: typeof task12ClaimableSubmissionSmokeTests;
  task13InitialRejectionSmokeTests: typeof task13InitialRejectionSmokeTests;
  task13RedoDeadlineFailureSmokeTests: typeof task13RedoDeadlineFailureSmokeTests;
  task13RedoDeadlineSmokeTests: typeof task13RedoDeadlineSmokeTests;
  task13RedoReviewSmokeTests: typeof task13RedoReviewSmokeTests;
  task13RedoSubmissionSmokeTests: typeof task13RedoSubmissionSmokeTests;
  task13ReviewAuthorityFixtures: typeof task13ReviewAuthorityFixtures;
  task13ReviewAuthoritySmokeTests: typeof task13ReviewAuthoritySmokeTests;
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
