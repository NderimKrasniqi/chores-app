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
import { RedoChoreReviewsView } from './redo-chore-reviews-view';

export function RedoChoreReviewsCard({
  householdId,
}: {
  householdId:
    Id<'households'>;
}) {
  const pending =
    useQuery(
      api
        .redoChoreReviews
        .listPending,
      {
        householdId,
      },
    );

  const approvePersonal =
    useMutation(
      api
        .personalChoreReviews
        .approveRedo,
    );

  const rejectPersonal =
    useMutation(
      api
        .personalChoreReviews
        .rejectRedo,
    );

  const approveClaimable =
    useMutation(
      api
        .claimableChoreReviews
        .approveRedo,
    );

  const rejectClaimable =
    useMutation(
      api
        .claimableChoreReviews
        .rejectRedo,
    );

  if (
    pending ===
    undefined
  ) {
    return (
      <View className="pt-6 mt-6 border-t border-slate-800">
        <Text className="text-lg font-semibold text-white">
          Redo reviews
        </Text>

        <Text className="mt-2 text-sm text-slate-500">
          Loading Redo submissions…
        </Text>
      </View>
    );
  }

  return (
    <RedoChoreReviewsView
      pending={
        pending
      }
      onApprove={async (
        submission,
      ) => {
        if (
          submission.kind ===
          'personal'
        ) {
          return await approvePersonal({
            submissionId:
              submission
                .submissionId,
          });
        }

        return await approveClaimable({
          submissionId:
            submission
              .submissionId,
        });
      }}
      onReject={async (
        submission,
      ) => {
        if (
          submission.kind ===
          'personal'
        ) {
          return await rejectPersonal({
            submissionId:
              submission
                .submissionId,
          });
        }

        return await rejectClaimable({
          submissionId:
            submission
              .submissionId,
        });
      }}
    />
  );
}
