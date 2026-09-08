import {
  useState,
} from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

const weekdays = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export function Task15PayoutsMaestroFixtureScreen() {
  const [
    payoutWeekday,
    setPayoutWeekday,
  ] =
    useState<
      typeof weekdays[number]
    >(
      'friday',
    );

  const [
    paid,
    setPaid,
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
        TASK-15 Payout Fixture
      </Text>

      <View className="p-5 mt-5 rounded-2xl bg-slate-900">
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
            2030-01-12 – 2030-01-18
          </Text>

          <Text className="mt-2 text-sm text-slate-400">
            This period closes on friday.
          </Text>
        </View>

        <Text className="mt-5 text-sm font-semibold text-white">
          Next payout weekday
        </Text>

        <Text
          testID="task15-selected-weekday"
          className="mt-2 text-sm text-slate-400"
        >
          Next payout weekday: {payoutWeekday}
        </Text>

        <View className="flex-row flex-wrap mt-2">
          {weekdays.map(
            (
              weekday,
            ) => (
              <Pressable
                key={
                  weekday
                }
                testID={`task15-weekday-${weekday}`}
                accessibilityRole="button"
                accessibilityLabel={`Set payout weekday ${weekday}`}
                onPress={() =>
                  setPayoutWeekday(
                    weekday,
                  )
                }
                className={
                  payoutWeekday ===
                  weekday
                    ? 'px-3 py-2 mr-2 mt-2 rounded-lg bg-white'
                    : 'px-3 py-2 mr-2 mt-2 rounded-lg bg-slate-800'
                }
              >
                <Text
                  className={
                    payoutWeekday ===
                    weekday
                      ? 'font-semibold text-slate-950'
                      : 'font-semibold text-white'
                  }
                >
                  {weekday
                    .slice(
                      0,
                      3,
                    )
                    .replace(
                      /^./,
                      (
                        value,
                      ) =>
                        value.toUpperCase(),
                    )}
                </Text>
              </Pressable>
            ),
          )}
        </View>

        <View className="p-4 mt-5 rounded-xl bg-slate-800">
          <Text className="text-base font-semibold text-white">
            Alex
          </Text>

          <Text className="mt-1 text-sm text-slate-400">
            Running balance: {paid ? 0 : 70} kr
          </Text>

          {!paid ? (
            <View className="pt-4 mt-4 border-t border-slate-700">
              <Text className="font-semibold text-white">
                70 kr to pay
              </Text>

              <Text className="mt-1 text-sm leading-5 text-slate-400">
                Payout period ending 2030-01-18.
                Pay with Swish, then confirm below.
              </Text>

              <Text className="mt-2 text-sm leading-5 text-amber-300">
                1 unresolved chore outcome will be
                handled in a later payout.
              </Text>

              <Pressable
                testID="task15-mark-paid"
                accessibilityRole="button"
                accessibilityLabel="Mark Alex payout paid"
                onPress={() =>
                  setPaid(
                    true,
                  )
                }
                className="px-4 py-3 mt-3 bg-white rounded-xl"
              >
                <Text className="font-semibold text-center text-slate-950">
                  Mark paid
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="pt-4 mt-4 border-t border-slate-700">
              <Text
                testID="task15-paid-result"
                className="text-sm text-emerald-300"
              >
                Latest payout paid: 70 kr
              </Text>
            </View>
          )}
        </View>

        <View className="p-4 mt-5 rounded-xl bg-slate-800">
          <Text className="text-base font-semibold text-white">
            Sam
          </Text>

          <Text className="mt-1 text-sm text-slate-400">
            Running balance: -50 kr
          </Text>

          <View className="pt-4 mt-4 border-t border-slate-700">
            <Text
              testID="task15-negative-carry"
              className="text-sm text-slate-400"
            >
              No payment due. Negative balance of -50 kr carries forward.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
