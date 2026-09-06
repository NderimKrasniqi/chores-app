import { ChildDeviceList } from '@/components/child-access/child-device-list';
import { ChildPairingCard } from '@/components/child-access/child-pairing-card';
import { ChoreDefinitionsCard } from '@/components/chores/chore-definitions-card';
import { Task06SmokeTestCard } from '@/components/chores/task-06-smoke-test-card';
import {
  Text,
  View,
} from 'react-native';

import type { Id } from '../../../convex/_generated/dataModel';

import { ParentInviteCard } from './parent-invite-card';

export type PayoutWeekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type HouseholdSummary = {
  householdId:
    Id<'households'>;

  name: string;

  timezone: string;

  payoutWeekday:
    PayoutWeekday;

  weeklyUnclaimAllowance:
    number;

  children: Array<{
    childId:
      Id<'children'>;

    displayName:
      string;
  }>;
};

type HouseholdCardProps = {
  household:
    HouseholdSummary;
};

function formatWeekday(
  day: PayoutWeekday,
) {
  return (
    day.charAt(0).toUpperCase() +
    day.slice(1)
  );
}

export function HouseholdCard({
  household,
}: HouseholdCardProps) {
  return (
    <View className="p-5 mt-5 border rounded-2xl border-slate-800 bg-slate-900">
      <Text className="text-2xl font-bold text-white">
        {household.name}
      </Text>

      <View className="mt-5">
        <Text className="text-sm text-slate-500">
          Timezone
        </Text>

        <Text className="mt-1 text-base text-white">
          {household.timezone}
        </Text>
      </View>

      <View className="mt-4">
        <Text className="text-sm text-slate-500">
          Payout day
        </Text>

        <Text className="mt-1 text-base text-white">
          {formatWeekday(
            household.payoutWeekday,
          )}
        </Text>
      </View>

      <View className="mt-4">
        <Text className="text-sm text-slate-500">
          Weekly unclaims
        </Text>

        <Text className="mt-1 text-base text-white">
          {
            household.weeklyUnclaimAllowance
          }
        </Text>
      </View>

      <View className="pt-5 mt-6 border-t border-slate-800">
        <Text className="font-semibold text-white">
          Children
        </Text>

        {household.children.map(
          (child) => (
            <View
              key={
                child.childId
              }
              className="p-4 mt-4 rounded-xl bg-slate-800"
            >
              <Text className="text-xl font-semibold text-white">
                {
                  child.displayName
                }
              </Text>

              <ChildPairingCard
                householdId={
                  household.householdId
                }
                childId={
                  child.childId
                }
                childDisplayName={
                  child.displayName
                }
              />

              <ChildDeviceList
                childId={
                  child.childId
                }
              />
            </View>
          ),
        )}
      </View>

      <ChoreDefinitionsCard
        householdId={
          household.householdId
        }
        children={
          household.children
        }
      />

      {__DEV__ && (
        <Task06SmokeTestCard
          householdId={
            household.householdId
          }
          children={
            household.children
          }
        />
      )}

      <ParentInviteCard
        householdId={
          household.householdId
        }
      />
    </View>
  );
}
