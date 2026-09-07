import { ChildDeviceList } from '@/components/child-access/child-device-list';
import { ChildPairingCard } from '@/components/child-access/child-pairing-card';
import { ActiveClaimableClaimsCard } from '@/components/chores/active-claimable-claims-card';
import { ChoreDefinitionsCard } from '@/components/chores/chore-definitions-card';
import { ClaimableChoreReviewsCard } from '@/components/chores/claimable-chore-reviews-card';
import { PersonalChoreReviewsCard } from '@/components/chores/personal-chore-reviews-card';
import { RedoChoreReviewsCard } from '@/components/chores/redo-chore-reviews-card';
import { Task06SmokeTestCard } from '@/components/chores/task-06-smoke-test-card';
import { useState } from 'react';
import {
  Pressable,
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

  name:
    string;

  timezone:
    string;

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

type HouseholdSection =
  | 'overview'
  | 'chores'
  | 'reviews'
  | 'access';

function formatWeekday(
  day: PayoutWeekday,
) {
  return (
    day.charAt(0).toUpperCase() +
    day.slice(1)
  );
}

function SectionButton({
  active,
  label,
  onPress,
}: {
  active:
    boolean;

  label:
    string;

  onPress: () =>
    void;
}) {
  return (
    <Pressable
      className={
        active
          ? 'flex-1 px-2 py-3 bg-white rounded-xl'
          : 'flex-1 px-2 py-3 rounded-xl'
      }
      onPress={
        onPress
      }
    >
      <Text
        className={
          active
            ? 'text-xs font-semibold text-center text-slate-950'
            : 'text-xs font-semibold text-center text-slate-400'
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function HouseholdCard({
  household,
}: HouseholdCardProps) {
  const [
    section,
    setSection,
  ] =
    useState<HouseholdSection>(
      'overview',
    );

  return (
    <View className="p-5 mt-5 border rounded-2xl border-slate-800 bg-slate-900">
      <Text className="text-2xl font-bold text-white">
        {household.name}
      </Text>

      <View className="flex-row p-1 mt-5 rounded-2xl bg-slate-950">
        <SectionButton
          active={
            section ===
            'overview'
          }
          label="Overview"
          onPress={() =>
            setSection(
              'overview',
            )
          }
        />

        <SectionButton
          active={
            section ===
            'chores'
          }
          label="Chores"
          onPress={() =>
            setSection(
              'chores',
            )
          }
        />

        <SectionButton
          active={
            section ===
            'reviews'
          }
          label="Reviews"
          onPress={() =>
            setSection(
              'reviews',
            )
          }
        />

        <SectionButton
          active={
            section ===
            'access'
          }
          label="Access"
          onPress={() =>
            setSection(
              'access',
            )
          }
        />
      </View>

      {section ===
        'overview' && (
        <View className="mt-6">
          <View>
            <Text className="text-sm text-slate-500">
              Timezone
            </Text>

            <Text className="mt-1 text-base text-white">
              {
                household.timezone
              }
            </Text>
          </View>

          <View className="mt-5">
            <Text className="text-sm text-slate-500">
              Payout day
            </Text>

            <Text className="mt-1 text-base text-white">
              {formatWeekday(
                household
                  .payoutWeekday,
              )}
            </Text>
          </View>

          <View className="mt-5">
            <Text className="text-sm text-slate-500">
              Weekly unclaims
            </Text>

            <Text className="mt-1 text-base text-white">
              {
                household
                  .weeklyUnclaimAllowance
              }
            </Text>
          </View>

          <View className="pt-5 mt-6 border-t border-slate-800">
            <Text className="font-semibold text-white">
              Children
            </Text>

            {household.children.length ===
            0 ? (
              <Text className="mt-3 text-sm text-slate-500">
                No children yet.
              </Text>
            ) : (
              household.children.map(
                (
                  child,
                ) => (
                  <View
                    key={
                      child.childId
                    }
                    className="px-4 py-3 mt-3 rounded-xl bg-slate-800"
                  >
                    <Text className="font-semibold text-white">
                      {
                        child
                          .displayName
                      }
                    </Text>
                  </View>
                ),
              )
            )}
          </View>

          <ActiveClaimableClaimsCard
            householdId={
              household
                .householdId
            }
          />
        </View>
      )}

      {section ===
        'chores' && (
        <View className="mt-2">
          <ChoreDefinitionsCard
            householdId={
              household
                .householdId
            }
            children={
              household.children
            }
          />

          {__DEV__ && (
            <Task06SmokeTestCard
              householdId={
                household
                  .householdId
              }
              children={
                household.children
              }
            />
          )}
        </View>
      )}

      {section ===
        'reviews' && (
        <View className="mt-6">
          <PersonalChoreReviewsCard
            householdId={
              household
                .householdId
            }
          />

          <ClaimableChoreReviewsCard
            householdId={
              household
                .householdId
            }
          />

          <RedoChoreReviewsCard
            householdId={
              household
                .householdId
            }
          />
        </View>
      )}

      {section ===
        'access' && (
        <View className="mt-6">
          <Text className="font-semibold text-white">
            Child devices
          </Text>

          <Text className="mt-2 text-sm leading-5 text-slate-500">
            Pair devices, review active
            access, or revoke a Child
            device.
          </Text>

          {household.children.map(
            (
              child,
            ) => (
              <View
                key={
                  child.childId
                }
                className="p-4 mt-4 rounded-xl bg-slate-800"
              >
                <Text className="text-xl font-semibold text-white">
                  {
                    child
                      .displayName
                  }
                </Text>

                <ChildPairingCard
                  householdId={
                    household
                      .householdId
                  }
                  childId={
                    child.childId
                  }
                  childDisplayName={
                    child
                      .displayName
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

          <ParentInviteCard
            householdId={
              household
                .householdId
            }
          />
        </View>
      )}
    </View>
  );
}
