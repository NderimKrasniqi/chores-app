import { useQuery } from 'convex/react';
import { Text, View } from 'react-native';

import { api } from '../../convex/_generated/api';

export default function HomeScreen() {
  const health = useQuery(api.health.ping);

  return (
    <View className="items-center justify-center flex-1 px-6 bg-slate-950">
      <Text className="text-3xl font-bold text-white">Chores App</Text>

      <Text className="mt-3 text-base text-slate-400">
        {health === undefined ? 'Connecting to Convex...' : health.message}
      </Text>

      {health?.ok && (
        <Text className="mt-2 font-semibold text-green-400">
          Backend online ✓
        </Text>
      )}
    </View>
  );
}
