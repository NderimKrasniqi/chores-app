import {
  Redirect,
} from 'expo-router';

import { Task13ParentRedoReviewMaestroFixtureScreen } from '@/components/dev/task13-parent-redo-review-maestro-fixture-screen';

export default function MaestroTask13ParentRedoRoute() {
  if (!__DEV__) {
    return (
      <Redirect href="/" />
    );
  }

  return (
    <Task13ParentRedoReviewMaestroFixtureScreen />
  );
}
