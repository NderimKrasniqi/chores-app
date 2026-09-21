import { Image as ExpoImage } from "expo-image";
import { cssInterop } from "nativewind";

export const AppImage = cssInterop(ExpoImage, { className: "style" });
