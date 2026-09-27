import { useQuery } from "convex/react";
import { useState, type ReactNode } from "react";
import { Modal, Pressable, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import { userErrorMessage } from "@/lib/errors";

import { FamilyHouse } from "@/components/art";
import { PRESS, pressTransition } from "@/components/art/motion";
import { childAvatarTone, Avatar } from "@/components/ui/avatar";
import { Icon, type IconName } from "@/components/ui/icon";
import { ActionButton, AppText, SheetBody } from "@/design-system";
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
  linkedPhones,
}: {
  child: HouseholdSummary["children"][number];
  onOpen: () => void;
  /** undefined while loading. */
  linkedPhones: number | undefined;
}) {
  const { tokens } = useTheme();
  const activeCount = linkedPhones ?? 0;
  const loaded = linkedPhones !== undefined;
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
    <View
      pointerEvents="none"
      className="flex-1 items-center rounded-[20px] bg-surface px-2 py-3"
    >
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
  const deviceCounts = useQuery(
    api.childAccess.listActiveDeviceCountsForHousehold,
    visualDeviceCounts ? "skip" : { householdId: household.householdId },
  );
  const linkedPhonesFor = (childId: string) =>
    visualDeviceCounts
      ? (visualDeviceCounts[childId] ?? 0)
      : deviceCounts === undefined
        ? undefined
        : (deviceCounts.find((row) => row.childId === childId)?.activeCount ??
          0);

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
      setAddError(userErrorMessage(error, "Could not add."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="pb-8">
      <FamilyHouse
        householdName={household.name}
        parents={household.parents.map((parent) => ({
          id: parent.membershipId,
          name: parent.displayName,
          isCurrent: parent.isCurrent,
        }))}
        kids={household.children.map((child) => ({
          id: child.childId,
          name: child.displayName,
          linkedPhones: linkedPhonesFor(child.childId),
        }))}
        onOpenKid={(id) => onOpenChildAccess(id as Id<"children">)}
        onAddKid={() => {
          setAddError(null);
          setAdding(true);
        }}
        onInviteParent={() => setShowInvite(true)}
      />

      <AppText variant="sectionTitle" className="mt-6">
        Kids
      </AppText>
      <View className="mt-3 gap-2.5">
        {household.children.map((child) => (
          <KidRow
            key={child.childId}
            child={child}
            onOpen={() => onOpenChildAccess(child.childId)}
            linkedPhones={linkedPhonesFor(child.childId)}
          />
        ))}
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`House rules: payday ${formatWeekday(household.payoutWeekday)}, ${household.weeklyUnclaimAllowance} unclaims a week, time zone ${shortTimezone(household.timezone)}. Change`}
        onPress={onOpenSettings}
        className="mt-3 flex-row gap-2.5"
      >
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
      </Pressable>

      <Modal
        transparent
        animationType="slide"
        visible={adding}
        onRequestClose={() => !saving && setAdding(false)}
      >
        <View className="flex-1 justify-end bg-scrim">
          <SheetBody
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
          </SheetBody>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        presentationStyle="pageSheet"
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
