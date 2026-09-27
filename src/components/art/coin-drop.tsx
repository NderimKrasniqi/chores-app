import { View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";

import { AppText } from "@/design-system/text";

import { useEntrance } from "./motion";
import { PiggyBank } from "./piggy-bank";

/**
 * The earned coin arcs down into the piggy bank's slot, and the pig gives
 * a little squash as it lands. One shot; under reduced motion the coin is
 * already "in" and only the pig shows.
 */
export function CoinDrop({
  value,
  size = 150,
  delay = 450,
}: {
  value: number;
  size?: number;
  delay?: number;
}) {
  const drop = useEntrance({ duration: 850, delay });
  const coin = size * 0.36;
  const height = size + coin * 1.4;

  const coinStyle = useAnimatedStyle(() => {
    const t = drop.get();
    return {
      opacity: interpolate(t, [0, 0.1, 0.8, 0.92], [0, 1, 1, 0]),
      transform: [
        { translateX: interpolate(t, [0, 1], [-size * 0.42, 0]) },
        // Up first, then down into the slot: a small arc.
        {
          translateY: interpolate(
            t,
            [0, 0.35, 1],
            [0, -coin * 0.45, coin * 1.25],
          ),
        },
        { scale: interpolate(t, [0, 0.7, 1], [1, 0.9, 0.45]) },
        { rotate: `${interpolate(t, [0, 1], [-25, 10])}deg` },
      ],
    };
  });

  const pigStyle = useAnimatedStyle(() => {
    const t = drop.get();
    return {
      transform: [
        { scaleY: interpolate(t, [0, 0.86, 0.93, 1], [1, 1, 0.92, 1]) },
        { scaleX: interpolate(t, [0, 0.86, 0.93, 1], [1, 1, 1.05, 1]) },
      ],
    };
  });

  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={{ width: size * 1.4, height, alignItems: "center" }}
    >
      <Animated.View
        style={[
          { position: "absolute", bottom: 0, transformOrigin: "center bottom" },
          pigStyle,
        ]}
      >
        <PiggyBank size={size} />
      </Animated.View>
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            width: coin,
            height: coin,
            borderRadius: coin / 2,
            alignItems: "center",
            justifyContent: "center",
          },
          coinStyle,
        ]}
        className="border-b-4 border-goldShade bg-gold"
      >
        <AppText
          className="font-display text-night"
          style={{ fontSize: coin * 0.34, lineHeight: coin * 0.4 }}
        >
          +{value}
        </AppText>
      </Animated.View>
    </View>
  );
}
