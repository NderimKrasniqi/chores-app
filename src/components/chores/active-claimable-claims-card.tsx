import {
  useMutation,
  useQuery,
} from 'convex/react';

import { api } from '../../../convex/_generated/api';
import type {
  Id,
} from '../../../convex/_generated/dataModel';
import { ActiveClaimableClaimsView } from './active-claimable-claims-view';

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

  const cancelClaim =
    useMutation(
      api.claimableClaimCancellations
        .cancelForParent,
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
    <ActiveClaimableClaimsView
      claims={
        claims
      }
      onCancel={async (
        claimId,
      ) => {
        await cancelClaim({
          householdId,
          claimId,
        });
      }}
    />
  );
}
