import { View } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutUp,
  ReduceMotion,
  useReducedMotion,
} from "react-native-reanimated";

import { Easings } from "@/components/art/motion";
import { ServerConnectionNotice } from "@/components/server-connection-notice";
import { useServerConnectionStatus } from "@/hooks/use-server-confirmed-mutation";

/**
 * The connection pill slides down from the top when the server is out of
 * reach and back up the same way when it returns (reduced motion: a fade).
 * The wrapper stays mounted so the exit can play.
 */
export function ServerConnectionBanner() {
  const { status } = useServerConnectionStatus();
  const reducedMotion = useReducedMotion();

  return (
    <View pointerEvents="none" className="absolute left-4 right-4 top-14 z-50">
      {status !== "online" ? (
        <Animated.View
          entering={
            reducedMotion
              ? FadeIn.duration(200).reduceMotion(ReduceMotion.Never)
              : FadeInDown.duration(260).easing(Easings.out)
          }
          exiting={
            reducedMotion
              ? FadeOut.duration(200).reduceMotion(ReduceMotion.Never)
              : FadeOutUp.duration(200).easing(Easings.out)
          }
        >
          <ServerConnectionNotice
            status={status}
            testID="server-connection-banner"
          />
        </Animated.View>
      ) : null}
    </View>
  );
}
