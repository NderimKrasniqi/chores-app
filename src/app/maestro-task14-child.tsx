import {
  Redirect,
  useLocalSearchParams,
} from 'expo-router';

import {
  Task14RunningBalanceMaestroFixtureScreen,
} from '@/components/dev/task14-running-balance-maestro-fixture-screen';

import {
  Task15PayoutsMaestroFixtureScreen,
} from '@/components/dev/task15-payouts-maestro-fixture-screen';

import {
  Task16PhotoEvidenceMaestroFixtureScreen,
} from '@/components/dev/task16-photo-evidence-maestro-fixture-screen';

export default function MaestroTask14ChildRoute() {
  const params =
    useLocalSearchParams<{
      fixture?: string;
    }>();

  if (!__DEV__) {
    return (
      <Redirect href="/" />
    );
  }

  if (
    params.fixture ===
    '15'
  ) {
    return (
      <Task15PayoutsMaestroFixtureScreen />
    );
  }

  if (
    params.fixture ===
    '16'
  ) {
    return (
      <Task16PhotoEvidenceMaestroFixtureScreen />
    );
  }

  return (
    <Task14RunningBalanceMaestroFixtureScreen />
  );
}
