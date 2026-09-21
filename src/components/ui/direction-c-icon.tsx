import { SymbolView } from "expo-symbols";
import { Platform, View } from "react-native";
import type { ComponentProps } from "react";

type SymbolName = ComponentProps<typeof SymbolView>["name"];

const iconNames = {
  home: {
    ios: "house.fill",
    android: "home",
    web: "home",
  },
  extras: {
    ios: "star.fill",
    android: "star",
    web: "star",
  },
  activity: {
    ios: "chart.bar.fill",
    android: "bar_chart",
    web: "bar_chart",
  },
  money: {
    ios: "wallet.bifold.fill",
    android: "account_balance_wallet",
    web: "account_balance_wallet",
  },
  chevron: {
    ios: "chevron.right",
    android: "chevron_right",
    web: "chevron_right",
  },
  chevronDown: {
    ios: "chevron.down",
    android: "expand_more",
    web: "expand_more",
  },
  clock: {
    ios: "clock.fill",
    android: "schedule",
    web: "schedule",
  },
  key: {
    ios: "key.fill",
    android: "key",
    web: "key",
  },
  waiting: {
    ios: "hourglass",
    android: "hourglass_top",
    web: "hourglass_top",
  },
  checklist: {
    ios: "checklist",
    android: "checklist",
    web: "checklist",
  },
  chores: {
    ios: "list.clipboard.fill",
    android: "assignment",
    web: "assignment",
  },
  reviews: {
    ios: "checkmark.circle.fill",
    android: "task_alt",
    web: "task_alt",
  },
  family: {
    ios: "person.3.fill",
    android: "groups",
    web: "groups",
  },
  housePair: {
    ios: "building.2.fill",
    android: "other_houses",
    web: "other_houses",
  },
  plus: {
    ios: "plus",
    android: "add",
    web: "add",
  },
  personPlus: {
    ios: "person.badge.plus",
    android: "person_add",
    web: "person_add",
  },
  minus: {
    ios: "minus",
    android: "remove",
    web: "remove",
  },
  calendar: {
    ios: "calendar",
    android: "calendar_month",
    web: "calendar_month",
  },
  globe: {
    ios: "globe",
    android: "language",
    web: "language",
  },
  refresh: {
    ios: "arrow.trianglehead.2.clockwise.rotate.90",
    android: "refresh",
    web: "refresh",
  },
  phone: {
    ios: "iphone",
    android: "smartphone",
    web: "smartphone",
  },
  deviceOff: {
    ios: "iphone.slash",
    android: "phonelink_erase",
    web: "phonelink_erase",
  },
  info: {
    ios: "info.circle",
    android: "info",
    web: "info",
  },
  share: {
    ios: "square.and.arrow.up",
    android: "share",
    web: "share",
  },
  close: {
    ios: "xmark",
    android: "close",
    web: "close",
  },
  back: {
    ios: "chevron.left",
    android: "chevron_left",
    web: "chevron_left",
  },
  person: {
    ios: "person.2.fill",
    android: "group",
    web: "group",
  },
  devices: {
    ios: "iphone.gen3.radiowaves.left.and.right",
    android: "devices",
    web: "devices",
  },
  scan: {
    ios: "viewfinder",
    android: "center_focus_strong",
    web: "center_focus_strong",
  },
  qrCode: {
    ios: "qrcode",
    android: "qr_code_2",
    web: "qr_code_2",
  },
  check: {
    ios: "checkmark",
    android: "check",
    web: "check",
  },
  checkShield: {
    ios: "checkmark.shield.fill",
    android: "verified_user",
    web: "verified_user",
  },
  brokenLink: {
    ios: "link",
    android: "link_off",
    web: "link_off",
  },
  link: {
    ios: "link",
    android: "link",
    web: "link",
  },
  bell: {
    ios: "bell.fill",
    android: "notifications",
    web: "notifications",
  },
  help: {
    ios: "questionmark.circle.fill",
    android: "help",
    web: "help",
  },
  lockSwitch: {
    ios: "lock.rotation",
    android: "switch_account",
    web: "switch_account",
  },
  lock: {
    ios: "lock.fill",
    android: "lock",
    web: "lock",
  },
  star: {
    ios: "star.fill",
    android: "star",
    web: "star",
  },
  camera: {
    ios: "camera.fill",
    android: "photo_camera",
    web: "photo_camera",
  },
  photo: {
    ios: "photo.fill",
    android: "image",
    web: "image",
  },
  trash: {
    ios: "trash.fill",
    android: "delete",
    web: "delete",
  },
  tag: {
    ios: "tag.fill",
    android: "sell",
    web: "sell",
  },
  document: {
    ios: "doc.text.fill",
    android: "description",
    web: "description",
  },
  redo: {
    ios: "arrow.clockwise",
    android: "refresh",
    web: "refresh",
  },
  repeat: {
    ios: "arrow.trianglehead.2.clockwise.rotate.90",
    android: "repeat",
    web: "repeat",
  },
  edit: {
    ios: "pencil",
    android: "edit",
    web: "edit",
  },
  more: {
    ios: "ellipsis",
    android: "more_horiz",
    web: "more_horiz",
  },
  missed: {
    ios: "clock.badge.xmark.fill",
    android: "timer_off",
    web: "timer_off",
  },
} satisfies Record<string, SymbolName>;

export type DirectionCIconName = keyof typeof iconNames;

export function DirectionCIcon({
  name,
  color,
  size = 24,
}: {
  name: DirectionCIconName;
  color: string;
  size?: number;
}) {
  if (name === "brokenLink" && Platform.OS === "ios") {
    return (
      <View
        pointerEvents="none"
        style={{
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <SymbolView
          name={iconNames[name]}
          size={size}
          tintColor={color}
          weight="semibold"
        />
        <View
          style={{
            position: "absolute",
            width: Math.max(2, size * 0.1),
            height: size * 0.72,
            borderRadius: size * 0.05,
            backgroundColor: color,
            transform: [{ rotate: "45deg" }],
          }}
        />
        <View
          style={{
            position: "absolute",
            width: Math.max(2, size * 0.1),
            height: size * 0.72,
            borderRadius: size * 0.05,
            backgroundColor: color,
            transform: [{ rotate: "-45deg" }],
          }}
        />
      </View>
    );
  }

  return (
    <SymbolView
      name={iconNames[name]}
      size={size}
      tintColor={color}
      weight="semibold"
    />
  );
}
