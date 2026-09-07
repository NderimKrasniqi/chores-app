import {
  useQuery,
} from 'convex/react';
import {
  Text,
  View,
} from 'react-native';

import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

function formatClaimState(
  state:
    | 'claimed'
    | 'submitted'
    | 'redo_required'
    | 'approved'
    | 'unclaimed'
    | 'cancelled'
    | 'failed',
) {
  switch (state) {
    case 'claimed':
      return 'Claimed';

    case 'submitted':
      return 'Waiting for review';

    case 'redo_required':
      return 'Redo required';

    case 'approved':
      return 'Approved';

    case 'unclaimed':
      return 'Unclaimed';

    case 'cancelled':
      return 'Cancelled';

    case 'failed':
      return 'Failed';
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

export function ActiveClaimableClaimsCard({
  householdId,
}: {
  householdId:
    Id<'households'>;
}) {
  const claims =
    useQuery(
      api.claimableChores
        .listActiveForParent,
      {
        householdId,
      },
    );

  /*
   * Keep Parent Overview compact:
   * no loading placeholder and no
   * empty card when no active Claims
   * exist.
   */
  if (
    !claims ||
    claims.length ===
      0
  ) {
    return null;
  }

  return (
    <View className="pt-5 mt-6 border-t border-slate-800">
      <Text className="font-semibold text-white">
        Active claims
      </Text>

      <Text className="mt-1 text-sm leading-5 text-slate-500">
        Extra chores currently owned by
        Children in this household.
      </Text>

      {claims.map(
        (
          claim,
        ) => (
          <View
            key={
              claim.claimId
            }
            className="p-4 mt-3 rounded-xl bg-slate-800"
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="font-semibold text-white">
                  {
                    claim.title
                  }
                </Text>

                <Text className="mt-1 text-sm text-slate-300">
                  Claimed by{' '}
                  {
                    claim.claimedByDisplayName
                  }
                </Text>
              </View>

              <Text className="font-bold text-green-400">
                {
                  claim.valueSek
                }{' '}
                kr
              </Text>
            </View>

            <Text className="mt-2 text-xs text-slate-500">
              Status:{' '}
              {formatClaimState(
                claim.claimState,
              )}
            </Text>

            <Text className="mt-1 text-xs text-slate-500">
              Deadline:{' '}
              {formatDeadline(
                claim.deadlineAt,
                claim.timezone,
              )}
            </Text>
          </View>
        ),
      )}
    </View>
  );
}
