import { SymbolView } from "expo-symbols";
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
  plus: {
    ios: "plus",
    android: "add",
    web: "add",
  },
  calendar: {
    ios: "calendar",
    android: "calendar_month",
    web: "calendar_month",
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
    ios: "link.badge.plus",
    android: "link_off",
    web: "link_off",
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
  return (
    <SymbolView
      name={iconNames[name]}
      size={size}
      tintColor={color}
      weight="semibold"
    />
  );
}
