import {
  useQuery,
} from 'convex/react';

import {
  api,
} from '../../../convex/_generated/api';
import type {
  Id,
} from '../../../convex/_generated/dataModel';
import {
  ApprovalActivitySurface,
} from './approval-activity';

export function ParentHouseholdActivity({
  householdId,
  showHistory,
}: {
  householdId:
    Id<'households'>;

  showHistory:
    boolean;
}) {
  /*
   * Keep this query mounted even while the
   * Parent is in Reviews so a newly approved
   * chore can reactively produce celebration.
   */
  const feed =
    useQuery(
      api
        .householdActivity
        .listForParent,
      {
        householdId,
      },
    );

  if (
    feed ===
    undefined
  ) {
    return null;
  }

  return (
    <ApprovalActivitySurface
      items={
        feed.items
      }
      timezone={
        feed.timezone
      }
      showHistory={
        showHistory
      }
    />
  );
}
