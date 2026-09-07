import {
  useQuery,
} from 'convex/react';
import {
  Text,
  View,
} from 'react-native';

import {
  api,
} from '../../../convex/_generated/api';

type ChildRunningBalanceCardViewProps = {
  balanceSek:
    number |
    undefined;
};

export function ChildRunningBalanceCardView({
  balanceSek,
}: ChildRunningBalanceCardViewProps) {
  return (
    <View
      className="p-5 mt-8 border rounded-2xl border-slate-800 bg-slate-900"
      testID="task14-running-balance-card"
    >
      <Text className="text-sm font-semibold tracking-wider uppercase text-slate-500">
        Running balance
      </Text>

      {balanceSek ===
      undefined ? (
        <Text className="mt-2 text-3xl font-bold text-slate-500">
          …
        </Text>
      ) : (
        <Text
          className="mt-2 text-3xl font-bold text-white"
          testID="task14-running-balance-value"
        >
          {
            balanceSek
          }{' '}
          kr
        </Text>
      )}

      <Text className="mt-2 text-sm leading-5 text-slate-400">
        Approved earnings and Claimable
        penalties update this total.
      </Text>
    </View>
  );
}

export function ChildRunningBalanceCard() {
  const balance =
    useQuery(
      api.runningBalances.getMine,
    );

  return (
    <ChildRunningBalanceCardView
      balanceSek={
        balance?.balanceSek
      }
    />
  );
}
