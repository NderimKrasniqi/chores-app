import {
  useState,
} from 'react';
import {
  Pressable,
  ScrollView,
  Text,
} from 'react-native';

import type {
  Id,
} from '../../../convex/_generated/dataModel';
import {
  ApprovalActivitySurface,
  type ApprovalActivityItem,
} from '../activity/approval-activity';

const alexId =
  'task17-alex' as
    Id<'children'>;

const samId =
  'task17-sam' as
    Id<'children'>;

const initialItems:
  ApprovalActivityItem[] =
  [
    {
      activityId:
        'task17-review-sam' as
          Id<'choreReviews'>,

      childId:
        samId,

      childDisplayName:
        'Sam',

      choreTitle:
        'Vacuum living room',

      choreKind:
        'claimable',

      valueSek:
        90,

      approvedAt:
        1_893_456_000_000,
    },
  ];

export function Task17ActivityMaestroFixtureScreen() {
  const [
    items,
    setItems,
  ] =
    useState(
      initialItems,
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
        TASK-17 Activity Fixture
      </Text>

      <Pressable
        testID="task17-simulate-approval"
        accessibilityRole="button"
        accessibilityLabel="Simulate new household approval"
        onPress={() =>
          setItems(
            (
              current,
            ) => [
              {
                activityId:
                  `task17-review-alex-${current.length}-${Date.now()}` as
                    Id<'choreReviews'>,

                childId:
                  alexId,

                childDisplayName:
                  'Alex',

                choreTitle:
                  'Load dishwasher',

                choreKind:
                  'personal',

                valueSek:
                  60,

                approvedAt:
                  Date.now(),
              },
              ...current,
            ],
          )
        }
        className="items-center px-4 py-3 mt-5 bg-white rounded-xl"
      >
        <Text className="font-semibold text-slate-950">
          Simulate approval
        </Text>
      </Pressable>

      <ApprovalActivitySurface
        items={
          items
        }
        timezone="Europe/Stockholm"
        viewerChildId={
          alexId
        }
        showHistory
      />
    </ScrollView>
  );
}
