import { Redirect } from 'expo-router';

import { Task12ParentReviewMaestroFixtureScreen } from '@/components/dev/task12-parent-review-maestro-fixture-screen';

export default function MaestroTask12ParentRoute() {
  if (!__DEV__) {
    return (
      <Redirect href="/" />
    );
  }

  return (
    <Task12ParentReviewMaestroFixtureScreen />
  );
}
