import { useServerConfirmedMutation } from "@/hooks/use-server-confirmed-mutation";
import { useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ActiveClaimableClaimsView } from "./active-claimable-claims-view";

export function ActiveClaimableClaimsCard({
  householdId,
  homeVariant = false,
}: {
  householdId: Id<"households">;
  homeVariant?: boolean;
}) {
  const claims = useQuery(api.claimableChores.listActiveForParent, {
    householdId,
  });

  const cancelClaim = useServerConfirmedMutation(
    api.claimableClaimCancellations.cancelForParent,
  );

  /*
   * Keep Parent Overview compact:
   * no loading placeholder and no
   * empty card when no active Claims
   * exist.
   */
  if (!claims || claims.length === 0) {
    return null;
  }

  return (
    <ActiveClaimableClaimsView
      claims={claims}
      homeVariant={homeVariant}
      onCancel={async (claimId) => {
        await cancelClaim({
          householdId,
          claimId,
        });
      }}
    />
  );
}
