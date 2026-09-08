import {
  resolveLocalDateTimeToEpochMs,
} from '../scheduling/choreScheduling';

export type ResolveRedoDeadlineInput = {
  deadlineLocalDate:
    string;

  deadlineLocalTime:
    string;

  timezone:
    string;

  /*
   * Authoritative server time of the
   * Parent rejection decision.
   */
  reviewedAt:
    number;
};

export type ResolvedRedoDeadline = {
  deadlineLocalDate:
    string;

  deadlineLocalTime:
    string;

  deadlineAt:
    number;
};

/*
 * Resolve a Parent-selected wall-clock
 * Redo deadline in the immutable
 * Chore Occurrence timezone.
 *
 * The new deadline must be strictly after
 * the rejection decision. At the exact
 * review instant there is no usable Redo
 * window, so equality is invalid.
 */
export function resolveRedoDeadline(
  input:
    ResolveRedoDeadlineInput,
): ResolvedRedoDeadline {
  if (
    !Number.isFinite(
      input.reviewedAt,
    )
  ) {
    throw new Error(
      'Review time must be a finite timestamp.',
    );
  }

  const deadlineAt =
    resolveLocalDateTimeToEpochMs(
      input
        .deadlineLocalDate,

      input
        .deadlineLocalTime,

      input.timezone,
    );

  if (
    deadlineAt <=
    input.reviewedAt
  ) {
    throw new Error(
      'Redo deadline must be after the Parent review decision.',
    );
  }

  return {
    deadlineLocalDate:
      input
        .deadlineLocalDate,

    deadlineLocalTime:
      input
        .deadlineLocalTime,

    deadlineAt,
  };
}
