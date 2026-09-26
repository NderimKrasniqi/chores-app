import { useQuery } from "convex/react";
import { useState, type ReactNode } from "react";
import { Modal, Pressable, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { useLoop } from "@/components/art";
import { Easings, PRESS, pressTransition } from "@/components/art/motion";
import { childAvatarTone, Avatar } from "@/components/ui/avatar";
import { Icon, type IconName } from "@/components/ui/icon";
import { ActionButton, AppText } from "@/design-system";
import { useServerConfirmedMutation } from "@/hooks/use-server-confirmed-mutation";
import { useTheme } from "@/design-system/theme";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { HouseholdSummary } from "./household-types";
import { ParentInviteCard } from "./parent-invite-card";

function shortTimezone(timezone: string) {
  return timezone.split("/").at(-1)?.replaceAll("_", " ") ?? timezone;
}

function formatWeekday(day: string) {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

const ORBIT = 260;

function Orbiter({
  name,
  tone,
  angle,
  radius,
  size,
  delay,
}: {
  name: string;
  tone: Parameters<typeof Avatar>[0]["tone"];
  angle: number;
  radius: number;
  size: number;
  delay: number;
}) {
  const bob = useLoop({ duration: 3600, reverse: true, delay, rest: 0.5 });
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(bob.get(), [0, 1], [-3, 3]) }],
  }));
  const x = ORBIT / 2 + Math.cos(angle) * radius - size / 2;
  const y = ORBIT / 2 + Math.sin(angle) * radius - size / 2;
  return (
    <Animated.View style={[{ position: "absolute", left: x, top: y }, style]}>
      <Avatar
        tone={tone}
        className="rounded-full"
        fallbackLabel={name}
        size={size}
      />
    </Animated.View>
  );
}

/** Home in the middle, parents on the inner ring, kids on the outer one. */
function FamilyOrbit({ household }: { household: HouseholdSummary }) {
  const { tokens } = useTheme();
  const spin = useLoop({ duration: 60000, easing: Easings.linear });
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.get() * 360}deg` }],
  }));
  const c = ORBIT / 2;
  const kids = household.children;
  const parents = household.parents;
  return (
    <View
      accessible
      accessibilityLabel={`${household.name}: ${parents.map((p) => p.displayName).join(", ")} and ${kids.map((k) => k.displayName).join(", ")}`}
      className="items-center"
    >
      <View style={{ width: ORBIT, height: ORBIT }}>
        <Animated.View style={[{ position: "absolute", inset: 0 }, ringStyle]}>
          <Svg width={ORBIT} height={ORBIT}>
            <Circle
              cx={c}
              cy={c}
              r={c - 30}
              fill="none"
              stroke={tokens.line}
              strokeWidth={2}
              strokeDasharray="6 8"
            />
            <Circle
              cx={c}
              cy={c}
              r={62}
              fill="none"
              stroke={tokens.line}
              strokeWidth={2}
              strokeDasharray="4 6"
            />
          </Svg>
        </Animated.View>
        <Svg width={ORBIT} height={ORBIT} style={{ position: "absolute" }}>
          <Circle cx={c} cy={c} r={34} fill={tokens.actionSoft} />
          <Path
            d={`M${c - 18} ${c - 2} L${c} ${c - 18} L${c + 18} ${c - 2} Z`}
            fill={tokens.urgency}
          />
          <Rect
            x={c - 13}
            y={c - 3}
            width={26}
            height={20}
            rx={4}
            fill={tokens.surface}
          />
          <Rect
            x={c - 4}
            y={c + 5}
            width={8}
            height={12}
            rx={2}
            fill={tokens.reward}
          />
        </Svg>
        {parents.map((parent, i) => (
          <Orbiter
            key={parent.membershipId}
            name={parent.displayName}
            tone="parent"
            angle={
              -Math.PI / 2 +
              (i * 2 * Math.PI) / Math.max(1, parents.length) +
              0.6
            }
            radius={62}
            size={34}
            delay={i * 500}
          />
        ))}
        {kids.map((kid, i) => (
          <Orbiter
            key={kid.childId}
            name={kid.displayName}
            tone={childAvatarTone(kid.displayName)}
            angle={-Math.PI / 2 + (i * 2 * Math.PI) / Math.max(1, kids.length)}
            radius={c - 30}
            size={48}
            delay={300 + i * 700}
          />
        ))}
      </View>
      <AppText variant="sectionTitle" className="mt-1 text-center">
        {household.name}
      </AppText>
      <AppText variant="caption" color="ink-muted" className="text-center">
        {kids.length} {kids.length === 1 ? "kid" : "kids"} · {parents.length}{" "}
        {parents.length === 1 ? "parent" : "parents"}
      </AppText>
    </View>
  );
}

function Row({
  onPress,
  accessibilityLabel,
  children,
}: {
  onPress?: () => void;
  accessibilityLabel: string;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel}
      disabled={!onPress}
      onPress={onPress}
    >
      {({ pressed }) => (
        <Animated.View
          className="min-h-[68px] flex-row items-center gap-3 rounded-[22px] bg-surface px-4 py-3"
          style={[
            { transform: [{ scale: pressed ? PRESS.scale : 1 }] },
            pressTransition,
          ]}
        >
          {children}
        </Animated.View>
      )}
    </Pressable>
  );
}

function KidRow({
  child,
  onOpen,
  visualDeviceCount,
}: {
  child: HouseholdSummary["children"][number];
  onOpen: () => void;
  visualDeviceCount?: number;
}) {
  const { tokens } = useTheme();
  const devices = useQuery(
    api.childAccess.listDevicesForChild,
    visualDeviceCount === undefined ? { childId: child.childId } : "skip",
  );
  const activeCount =
    visualDeviceCount ??
    devices?.filter((device) => device.isActive).length ??
    0;
  const loaded = visualDeviceCount !== undefined || devices !== undefined;
  const status = !loaded
    ? "Checking phones…"
    : activeCount > 0
      ? `${activeCount} linked ${activeCount === 1 ? "phone" : "phones"}`
      : "No phone linked yet";
  return (
    <Row
      onPress={onOpen}
      accessibilityLabel={`${child.displayName}. ${status}. Manage phones`}
    >
      <Avatar
        tone={childAvatarTone(child.displayName)}
        className="rounded-full"
        fallbackLabel={child.displayName}
        size={44}
      />
      <View className="flex-1">
        <AppText variant="cardTitle">{child.displayName}</AppText>
        <View className="mt-0.5 flex-row items-center gap-1.5">
          <Icon
            name="phone"
            color={activeCount > 0 ? tokens.action : tokens.inkMuted}
            size={14}
          />
          <AppText
            variant="caption"
            color={activeCount > 0 ? "action" : "ink-muted"}
          >
            {status}
          </AppText>
        </View>
      </View>
      {loaded && activeCount === 0 ? (
        <View
          className="rounded-full px-3 py-1.5"
          style={{ backgroundColor: tokens.action }}
        >
          <AppText variant="label" style={{ color: tokens.onAction }}>
            Link phone
          </AppText>
        </View>
      ) : (
        <Icon name="chevron" color={tokens.inkMuted} size={20} />
      )}
    </Row>
  );
}

function RuleToken({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  const { tokens } = useTheme();
  return (
    <View className="flex-1 items-center rounded-[20px] bg-surface px-2 py-3">
      <Icon name={icon} color={tokens.action} size={20} />
      <AppText variant="caption" color="ink-muted" className="mt-1.5">
        {label}
      </AppText>
      <AppText variant="label" className="mt-0.5 text-center" numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

export function ParentFamilyContent({
  household,
  onOpenSettings,
  onOpenChildAccess,
  visualDeviceCounts,
}: {
  household: HouseholdSummary;
  onOpenSettings: () => void;
  onOpenChildAccess: (childId: Id<"children">) => void;
  visualDeviceCounts?: Partial<Record<string, number>>;
}) {
  const { tokens } = useTheme();
  const [showInvite, setShowInvite] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const addChild = useServerConfirmedMutation(api.households.addChild);

  async function saveKid() {
    setSaving(true);
    setAddError(null);
    try {
      await addChild({
        householdId: household.householdId,
        displayName: newName,
      });
      setAdding(false);
      setNewName("");
    } catch (error) {
      setAddError(error instanceof Error ? error.message : "Could not add.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="pb-8">
      <FamilyOrbit household={household} />

      <AppText variant="sectionTitle" className="mt-6">
        Kids
      </AppText>
      <View className="mt-3 gap-2.5">
        {household.children.map((child) => (
          <KidRow
            key={child.childId}
            child={child}
            onOpen={() => onOpenChildAccess(child.childId)}
            visualDeviceCount={visualDeviceCounts?.[child.childId]}
          />
        ))}
        <Row
          onPress={() => {
            setAddError(null);
            setAdding(true);
          }}
          accessibilityLabel="Add a kid"
        >
          <View
            className="h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: tokens.actionSoft }}
          >
            <Icon name="plus" color={tokens.action} size={20} />
          </View>
          <AppText variant="cardTitle" color="action" className="flex-1">
            Add a kid
          </AppText>
        </Row>
      </View>

      <AppText variant="sectionTitle" className="mt-6">
        Parents
      </AppText>
      <View className="mt-3 gap-2.5">
        {household.parents.map((parent) => (
          <Row
            key={parent.membershipId}
            accessibilityLabel={`${parent.displayName}${parent.isCurrent ? ", you" : ""}. Same controls as every parent.`}
          >
            <Avatar
              tone="parent"
              className="rounded-full"
              fallbackLabel={parent.displayName}
              size={44}
            />
            <View className="flex-1">
              <AppText variant="cardTitle">
                {parent.displayName}
                {parent.isCurrent ? " (you)" : ""}
              </AppText>
              <AppText variant="caption" color="ink-muted">
                Same controls as every parent
              </AppText>
            </View>
          </Row>
        ))}
        <Row
          onPress={() => setShowInvite(true)}
          accessibilityLabel="Invite another parent"
        >
          <View
            className="h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: tokens.actionSoft }}
          >
            <Icon name="personPlus" color={tokens.action} size={20} />
          </View>
          <AppText variant="cardTitle" color="action" className="flex-1">
            Invite another parent
          </AppText>
          <Icon name="chevron" color={tokens.inkMuted} size={20} />
        </Row>
      </View>

      <View className="mt-6 flex-row items-baseline justify-between">
        <AppText variant="sectionTitle">House rules</AppText>
        <Pressable
          accessibilityRole="button"
          onPress={onOpenSettings}
          hitSlop={8}
        >
          <AppText variant="label" color="action">
            Change
          </AppText>
        </Pressable>
      </View>
      <View className="mt-3 flex-row gap-2.5">
        <RuleToken
          icon="calendar"
          label="Payday"
          value={formatWeekday(household.payoutWeekday)}
        />
        <RuleToken
          icon="key"
          label="Unclaims"
          value={`${household.weeklyUnclaimAllowance} a week`}
        />
        <RuleToken
          icon="globe"
          label="Time zone"
          value={shortTimezone(household.timezone)}
        />
      </View>

      <Modal
        transparent
        animationType="slide"
        visible={adding}
        onRequestClose={() => !saving && setAdding(false)}
      >
        <View className="flex-1 justify-end bg-scrim">
          <SafeAreaView
            edges={["bottom"]}
            className="rounded-t-sheet px-5 pb-2 pt-5"
            style={{ backgroundColor: tokens.canvas }}
          >
            <AppText variant="sectionTitle">Add a kid</AppText>
            <AppText color="ink-muted" className="mt-1">
              Then link their phone from their page.
            </AppText>
            <TextInput
              accessibilityLabel="First name"
              value={newName}
              onChangeText={setNewName}
              placeholder="First name"
              placeholderTextColor={tokens.inkFaint}
              autoFocus
              maxLength={40}
              className="mt-4 min-h-[52px] rounded-[16px] px-4 font-body-heavy text-ink"
              style={{ backgroundColor: tokens.surfaceMuted }}
            />
            {addError ? (
              <AppText variant="bodySmall" color="urgency" className="mt-3">
                {addError}
              </AppText>
            ) : null}
            <ActionButton
              className="mt-5"
              label="Add"
              loading={saving}
              disabled={!newName.trim()}
              onPress={() => void saveKid()}
            />
            <ActionButton
              className="mt-1"
              tone="quiet"
              label="Cancel"
              disabled={saving}
              onPress={() => setAdding(false)}
            />
          </SafeAreaView>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        visible={showInvite}
        onRequestClose={() => setShowInvite(false)}
      >
        <ParentInviteCard
          householdId={household.householdId}
          householdName={household.name}
          onClose={() => setShowInvite(false)}
        />
      </Modal>
    </View>
  );
}
