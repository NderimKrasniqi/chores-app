import { ConvexError } from "convex/values";

/**
 * Words a person can read. A ConvexError carries the server's own sentence
 * in `data`; its `message` (and any other server error) is wrapped in
 * request ids and stack noise, so those fall back to the caller's copy.
 */
export function userErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ConvexError) {
    return typeof error.data === "string" && error.data ? error.data : fallback;
  }
  if (
    error instanceof Error &&
    error.message &&
    !/\[CONVEX|\[Request ID|Server Error/.test(error.message)
  ) {
    return error.message;
  }
  return fallback;
}
