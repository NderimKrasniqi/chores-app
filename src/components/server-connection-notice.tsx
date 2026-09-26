import { View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";

import { useLoop } from "@/components/art";
import { AppText } from "@/design-system";
import { useTheme } from "@/design-system/theme";
import type { ServerConnectionStatus } from "@/hooks/use-server-confirmed-mutation";

export function getServerConnectionMessage(status: ServerConnectionStatus) {
  switch (status) {
    case "recovering":
      return "Checking whether your last change went through — don’t repeat it yet.";

    case "offline":
      return "You’re offline. Showing the last saved view; changes wait until you’re back.";

    case "connecting":
      return "Connecting… changes are paused for a moment.";

    case "online":
      return null;
  }
}

/** Three signal bars that pulse one after another while reconnecting. */
function SignalBars({ color }: { color: string }) {
  const pulse = useLoop({ duration: 1200, rest: 0.5, essential: true });
  const bars = [0, 1, 2].map((i) => i);
  return (
    <View className="h-4 flex-row items-end gap-0.5" accessible={false}>
      {bars.map((i) => (
        <Bar key={i} index={i} progress={pulse} color={color} />
      ))}
    </View>
  );
}

function Bar({
  index,
  progress,
  color,
}: {
  index: number;
  progress: ReturnType<typeof useLoop>;
  color: string;
}) {
  const style = useAnimatedStyle(() => {
    const phase = (progress.get() + index / 3) % 1;
    return { opacity: interpolate(phase, [0, 0.5, 1], [0.25, 1, 0.25]) };
  });
  return (
    <Animated.View
      style={[
        {
          width: 4,
          height: 6 + index * 4,
          borderRadius: 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

export function ServerConnectionNotice({
  status,
  testID = "server-connection-notice",
}: {
  status: ServerConnectionStatus;

  testID?: string;
}) {
  const { tokens } = useTheme();
  const message = getServerConnectionMessage(status);

  if (!message) {
    return null;
  }

  return (
    <View
      testID={testID}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      className="flex-row items-center gap-3 rounded-full px-4 py-2.5"
      style={{
        backgroundColor: tokens.ink,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
      }}
    >
      <SignalBars
        color={status === "offline" ? tokens.urgency : tokens.reward}
      />
      <AppText
        variant="caption"
        className="flex-1"
        style={{ color: tokens.surface }}
      >
        {message}
      </AppText>
    </View>
  );
}
