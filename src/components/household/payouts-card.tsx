import { useServerConfirmedMutation } from '@/hooks/use-server-confirmed-mutation';
import {
  api,
  } from '../../../convex/_generated/api';
import type {
  Id,
  } from '../../../convex/_generated/dataModel';
import {
  useMutation,
  useQuery,
} from 'convex/react';
import {
  useEffect,
  useState,
} from 'react';
import {
  Pressable,
  Text,
  View,
} from 'react-native';

type PayoutsCardProps = {
  householdId:
    Id<'households'>;
};

const weekdays = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

function shortWeekday(
  value:
    typeof weekdays[number],
) {
  return (
    value
      .slice(0, 3)
      .charAt(0)
      .toUpperCase() +
    value.slice(1, 3)
  );
}

export function PayoutsCard({
  householdId,
}: PayoutsCardProps) {
  const overview =
    useQuery(
      api.payouts
        .getOverview,
      {
        householdId,
      },
    );

  const ensureCurrent =
    useServerConfirmedMutation(
      api.payouts
        .ensureCurrent,
    );

  const setPayoutWeekday =
    useServerConfirmedMutation(
      api.households
        .setPayoutWeekday,
    );

  const markPaid =
    useServerConfirmedMutation(
      api.payouts.markPaid,
    );

  const [
    busyId,
    setBusyId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  useEffect(() => {
    let active = true;

    void ensureCurrent({
      householdId,
    }).catch(() => {
      if (active) {
        setError(
          'Could not sync the payout period.',
        );
      }
    });

    return () => {
      active = false;
    };
  }, [
    ensureCurrent,
    householdId,
  ]);

  if (
    overview ===
    undefined
  ) {
    return (
      <Text className="mt-4 text-sm text-slate-500">
        Loading payouts…
      </Text>
    );
  }

  return (
    <View>
      <Text className="text-lg font-semibold text-white">
        Payouts
      </Text>

      <Text className="mt-2 text-sm leading-5 text-slate-400">
        Pay positive amounts manually with
        Swish, then mark the payout paid.
      </Text>

      <View className="p-4 mt-4 rounded-xl bg-slate-800">
        <Text className="text-sm text-slate-400">
          Current payout period
        </Text>

        <Text className="mt-1 font-semibold text-white">
          {
            overview
              .currentPeriod
              .startLocalDate
          }{' '}
          –{' '}
          {
            overview
              .currentPeriod
              .endLocalDate
          }
        </Text>

        <Text className="mt-2 text-sm text-slate-400">
          This period closes on{' '}
          {
            overview
              .currentPeriod
              .payoutWeekday
          }
          .
        </Text>
      </View>

      <Text className="mt-5 text-sm font-semibold text-white">
        Next payout weekday
      </Text>

      <View className="flex-row flex-wrap mt-2">
        {weekdays.map(
          (weekday) => {
            const active =
              overview
                .configuredPayoutWeekday ===
              weekday;

            return (
              <Pressable
                key={
                  weekday
                }
                className={
                  active
                    ? 'px-3 py-2 mr-2 mt-2 rounded-lg bg-white'
                    : 'px-3 py-2 mr-2 mt-2 rounded-lg bg-slate-800'
                }
                onPress={
                  async () => {
                    setError(
                      null,
                    );

                    setBusyId(
                      `weekday:${weekday}`,
                    );

                    try {
                      await setPayoutWeekday({
                        householdId,
                        payoutWeekday:
                          weekday,
                      });
                    } catch {
                      setError(
                        'Could not change payout weekday.',
                      );
                    } finally {
                      setBusyId(
                        null,
                      );
                    }
                  }
                }
                disabled={
                  busyId !==
                  null
                }
              >
                <Text
                  className={
                    active
                      ? 'font-semibold text-slate-950'
                      : 'font-semibold text-white'
                  }
                >
                  {shortWeekday(
                    weekday,
                  )}
                </Text>
              </Pressable>
            );
          },
        )}
      </View>

      {overview.children.map(
        (child) => (
          <View
            key={
              child.childId
            }
            className="p-4 mt-5 rounded-xl bg-slate-800"
          >
            <Text className="text-base font-semibold text-white">
              {
                child
                  .displayName
              }
            </Text>

            <Text className="mt-1 text-sm text-slate-400">
              Running balance:{' '}
              {
                child
                  .runningBalanceSek
              }{' '}
              kr
            </Text>

            {child.pendingPayouts.length >
            0 ? (
              child.pendingPayouts.map(
                (
                  payout,
                ) => (
                  <View
                    key={
                      payout
                        .payoutId
                    }
                    className="pt-4 mt-4 border-t border-slate-700"
                  >
                    <Text className="font-semibold text-white">
                      {
                        payout
                          .amountDueSek
                      }{' '}
                      kr to pay
                    </Text>

                    <Text className="mt-1 text-sm leading-5 text-slate-400">
                      Payout period ending{' '}
                      {
                        payout
                          .periodEndLocalDate
                      }
                      . Pay with Swish,
                      then confirm below.
                    </Text>

                    {payout.pendingOutcomeCount >
                    0 && (
                      <Text className="mt-2 text-sm leading-5 text-amber-300">
                        {
                          payout
                            .pendingOutcomeCount
                        }{' '}
                        unresolved chore
                        outcome
                        {
                          payout
                            .pendingOutcomeCount ===
                          1
                            ? ''
                            : 's'
                        }{' '}
                        will be handled in
                        a later payout.
                      </Text>
                    )}

                    <Pressable
                      className="px-4 py-3 mt-3 rounded-xl bg-white"
                      disabled={
                        busyId !==
                        null
                      }
                      onPress={
                        async () => {
                          setError(
                            null,
                          );

                          setBusyId(
                            payout
                              .payoutId,
                          );

                          try {
                            await markPaid({
                              payoutId:
                                payout
                                  .payoutId,
                            });
                          } catch {
                            setError(
                              'Could not mark payout paid.',
                            );
                          } finally {
                            setBusyId(
                              null,
                            );
                          }
                        }
                      }
                    >
                      <Text className="font-semibold text-center text-slate-950">
                        Mark paid
                      </Text>
                    </Pressable>
                  </View>
                ),
              )
            ) : child.latestPayout ? (
              <View className="pt-4 mt-4 border-t border-slate-700">
                {child.latestPayout.status ===
                'paid' ? (
                  <Text className="text-sm text-emerald-300">
                    Latest payout paid:{' '}
                    {
                      child
                        .latestPayout
                        .amountDueSek
                    }{' '}
                    kr
                  </Text>
                ) : child.latestPayout.balanceAtCloseSek <
                  0 ? (
                  <Text className="text-sm text-slate-400">
                    No payment due.
                    Negative balance of{' '}
                    {
                      child
                        .latestPayout
                        .balanceAtCloseSek
                    }{' '}
                    kr carries forward.
                  </Text>
                ) : (
                  <Text className="text-sm text-slate-400">
                    No payment was due for
                    the latest period.
                  </Text>
                )}
              </View>
            ) : (
              <Text className="mt-3 text-sm text-slate-500">
                No completed payout periods
                yet.
              </Text>
            )}
          </View>
        ),
      )}

      {error && (
        <Text className="mt-4 text-sm text-red-300">
          {error}
        </Text>
      )}
    </View>
  );
}
