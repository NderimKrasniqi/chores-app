import {
  useMutation,
  useQuery,
} from 'convex/react';
import {
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
import { ClaimableChoresView } from './claimable-chores-view';

export function ClaimableChoresCard() {
  const result =
    useQuery(
      api.claimableChores.listMine,
    );

  const redos =
    useQuery(
      api.childRedos.listMine,
    );

  const claim =
    useMutation(
      api.claimableChores.claim,
    );

  const unclaim =
    useMutation(
      api.claimableChores.unclaim,
    );

  const submit =
    useMutation(
      api
        .claimableChoreSubmissions
        .submit,
    );

  const submitRedo =
    useMutation(
      api
        .claimableChoreSubmissions
        .submitRedo,
    );

  const [
    submittingRedoClaimId,
    setSubmittingRedoClaimId,
  ] =
    useState<
      Id<'choreClaims'> |
        null
    >(null);

  if (
    result ===
      undefined ||
    redos ===
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

  const myRedoClaim =
    result.claimedOccurrences.find(
      (
        occurrence,
      ) =>
        occurrence.isMine &&
        occurrence.claimState ===
          'redo_required',
    );

  if (myRedoClaim) {
    const redo =
      redos.find(
        (
          item,
        ) =>
          item.occurrenceId ===
          myRedoClaim
            .occurrenceId,
      );

    if (!redo) {
      return (
        <View className="p-5 mt-4 border rounded-2xl border-red-900 bg-slate-900">
          <Text className="text-lg font-semibold text-white">
            Extra chore Redo
          </Text>

          <Text className="mt-2 text-sm leading-5 text-red-300">
            This Claim requires a Redo,
            but its Redo deadline could
            not be loaded. Refresh before
            submitting again.
          </Text>
        </View>
      );
    }

    return (
      <ChildRedoRequiredCard
        title={
          myRedoClaim.title
        }
        description={
          myRedoClaim.description
        }
        valueSek={
          myRedoClaim.valueSek
        }
        deadlineAt={
          redo.deadlineAt
        }
        timezone={
          myRedoClaim.timezone
        }
        claimRemainsActive
        canSubmit={
          redo.canSubmitRedo
        }
        submitting={
          submittingRedoClaimId ===
          myRedoClaim.claimId
        }
        submitTestID={`claimable-redo-submit-${myRedoClaim.claimId}`}
        onSubmit={async () => {
          setSubmittingRedoClaimId(
            myRedoClaim.claimId,
          );

          try {
            await submitRedo({
              claimId:
                myRedoClaim.claimId,
            });

            Alert.alert(
              'Redo submitted',
              `${myRedoClaim.title} was sent back to your parent for review.`,
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
            setSubmittingRedoClaimId(
              null,
            );
          }
        }}
      />
    );
  }

  return (
    <ClaimableChoresView
      result={
        result
      }
      onClaim={async (
        occurrenceId,
        acceptImmediateLock,
      ) => {
        await claim({
          occurrenceId,
          acceptImmediateLock,
        });
      }}
      onUnclaim={async (
        claimId,
      ) => {
        await unclaim({
          claimId,
        });
      }}
      onSubmit={async (
        claimId,
      ) => {
        await submit({
          claimId,
        });
      }}
    />
  );
}
