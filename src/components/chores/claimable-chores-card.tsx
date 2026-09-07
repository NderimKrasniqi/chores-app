import {
  useMutation,
  useQuery,
} from 'convex/react';
import {
  Text,
  View,
} from 'react-native';

import { api } from '../../../convex/_generated/api';
import { ClaimableChoresView } from './claimable-chores-view';

export function ClaimableChoresCard() {
  const result =
    useQuery(
      api.claimableChores.listMine,
    );

  const claim =
    useMutation(
      api.claimableChores.claim,
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

  return (
    <ClaimableChoresView
      result={
        result
      }
      onClaim={async (
        occurrenceId,
      ) => {
        await claim({
          occurrenceId,
        });
      }}
    />
  );
}
