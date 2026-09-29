import * as Haptics from "expo-haptics";
import { useEffect, useState, type ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { Easings } from "@/components/art/motion";

import { SheetBody } from "./sheet-body";
import { ThemeScope, useTheme } from "./theme";

const OPEN_MS = 300;
const CLOSE_MS = 250;
const FADE_MS = 200;

/**
 * A bottom sheet over a dimmed screen. The dim fades in place while only
 * the sheet slides up (a native `animationType="slide"` moved both, so the
 * veil rose like a wall). The grabber drags: a flick or a long pull closes
 * it, a short one springs back.
 *
 * Stays mounted through the exit animation; `onClose` asks the parent to
 * set `visible` false. `dismissible={false}` (e.g. while sending) blocks
 * the scrim tap, the drag and the back button.
 */
export function ScrimSheet({
  visible,
  onClose,
  dismissible = true,
  className = "rounded-t-sheet bg-surface px-5 pb-3 pt-3",
  grabberClassName = "bg-nightRaised",
  extraBottom,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  dismissible?: boolean;
  className?: string;
  grabberClassName?: string;
  /** Extra space under the content, above the home indicator. */
  extraBottom?: number;
  children: ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  // A Modal renders outside the screen's theme view: carry the mode in.
  const { mode } = useTheme();
  const [mounted, setMounted] = useState(visible);
  const [height, setHeight] = useState(0);
  const progress = useSharedValue(0);
  const drag = useSharedValue(0);

  // Mount as soon as it should show (adjusting state during render).
  if (visible && !mounted) setMounted(true);

  // After a drag-dismiss, if the parent didn't close the sheet (busy), it
  // springs back instead of hiding off-screen behind the dim.
  const [dragCloses, setDragCloses] = useState(0);
  function dragDismissed() {
    onClose();
    setDragCloses((count) => count + 1);
  }
  useEffect(() => {
    if (dragCloses === 0 || !visible) return;
    const timer = setTimeout(
      () => drag.set(withSpring(0, { duration: 300, dampingRatio: 0.8 })),
      60,
    );
    return () => clearTimeout(timer);
  }, [dragCloses, visible, drag]);

  useEffect(() => {
    if (!mounted) return;
    if (visible) {
      drag.set(0);
      progress.set(
        withTiming(1, {
          duration: reducedMotion ? FADE_MS : OPEN_MS,
          easing: Easings.sheet,
        }),
      );
      return;
    }
    progress.set(
      withTiming(
        0,
        {
          duration: reducedMotion ? FADE_MS : CLOSE_MS,
          easing: Easings.sheet,
        },
        (finished) => {
          if (finished) scheduleOnRN(setMounted, false);
        },
      ),
    );
  }, [visible, mounted, reducedMotion, progress, drag]);

  const pan = Gesture.Pan()
    .enabled(dismissible)
    .activeOffsetY([-10, 10])
    .failOffsetX([-20, 20])
    .onUpdate((event) => {
      const dy = event.translationY;
      // Up rubber-bands; down follows the finger.
      drag.set(dy < 0 ? (reducedMotion ? 0 : dy / 4) : dy);
    })
    .onEnd((event) => {
      const pastHalf = drag.get() + event.velocityY * 0.2 > height * 0.4;
      if (pastHalf || event.velocityY > 800) {
        drag.set(
          withSpring(height, {
            duration: 300,
            dampingRatio: 1,
            velocity: event.velocityY,
            overshootClamping: true,
          }),
        );
        scheduleOnRN(dragDismissed);
      } else {
        drag.set(
          withSpring(0, {
            duration: 300,
            dampingRatio: 0.8,
            velocity: event.velocityY,
          }),
        );
        scheduleOnRN(Haptics.impactAsync, Haptics.ImpactFeedbackStyle.Light);
      }
    });

  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const sheetStyle = useAnimatedStyle(() => {
    const p = progress.get();
    if (reducedMotion) {
      return { opacity: p, transform: [{ translateY: drag.get() }] };
    }
    // Hidden until measured, so the first frame isn't a flash in place.
    const offset = height > 0 ? (1 - p) * height : 2000;
    return { transform: [{ translateY: offset + drag.get() }] };
  });

  if (!mounted) return null;

  return (
    <Modal
      transparent
      animationType="none"
      statusBarTranslucent
      visible
      onRequestClose={() => {
        if (dismissible && visible) onClose();
      }}
    >
      {/* No touches while closing: its buttons still show the last content. */}
      <GestureHandlerRootView
        style={styles.fill}
        pointerEvents={visible ? "auto" : "none"}
      >
        <ThemeScope mode={mode}>
          <Animated.View
            className="bg-scrim"
            style={[StyleSheet.absoluteFill, scrimStyle]}
          >
            <Pressable
              style={styles.fill}
              accessibilityRole={dismissible ? "button" : undefined}
              accessibilityLabel={dismissible ? "Close" : undefined}
              disabled={!dismissible}
              onPress={onClose}
            />
          </Animated.View>
          <View style={styles.fill} pointerEvents="box-none">
            <View className="flex-1" pointerEvents="none" />
            <Animated.View
              accessibilityViewIsModal
              style={sheetStyle}
              onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
            >
              <SheetBody className={className} extraBottom={extraBottom}>
                <GestureDetector gesture={pan}>
                  {/* The grabber, with room around it to catch the drag. */}
                  <View className="-mx-5 -mt-3 items-center pb-2 pt-3">
                    <View
                      className={`h-1.5 w-12 rounded-full ${grabberClassName}`}
                    />
                  </View>
                </GestureDetector>
                {children}
              </SheetBody>
            </Animated.View>
          </View>
        </ThemeScope>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
