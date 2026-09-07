import {
  useMutation,
  useQuery,
} from 'convex/react';
import {
  Text,
  View,
} from 'react-native';

import { api } from '../../../convex/_generated/api';
import type {
  Id,
} from '../../../convex/_generated/dataModel';
import { ClaimableChoreReviewsView } from './claimable-chore-reviews-view';

type ClaimableChoreReviewsCardProps = {
  householdId:
    Id<'households'>;
};

export function ClaimableChoreReviewsCard({
  householdId,
}: ClaimableChoreReviewsCardProps) {
  const pending =
    useQuery(
      api
        .claimableChoreReviews
        .listPending,
      {
        householdId,
      },
    );

  const approve =
    useMutation(
      api
        .claimableChoreReviews
        .approve,
    );

  const reject =
    useMutation(
      api
        .claimableChoreReviews
        .reject,
    );

  if (
    pending ===
    undefined
  ) {
    return (
      <View className="pt-6 mt-6 border-t border-slate-800">
        <Text className="text-lg font-semibold text-white">
          Claimable chore reviews
        </Text>

        <Text className="mt-2 text-sm text-slate-500">
          Loading submissions…
        </Text>
      </View>
    );
  }

  return (
    <ClaimableChoreReviewsView
      pending={
        pending
      }
      onApprove={async (
        submissionId,
      ) => {
        return await approve({
          submissionId,
        });
      }}
      onReject={async (
        submissionId,
        redoDeadlineLocalDate,
        redoDeadlineLocalTime,
      ) => {
        return await reject({
          submissionId,

          redoDeadlineLocalDate,

          redoDeadlineLocalTime,
        });
      }}
    />
  );
}
