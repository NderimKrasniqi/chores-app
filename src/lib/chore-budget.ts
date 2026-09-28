import {
  addLocalDays,
  matchesRecurrenceOnDate,
} from "../../convex/lib/scheduling/choreScheduling";
import type { Definition } from "@/components/chores/parent-chores-content";

export type PlannedChore = {
  definition: Definition;
  localDate: string;
};

/**
 * The next `days` household-local dates from `today`, and which chores fall
 * on each — decided by the same recurrence rule the server schedules with,
 * so the board and the budget match what the kids will actually get.
 */
export function planDays(
  definitions: Definition[],
  today: string,
  days = 7,
): { localDate: string; chores: PlannedChore[] }[] {
  return Array.from({ length: days }, (_, i) => {
    const localDate = addLocalDays(today, i);
    return {
      localDate,
      chores: definitions
        .filter((definition) => {
          try {
            return matchesRecurrenceOnDate(definition.recurrence, localDate);
          } catch {
            return false;
          }
        })
        .map((definition) => ({ definition, localDate })),
    };
  });
}

/**
 * What the plan can pay out over those days: every kid's own chores in full
 * ("up to" — a missed chore pays nothing) and, separately, the Extras pool
 * (first come, first served, so it's a ceiling, not a promise).
 */
export function planBudget(plan: ReturnType<typeof planDays>) {
  let personal = 0;
  let extras = 0;
  for (const day of plan) {
    for (const { definition } of day.chores) {
      if (definition.kind === "claimable") extras += definition.valueSek;
      else personal += definition.valueSek;
    }
  }
  return { personal, extras };
}
