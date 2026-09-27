import type { ComponentProps } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * The content panel of a bottom sheet shown in a transparent Modal.
 *
 * A SafeAreaView measures itself inside the Modal's own window and reads
 * zero insets there, so buttons landed on the home indicator. Insets come
 * from the app's provider instead, and the panel rides above the keyboard.
 */
export function SheetBody({
  style,
  extraBottom = 8,
  ...props
}: ComponentProps<typeof View> & { extraBottom?: number }) {
  const insets = useSafeAreaInsets();
  const bottom = insets.bottom + extraBottom;
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      // The keyboard already covers the home indicator; don't add that gap
      // on top of the keyboard's height.
      keyboardVerticalOffset={-insets.bottom}
    >
      <View {...props} style={[{ paddingBottom: bottom }, style]} />
    </KeyboardAvoidingView>
  );
}
