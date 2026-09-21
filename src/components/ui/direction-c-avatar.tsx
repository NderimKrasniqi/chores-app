import { AppImage as Image } from "./app-image";
import { Text, View } from "react-native";

type DirectionCAvatarTone = "alex" | "maya" | "parent";

const toneClass: Record<DirectionCAvatarTone, string> = {
  alex: "bg-[#FBE4D2]",
  maya: "bg-[#EEE7FA]",
  parent: "bg-[#FBE4D2]",
};

export function childAvatarTone(displayName: string): DirectionCAvatarTone {
  return displayName.trim().toLowerCase() === "maya" ? "maya" : "alex";
}

export function DirectionCAvatar({
  source,
  tone,
  className,
  fallbackLabel,
}: {
  source: number | null;
  tone: DirectionCAvatarTone;
  className: string;
  fallbackLabel?: string;
}) {
  return (
    <View
      className={`items-center justify-center overflow-hidden rounded-full ${toneClass[tone]} ${className}`}
    >
      {source ? (
        <Image
          source={source}
          className="h-full w-full"
          contentFit="contain"
          accessible={false}
        />
      ) : (
        <Text className="font-rounded text-[24px] font-black text-ink">
          {fallbackLabel?.trim().charAt(0).toUpperCase() || "?"}
        </Text>
      )}
    </View>
  );
}
