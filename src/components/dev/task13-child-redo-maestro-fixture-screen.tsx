import {
  useState,
} from 'react';
import {
  ScrollView,
  Text,
} from 'react-native';

import { ChildRedoRequiredCard } from '../chores/child-redo-required-card';

const REDO_DEADLINE =
  Date.UTC(
    2030,
    0,
    17,
    17,
    0,
    0,
  );

export function Task13ChildRedoMaestroFixtureScreen() {
  const [
    personalSubmitted,
    setPersonalSubmitted,
  ] =
    useState(
      false,
    );

  const [
    claimableSubmitted,
    setClaimableSubmitted,
  ] =
    useState(
      false,
    );

  return (
    <ScrollView
      className="flex-1 bg-slate-950"
      contentContainerClassName="px-5 pt-16 pb-16"
    >
      <Text className="text-xs font-semibold tracking-widest text-amber-400">
        DEVELOPMENT ONLY
      </Text>

      <Text className="mt-2 text-2xl font-bold text-white">
        TASK-13 Child Redo Fixture
      </Text>

      {!personalSubmitted ? (
        <ChildRedoRequiredCard
          title="Bedroom reset"
          description="Put everything back in place."
          valueSek={
            90
          }
          deadlineAt={
            REDO_DEADLINE
          }
          timezone="Europe/Stockholm"
          claimRemainsActive={
            false
          }
          canSubmit
          submitting={
            false
          }
          submitTestID="task13-personal-redo-submit"
          onSubmit={async () => {
            setPersonalSubmitted(
              true,
            );
          }}
        />
      ) : (
        <Text className="p-4 mt-4 text-green-300 rounded-xl bg-green-950">
          Personal Redo submitted
        </Text>
      )}

      {!claimableSubmitted ? (
        <ChildRedoRequiredCard
          title="Garage shelves"
          description="Organize the garage shelves."
          valueSek={
            140
          }
          deadlineAt={
            REDO_DEADLINE
          }
          timezone="Europe/Stockholm"
          claimRemainsActive
          canSubmit
          submitting={
            false
          }
          submitTestID="task13-claimable-redo-submit"
          onSubmit={async () => {
            setClaimableSubmitted(
              true,
            );
          }}
        />
      ) : (
        <Text className="p-4 mt-4 text-green-300 rounded-xl bg-green-950">
          Claimable Redo submitted
        </Text>
      )}
    </ScrollView>
  );
}
