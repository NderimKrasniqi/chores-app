import type { Id } from "../../../convex/_generated/dataModel";

export type PayoutWeekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type HouseholdSummary = {
  householdId: Id<"households">;

  name: string;

  timezone: string;

  payoutWeekday: PayoutWeekday;

  weeklyUnclaimAllowance: number;

  parents: {
    membershipId: Id<"householdMembers">;

    displayName: string;

    isCurrent: boolean;
  }[];

  children: {
    childId: Id<"children">;

    displayName: string;
  }[];
};
