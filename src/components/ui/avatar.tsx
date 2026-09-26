import { Text, View } from "react-native";

export type AvatarTone = "alex" | "maya" | "parent" | "sky" | "sun";

// Letter avatars in palette colours. Tones rotate so siblings stay distinct.
const toneClass: Record<AvatarTone, string> = {
  alex: "bg-pink",
  maya: "bg-primary",
  parent: "bg-accent",
  sky: "bg-nightDash",
  sun: "bg-gold",
};

const childTones: AvatarTone[] = ["alex", "maya", "sun", "sky"];

/** Stable tone per child name, so the same child always gets the same colour. */
export function childAvatarTone(displayName: string): AvatarTone {
  const name = displayName.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return childTones[hash % childTones.length];
}

export function Avatar({
  tone,
  className,
  fallbackLabel,
  size,
}: {
  /** Kept for call-site compatibility; avatars are letter-based. */
  source?: number | null;
  tone: AvatarTone;
  className: string;
  fallbackLabel?: string;
  /** Explicit diameter; the letter scales with it. */
  size?: number;
}) {
  return (
    <View
      className={`items-center justify-center overflow-hidden rounded-full ${toneClass[tone]} ${className}`}
      style={size ? { width: size, height: size } : undefined}
    >
      <Text
        className="font-display text-[22px] text-night"
        style={
          size ? { fontSize: size * 0.46, lineHeight: size * 0.56 } : undefined
        }
      >
        {fallbackLabel?.trim().charAt(0).toUpperCase() || "?"}
      </Text>
    </View>
  );
}
