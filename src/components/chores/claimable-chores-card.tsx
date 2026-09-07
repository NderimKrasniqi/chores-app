import {
  useQuery,
} from 'convex/react';
import {
  Text,
  View,
} from 'react-native';

import { api } from '../../../convex/_generated/api';

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

function formatUnlockState(
  state:
    | 'scheduled'
    | 'available'
    | 'submitted'
    | 'redo_required'
    | 'approved'
    | 'missed'
    | 'failed'
    | 'cancelled'
    | 'expired_unclaimed',
) {
  switch (state) {
    case 'scheduled':
      return 'Upcoming';

    case 'available':
      return 'Waiting for completion';

    case 'submitted':
      return 'Waiting for parent approval';

    case 'redo_required':
      return 'Redo required';

    case 'approved':
      return 'Approved';

    case 'missed':
      return 'Missed';

    case 'failed':
      return 'Failed';

    case 'cancelled':
      return 'Cancelled';

    case 'expired_unclaimed':
      return 'Expired';
  }
}

export function ClaimableChoresCard() {
  const result =
    useQuery(
      api.claimableChores.listMine,
    );

  if (
    result ===
    undefined
  ) {
    return (
      <View className="p-5 mt-4 rounded-2xl bg-slate-900">
        <Text className="text-lg font-semibold text-white">
          Extra chores
        </Text>

        <Text className="mt-2 text-sm text-slate-500">
          Loading Claimable Chores…
        </Text>
      </View>
    );
  }

  const {
    gate,
    claimableOccurrences,
  } = result;

  /*
   * The backend already returns zero
   * Claimable occurrence data while
   * this gate is closed.
   *
   * This UI only explains that
   * server-authoritative decision.
   */
  if (
    !gate.canAccessClaimables
  ) {
    return (
      <View className="p-5 mt-4 border rounded-2xl border-amber-900 bg-slate-900">
        <Text className="text-lg font-semibold text-white">
          Extra chores
        </Text>

        <View className="self-start px-2 py-1 mt-3 rounded-lg bg-amber-950">
          <Text className="text-xs font-semibold text-amber-400">
            Locked
          </Text>
        </View>

        <Text className="mt-3 text-sm leading-5 text-slate-400">
          Your current Unlock Chore
          must be approved by a parent
          before extra chores become
          available.
        </Text>

        {gate.currentUnlockOccurrence ? (
          <View className="p-4 mt-4 rounded-xl bg-slate-950">
            <Text className="text-sm font-semibold text-white">
              Current Unlock Chore
            </Text>

            <Text className="mt-2 text-sm text-slate-400">
              Status:{' '}
              {formatUnlockState(
                gate
                  .currentUnlockOccurrence
                  .state,
              )}
            </Text>

            <Text className="mt-1 text-xs text-slate-500">
              Scheduled:{' '}
              {
                gate
                  .currentUnlockOccurrence
                  .scheduledLocalDate
              }
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View className="p-5 mt-4 rounded-2xl bg-slate-900">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-lg font-semibold text-white">
            Extra chores
          </Text>

          <Text className="mt-1 text-sm leading-5 text-slate-500">
            Claimable Chores currently
            available to you.
          </Text>
        </View>

        <View className="px-2 py-1 rounded-lg bg-green-950">
          <Text className="text-xs font-semibold text-green-400">
            Unlocked
          </Text>
        </View>
      </View>

      {claimableOccurrences.length ===
      0 ? (
        <View className="p-4 mt-4 rounded-xl bg-slate-950">
          <Text className="font-semibold text-white">
            Nothing available
          </Text>

          <Text className="mt-1 text-sm leading-5 text-slate-500">
            There are no eligible
            Claimable Chores available
            right now.
          </Text>
        </View>
      ) : (
        <View className="mt-4">
          {claimableOccurrences.map(
            (
              occurrence,
            ) => (
              <View
                key={
                  occurrence.occurrenceId
                }
                className="p-4 mb-3 border rounded-xl border-slate-800 bg-slate-950"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-base font-semibold text-white">
                      {
                        occurrence.title
                      }
                    </Text>

                    {occurrence.description ? (
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

                <Text className="mt-3 text-sm font-medium text-slate-300">
                  Available
                </Text>

                <Text className="mt-1 text-xs leading-5 text-slate-500">
                  Deadline:{' '}
                  {formatDeadline(
                    occurrence.deadlineAt,
                    occurrence.timezone,
                  )}
                </Text>
              </View>
            ),
          )}
        </View>
      )}
    </View>
  );
}
