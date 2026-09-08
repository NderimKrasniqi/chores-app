import {
  Redirect,
} from 'expo-router';

import {
  Task16PhotoEvidenceMaestroFixtureScreen,
} from '@/components/dev/task16-photo-evidence-maestro-fixture-screen';

export default function MaestroTask16EvidenceRoute() {
  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  return (
    <Task16PhotoEvidenceMaestroFixtureScreen />
  );
}
