import {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Text,
  View,
} from 'react-native';

import type {
  Id,
} from '../../../convex/_generated/dataModel';

export type ApprovalActivityItem = {
  activityId:
    Id<'choreReviews'>;

  childId:
    Id<'children'>;

  childDisplayName:
    string;

  choreTitle:
    string;

  choreKind:
    'personal' | 'claimable';

  valueSek:
    number;

  approvedAt:
    number;
};

function actorName(
  item:
    ApprovalActivityItem,
  viewerChildId?:
    Id<'children'>,
) {
  return (
    viewerChildId ===
    item.childId
      ? 'You'
      : item.childDisplayName
  );
}

function formatApprovedAt(
  timestamp:
    number,
  timezone:
    string,
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

export function ApprovalActivitySurface({
  items,
  timezone,
  viewerChildId,
  showHistory,
}: {
  items:
    ApprovalActivityItem[];

  timezone:
    string;

  viewerChildId?:
    Id<'children'>;

  showHistory:
    boolean;
}) {
  const [
    celebration,
    setCelebration,
  ] =
    useState<
      ApprovalActivityItem |
      null
    >(
      null,
    );

  const seenLatestId =
    useRef<
      | Id<'choreReviews'>
      | null
      | undefined
    >(
      undefined,
    );

  const timeoutRef =
    useRef<
      ReturnType<
        typeof setTimeout
      > |
      null
    >(
      null,
    );

  useEffect(() => {
    const latest =
      items[0] ??
      null;

    const latestId =
      latest
        ?.activityId ??
      null;

    /*
     * Existing activity establishes the
     * baseline. Only a new reactive approval
     * produces the transient celebration.
     */
    if (
      seenLatestId.current ===
      undefined
    ) {
      seenLatestId.current =
        latestId;

      return;
    }

    if (
      !latest ||
      latestId ===
        seenLatestId.current
    ) {
      return;
    }

    seenLatestId.current =
      latestId;

    if (
      timeoutRef.current
    ) {
      clearTimeout(
        timeoutRef.current,
      );
    }

    setCelebration(
      latest,
    );

    timeoutRef.current =
      setTimeout(
        () => {
          setCelebration(
            null,
          );

          timeoutRef.current =
            null;
        },
        6000,
      );
  }, [
    items,
  ]);

  useEffect(
    () =>
      () => {
        if (
          timeoutRef.current
        ) {
          clearTimeout(
            timeoutRef.current,
          );
        }
      },
    [],
  );

  if (
    !showHistory &&
    !celebration
  ) {
    return null;
  }

  return (
    <View className="mt-5">
      {celebration ? (
        <View
          testID="household-approval-celebration"
          className="p-4 border rounded-2xl border-amber-700 bg-amber-950"
        >
          <Text
            testID="household-approval-celebration-title"
            className="text-lg font-bold text-amber-200"
          >
            🎉 Household win!
          </Text>

          <Text className="mt-2 text-base font-semibold text-white">
            {actorName(
              celebration,
              viewerChildId,
            )}{' '}
            completed{' '}
            {
              celebration
                .choreTitle
            }
          </Text>

          <Text className="mt-1 text-sm font-semibold text-emerald-300">
            +
            {
              celebration
                .valueSek
            }{' '}
            kr approved
          </Text>
        </View>
      ) : null}

      {showHistory ? (
        <View
          testID="household-approval-activity"
          className="p-5 mt-4 rounded-2xl bg-slate-900"
        >
          <Text className="text-lg font-semibold text-white">
            Household activity
          </Text>

          <Text className="mt-2 text-sm leading-5 text-slate-400">
            Approved chore wins are
            shared with the household.
          </Text>

          <Text className="mt-1 text-xs leading-5 text-slate-500">
            This shared feed shows
            individual approved chore
            values, not sibling running
            balances, penalties, payouts,
            or detailed financial history.
          </Text>

          {items.length ===
          0 ? (
            <Text className="mt-4 text-sm text-slate-500">
              No approved chores yet.
            </Text>
          ) : (
            items.map(
              (
                item,
              ) => (
                <View
                  key={
                    item
                      .activityId
                  }
                  className="pt-4 mt-4 border-t border-slate-800"
                >
                  <Text className="font-semibold text-white">
                    {actorName(
                      item,
                      viewerChildId,
                    )}{' '}
                    completed{' '}
                    {
                      item
                        .choreTitle
                    }
                  </Text>

                  <Text className="mt-1 text-sm font-semibold text-emerald-300">
                    +
                    {
                      item
                        .valueSek
                    }{' '}
                    kr
                  </Text>

                  <Text className="mt-1 text-xs text-slate-500">
                    {
                      item
                        .choreKind ===
                      'claimable'
                        ? 'Claimable chore'
                        : 'Personal chore'
                    }
                    {' • '}
                    {formatApprovedAt(
                      item
                        .approvedAt,
                      timezone,
                    )}
                  </Text>
                </View>
              ),
            )
          )}
        </View>
      ) : null}
    </View>
  );
}
