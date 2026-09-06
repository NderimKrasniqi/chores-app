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
import type * as choreDefinitions from "../choreDefinitions.js";
import type * as health from "../health.js";
import type * as households from "../households.js";
import type * as http from "../http.js";
import type * as parentInvites from "../parentInvites.js";
import type * as schema_childAccess from "../schema/childAccess.js";
import type * as schema_chores from "../schema/chores.js";
import type * as schema_households from "../schema/households.js";
import type * as task06SmokeTests from "../task06SmokeTests.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  childAccess: typeof childAccess;
  childPairing: typeof childPairing;
  choreDefinitions: typeof choreDefinitions;
  health: typeof health;
  households: typeof households;
  http: typeof http;
  parentInvites: typeof parentInvites;
  "schema/childAccess": typeof schema_childAccess;
  "schema/chores": typeof schema_chores;
  "schema/households": typeof schema_households;
  task06SmokeTests: typeof task06SmokeTests;
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
