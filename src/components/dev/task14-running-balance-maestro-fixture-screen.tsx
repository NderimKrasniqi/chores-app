import {
  ScrollView,
  Text,
} from 'react-native';

import {
  ChildRunningBalanceCardView,
} from '../child-access/child-running-balance-card';

export function Task14RunningBalanceMaestroFixtureScreen() {
  return (
    <ScrollView
      className="flex-1 bg-slate-950"
      contentContainerClassName="px-5 pt-16 pb-16"
    >
      <Text className="text-xs font-semibold tracking-widest text-amber-400">
        DEVELOPMENT ONLY
      </Text>

      <Text className="mt-2 text-2xl font-bold text-white">
        TASK-14 Running Balance Fixture
      </Text>

      <ChildRunningBalanceCardView
        balanceSek={
          -100
        }
      />
    </ScrollView>
  );
}
