import { useServerConfirmedMutation } from '@/hooks/use-server-confirmed-mutation';
import {
  useQuery,
} from 'convex/react';
import {
  useMemo,
  useState,
} from 'react';
import {
  Alert,
  Text,
  View,
} from 'react-native';

import { api } from '../../../convex/_generated/api';
import type {
  Id,
} from '../../../convex/_generated/dataModel';
import { ChildRedoRequiredCard } from './child-redo-required-card';
import { ChildSubmissionActions } from '../evidence/child-submission-actions';

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

  title:
    string;

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
      new Date(
        timestamp,
      ),
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
    case 'redo_required':
      return 0;

    case 'available':
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
      title:
        string,
      evidenceUploadIntentId?:
        Id<'submissionEvidenceUploads'>,
    ) => Promise<void>;

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
            {occurrence.title}
          </Text>

          {!compact &&
          occurrence.description ? (
            <Text className="mt-1 text-sm leading-5 text-slate-400">
              {occurrence.description}
            </Text>
          ) : null}
        </View>

        <Text className="text-base font-bold text-green-400">
          {occurrence.valueSek}{' '}
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
          Original deadline:{' '}
          {formatDeadline(
            occurrence.deadlineAt,
            occurrence.timezone,
          )}
        </Text>
      ) : null}

      {occurrence.canSubmit &&
      !compact ? (
        <ChildSubmissionActions
          occurrenceId={
            occurrence.occurrenceId
          }
          attemptNumber={
            1
          }
          disabled={
            submitting
          }
          submitting={
            submitting
          }
          submitTestID={`personal-submit-${occurrence.occurrenceId}`}
          submitLabel="I finished this"
          submittingLabel="Submitting…"
          onSubmit={async (
            evidenceUploadIntentId,
          ) => {
            await onSubmit(
              occurrence.occurrenceId,
              occurrence.title,
              evidenceUploadIntentId,
            );
          }}
        />
      ) : null}
    </View>
  );
}

export function PersonalChoresCard() {
  const occurrences =
    useQuery(
      api.personalChores.listMine,
    );

  const redos =
    useQuery(
      api.childRedos.listMine,
    );

  const submit =
    useServerConfirmedMutation(
      api.personalChores.submit,
    );

  const submitRedo =
    useServerConfirmedMutation(
      api.personalChores.submitRedo,
    );

  const [
    submittingId,
    setSubmittingId,
  ] =
    useState<
      Id<'choreOccurrences'> |
        undefined
    >(undefined);

  const redoByOccurrence =
    useMemo(
      () =>
        new Map(
          (
            redos ??
            []
          ).map(
            (
              redo,
            ) => [
              redo.occurrenceId,
              redo,
            ],
          ),
        ),
      [
        redos,
      ],
    );

  /*
   * One recurring Chore Definition may
   * already have many future concrete
   * occurrences generated.
   *
   * Child presentation behaves like one
   * responsibility lane:
   *
   * - unresolved current work first;
   * - otherwise only the next upcoming;
   * - terminal outcomes in recent history.
   */
  const presentation =
    useMemo(() => {
      if (
        !occurrences ||
        !redos
      ) {
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
            [
              occurrence,
            ],
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
          (
            left,
            right,
          ) =>
            left
              .availabilityStartsAt -
            right
              .availabilityStartsAt,
        );

        const unresolved =
          ordered.filter(
            (
              occurrence,
            ) =>
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

        const nextUpcoming =
          ordered.find(
            (
              occurrence,
            ) =>
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
        (
          left,
          right,
        ) => {
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
            (
              occurrence,
            ) =>
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
            (
              left,
              right,
            ) =>
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
      redos,
    ]);

  async function handleSubmit(
    occurrenceId:
      Id<'choreOccurrences'>,
    title:
      string,
    evidenceUploadIntentId?:
      Id<'submissionEvidenceUploads'>,
  ) {
    setSubmittingId(
      occurrenceId,
    );

    try {
      await submit({
        occurrenceId,

        evidenceUploadIntentId,
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
        error instanceof
          Error
          ? error.message
          : 'Please try again.',
      );
    } finally {
      setSubmittingId(
        undefined,
      );
    }
  }

  async function handleSubmitRedo(
    occurrenceId:
      Id<'choreOccurrences'>,
    title:
      string,
    evidenceUploadIntentId?:
      Id<'submissionEvidenceUploads'>,
  ) {
    setSubmittingId(
      occurrenceId,
    );

    try {
      await submitRedo({
        occurrenceId,

        evidenceUploadIntentId,
      });

      Alert.alert(
        'Redo submitted',
        `${title} was sent back to your parent for review.`,
      );
    } catch (
      error
    ) {
      Alert.alert(
        'Could not submit Redo',
        error instanceof
          Error
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
  } =
    presentation;

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
            ) => {
              const redo =
                redoByOccurrence.get(
                  occurrence
                    .occurrenceId,
                );

              if (
                occurrence.state ===
                  'redo_required' &&
                redo
              ) {
                return (
                  <ChildRedoRequiredCard
                    occurrenceId={
                      occurrence
                        .occurrenceId
                    }
                    key={
                      occurrence
                        .occurrenceId
                    }
                    title={
                      occurrence.title
                    }
                    description={
                      occurrence.description
                    }
                    valueSek={
                      occurrence.valueSek
                    }
                    deadlineAt={
                      redo.deadlineAt
                    }
                    timezone={
                      occurrence.timezone
                    }
                    claimRemainsActive={
                      false
                    }
                    canSubmit={
                      redo.canSubmitRedo
                    }
                    submitting={
                      submittingId ===
                      occurrence
                        .occurrenceId
                    }
                    submitTestID={`personal-redo-submit-${occurrence.occurrenceId}`}
                    onSubmit={async (
                      evidenceUploadIntentId,
                    ) => {
                      await handleSubmitRedo(
                        occurrence
                          .occurrenceId,
                        occurrence.title,
                        evidenceUploadIntentId,
                      );
                    }}
                  />
                );
              }

              return (
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
              );
            },
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
