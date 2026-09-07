import {
  useMutation,
  useQuery,
} from 'convex/react';
import {
  useMemo,
  useState,
} from 'react';
import {
  Alert,
  Pressable,
  Text,
  View,
} from 'react-native';

import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

type OccurrenceState =
  | 'scheduled'
  | 'available'
  | 'submitted'
  | 'redo_required'
  | 'approved'
  | 'missed'
  | 'failed'
  | 'cancelled'
  | 'expired_unclaimed';

type PersonalChoreOccurrence = {
  occurrenceId:
    Id<'choreOccurrences'>;

  choreDefinitionId:
    Id<'choreDefinitions'>;

  title: string;

  description?:
    string;

  valueSek:
    number;

  scheduledLocalDate:
    string;

  timezone:
    string;

  availabilityStartsAt:
    number;

  deadlineAt:
    number;

  state:
    OccurrenceState;

  isUnlockChore:
    boolean;

  canSubmit:
    boolean;
};

function formatState(
  state: OccurrenceState,
) {
  switch (state) {
    case 'scheduled':
      return 'Upcoming';

    case 'available':
      return 'Ready';

    case 'submitted':
      return 'Waiting for parent';

    case 'approved':
      return 'Approved';

    case 'missed':
      return 'Missed';

    case 'redo_required':
      return 'Redo required';

    case 'failed':
      return 'Failed';

    case 'cancelled':
      return 'Cancelled';

    case 'expired_unclaimed':
      return 'Expired';
  }
}

function formatDeadline(
  timestamp: number,
  timezone: string,
) {
  try {
    return new Intl.DateTimeFormat(
      'en-SE',
      {
        timeZone:
          timezone,

        dateStyle:
          'medium',

        timeStyle:
          'short',
      },
    ).format(
      new Date(timestamp),
    );
  } catch {
    return new Date(
      timestamp,
    ).toLocaleString();
  }
}

function statePriority(
  state: OccurrenceState,
) {
  switch (state) {
    case 'available':
      return 0;

    case 'redo_required':
      return 1;

    case 'submitted':
      return 2;

    case 'scheduled':
      return 3;

    default:
      return 4;
  }
}

function ChoreCard({
  occurrence,
  submitting,
  onSubmit,
  compact = false,
}: {
  occurrence:
    PersonalChoreOccurrence;

  submitting:
    boolean;

  onSubmit:
    (
      occurrenceId:
        Id<'choreOccurrences'>,
      title: string,
    ) => void;

  compact?:
    boolean;
}) {
  return (
    <View
      className={
        compact
          ? 'p-4 mb-3 rounded-xl bg-slate-950'
          : 'p-4 mb-3 border rounded-xl border-slate-800 bg-slate-950'
      }
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-base font-semibold text-white">
            {
              occurrence.title
            }
          </Text>

          {!compact &&
          occurrence.description ? (
            <Text className="mt-1 text-sm leading-5 text-slate-400">
              {
                occurrence.description
              }
            </Text>
          ) : null}
        </View>

        <Text className="text-base font-bold text-green-400">
          {
            occurrence.valueSek
          }{' '}
          kr
        </Text>
      </View>

      {occurrence.isUnlockChore &&
      !compact ? (
        <View className="self-start px-2 py-1 mt-3 rounded-lg bg-amber-950">
          <Text className="text-xs font-semibold text-amber-400">
            Unlock chore
          </Text>
        </View>
      ) : null}

      <Text className="mt-3 text-sm font-medium text-slate-300">
        {formatState(
          occurrence.state,
        )}
      </Text>

      <Text className="mt-1 text-xs leading-5 text-slate-500">
        Scheduled:{' '}
        {
          occurrence.scheduledLocalDate
        }
      </Text>

      {!compact ? (
        <Text className="text-xs leading-5 text-slate-500">
          Deadline:{' '}
          {formatDeadline(
            occurrence.deadlineAt,
            occurrence.timezone,
          )}
        </Text>
      ) : null}

      {occurrence.canSubmit &&
      !compact ? (
        <Pressable
          className={
            submitting
              ? 'px-4 py-3 mt-4 rounded-xl bg-slate-700'
              : 'px-4 py-3 mt-4 bg-white rounded-xl'
          }
          disabled={
            submitting
          }
          onPress={() =>
            onSubmit(
              occurrence.occurrenceId,
              occurrence.title,
            )
          }
        >
          <Text
            className={
              submitting
                ? 'font-semibold text-center text-slate-400'
                : 'font-semibold text-center text-slate-950'
            }
          >
            {submitting
              ? 'Submitting…'
              : 'I finished this'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function PersonalChoresCard() {
  const occurrences =
    useQuery(
      api.personalChores.listMine,
    );

  const submit =
    useMutation(
      api.personalChores.submit,
    );

  const [
    submittingId,
    setSubmittingId,
  ] = useState<
    Id<'choreOccurrences'> |
      undefined
  >(undefined);

  /*
   * One recurring Chore Definition may
   * already have many future concrete
   * occurrences generated.
   *
   * Child presentation should behave
   * like one responsibility lane:
   *
   * - show unresolved current work;
   * - otherwise show only the next
   *   upcoming occurrence;
   * - keep terminal outcomes in a
   *   small recent-history section.
   */
  const presentation =
    useMemo(() => {
      if (!occurrences) {
        return undefined;
      }

      const typedOccurrences =
        occurrences as
          PersonalChoreOccurrence[];

      const groups =
        new Map<
          Id<'choreDefinitions'>,
          PersonalChoreOccurrence[]
        >();

      for (
        const occurrence of
        typedOccurrences
      ) {
        const existing =
          groups.get(
            occurrence
              .choreDefinitionId,
          );

        if (existing) {
          existing.push(
            occurrence,
          );
        } else {
          groups.set(
            occurrence
              .choreDefinitionId,
            [occurrence],
          );
        }
      }

      const currentAndNext:
        PersonalChoreOccurrence[] =
        [];

      for (
        const group of
        groups.values()
      ) {
        const ordered = [
          ...group,
        ].sort(
          (left, right) =>
            left
              .availabilityStartsAt -
            right
              .availabilityStartsAt,
        );

        /*
         * Overlapping unresolved
         * occurrences are valid domain
         * state, so show all of them.
         */
        const unresolved =
          ordered.filter(
            (occurrence) =>
              occurrence.state ===
                'available' ||
              occurrence.state ===
                'submitted' ||
              occurrence.state ===
                'redo_required',
          );

        if (
          unresolved.length >
          0
        ) {
          currentAndNext.push(
            ...unresolved,
          );

          continue;
        }

        /*
         * No current work for this
         * definition: show only the
         * nearest future occurrence.
         */
        const nextUpcoming =
          ordered.find(
            (occurrence) =>
              occurrence.state ===
              'scheduled',
          );

        if (nextUpcoming) {
          currentAndNext.push(
            nextUpcoming,
          );
        }
      }

      currentAndNext.sort(
        (left, right) => {
          const priorityDifference =
            statePriority(
              left.state,
            ) -
            statePriority(
              right.state,
            );

          if (
            priorityDifference !==
            0
          ) {
            return priorityDifference;
          }

          return (
            left
              .availabilityStartsAt -
            right
              .availabilityStartsAt
          );
        },
      );

      const recentHistory =
        typedOccurrences
          .filter(
            (occurrence) =>
              occurrence.state ===
                'approved' ||
              occurrence.state ===
                'missed' ||
              occurrence.state ===
                'failed' ||
              occurrence.state ===
                'cancelled',
          )
          .sort(
            (left, right) =>
              right
                .availabilityStartsAt -
              left
                .availabilityStartsAt,
          )
          .slice(
            0,
            3,
          );

      return {
        currentAndNext,
        recentHistory,
      };
    }, [
      occurrences,
    ]);

  async function handleSubmit(
    occurrenceId:
      Id<'choreOccurrences'>,
    title: string,
  ) {
    setSubmittingId(
      occurrenceId,
    );

    try {
      await submit({
        occurrenceId,
      });

      Alert.alert(
        'Submitted',
        `${title} was sent to your parent for review.`,
      );
    } catch (
      error
    ) {
      Alert.alert(
        'Could not submit',
        error instanceof Error
          ? error.message
          : 'Please try again.',
      );
    } finally {
      setSubmittingId(
        undefined,
      );
    }
  }

  if (
    presentation ===
    undefined
  ) {
    return (
      <View className="p-5 mt-4 rounded-2xl bg-slate-900">
        <Text className="font-semibold text-white">
          Personal chores
        </Text>

        <Text className="mt-2 text-sm text-slate-500">
          Loading chores…
        </Text>
      </View>
    );
  }

  const {
    currentAndNext,
    recentHistory,
  } = presentation;

  return (
    <View className="p-5 mt-4 rounded-2xl bg-slate-900">
      <Text className="text-lg font-semibold text-white">
        Personal chores
      </Text>

      <Text className="mt-1 text-sm leading-5 text-slate-500">
        What needs your attention now,
        plus your next upcoming
        responsibility.
      </Text>

      {currentAndNext.length ===
      0 ? (
        <View className="p-4 mt-4 rounded-xl bg-slate-950">
          <Text className="font-semibold text-white">
            Nothing coming up
          </Text>

          <Text className="mt-1 text-sm text-slate-500">
            You have no active or
            upcoming Personal Chores.
          </Text>
        </View>
      ) : (
        <View className="mt-4">
          {currentAndNext.map(
            (
              occurrence,
            ) => (
              <ChoreCard
                key={
                  occurrence
                    .occurrenceId
                }
                occurrence={
                  occurrence
                }
                submitting={
                  submittingId ===
                  occurrence
                    .occurrenceId
                }
                onSubmit={
                  handleSubmit
                }
              />
            ),
          )}
        </View>
      )}

      {recentHistory.length >
      0 ? (
        <View className="pt-5 mt-3 border-t border-slate-800">
          <Text className="font-semibold text-white">
            Recent
          </Text>

          <Text className="mt-1 mb-3 text-xs text-slate-500">
            Latest completed or missed
            Personal Chores.
          </Text>

          {recentHistory.map(
            (
              occurrence,
            ) => (
              <ChoreCard
                key={
                  occurrence
                    .occurrenceId
                }
                occurrence={
                  occurrence
                }
                submitting={
                  false
                }
                onSubmit={
                  handleSubmit
                }
                compact
              />
            ),
          )}
        </View>
      ) : null}
    </View>
  );
}
