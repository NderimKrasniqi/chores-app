import { useServerConfirmedMutation } from "@/hooks/use-server-confirmed-mutation";
import { AppText, Surface } from "@/design-system";
import { useQuery } from "convex/react";
import { Alert } from "react-native";

import { api } from "../../../convex/_generated/api";
import {
  ClaimableChoresView,
  type UnlockChoreSummary,
} from "./claimable-chores-view";

export function ClaimableChoresCard() {
  const result = useQuery(api.claimableChores.listMine);

  const redos = useQuery(api.childRedos.listMine);

  const personalChores = useQuery(api.personalChores.listMine);

  const claim = useServerConfirmedMutation(api.claimableChores.claim);

  const unclaim = useServerConfirmedMutation(api.claimableChores.unclaim);

  const submit = useServerConfirmedMutation(
    api.claimableChoreSubmissions.submit,
  );

  const submitRedo = useServerConfirmedMutation(
    api.claimableChoreSubmissions.submitRedo,
  );

  if (
    result === undefined ||
    redos === undefined ||
    personalChores === undefined
  ) {
    return (
      <Surface className="mt-4 p-5">
        <AppText variant="cardTitle">Extra chores</AppText>
        <AppText variant="bodySmall" color="ink-muted" className="mt-2">
          Loading Extras…
        </AppText>
      </Surface>
    );
  }

  return (
    <ClaimableChoresView
      result={result}
      unlockChore={
        result.gate.currentUnlockOccurrence
          ? (personalChores.find(
              (occurrence) =>
                occurrence.occurrenceId ===
                result.gate.currentUnlockOccurrence?.occurrenceId,
            ) as UnlockChoreSummary | undefined)
          : undefined
      }
      onClaim={async (occurrenceId, acceptImmediateLock) => {
        await claim({
          occurrenceId,
          acceptImmediateLock,
        });
      }}
      onUnclaim={async (claimId) => {
        await unclaim({
          claimId,
        });
      }}
      onSubmit={async (claimId, evidenceUploadIntentId) => {
        await submit({
          claimId,

          evidenceUploadIntentId,
        });
      }}
      redos={redos}
      onSubmitRedo={async (claimId, evidenceUploadIntentId) => {
        await submitRedo({ claimId, evidenceUploadIntentId });
        Alert.alert(
          "Redo submitted",
          "Your corrected work was sent back to your parent for review.",
        );
      }}
    />
  );
}
