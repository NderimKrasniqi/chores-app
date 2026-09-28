import { useQuery } from "convex/react";
import { useState, type ReactNode } from "react";
import { Modal, Pressable, TextInput, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Path, Rect } from "react-native-svg";
import { userErrorMessage } from "@/lib/errors";

import {
  CrewBadge,
  Patch,
  PATCH_LABEL,
  useLoop,
  type PatchKind,
} from "@/components/art";
import { patchesFor } from "@/components/activity/child-activity-feed";
import { localDateKey } from "@/components/activity/approval-activity";
import { useHourNow } from "@/lib/use-hour-now";
import { Easings, PRESS, pressTransition } from "@/components/art/motion";
import {
  avatarToneColor,
  childAvatarTone,
  Avatar,
} from "@/components/ui/avatar";
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

/**
 * A slim header: a small house with a smoking chimney, the family name and
 * who's in it. Just enough warmth; the rows below do the work.
 */
function FamilyBanner({
  name,
  kids,
  parents,
}: {
  name: string;
  kids: number;
  parents: number;
}) {
  const { tokens } = useTheme();
  const smoke = useLoop({ duration: 2800, easing: Easings.linear, rest: 0.3 });
  const puff = (offset: number) => {
    "worklet";
    const t = (smoke.get() + offset) % 1;
    return {
      opacity: interpolate(t, [0, 0.2, 1], [0, 0.7, 0]),
      transform: [
        { translateX: 36 + t * 6 },
        { translateY: 6 - t * 18 },
        { scale: 0.5 + t * 0.7 },
      ],
    };
  };
  const a = useAnimatedStyle(() => puff(0));
  const b = useAnimatedStyle(() => puff(0.5));
  return (
    <View
      accessible
      accessibilityLabel={`${name}: ${kids} ${kids === 1 ? "kid" : "kids"}, ${parents} ${parents === 1 ? "parent" : "parents"}`}
      className="mt-1 flex-row items-center gap-3 rounded-[22px] bg-surface px-4 py-3"
    >
      <View style={{ width: 52, height: 52 }}>
        {[a, b].map((style, i) => (
          <Animated.View
            key={i}
            style={[
              {
                position: "absolute",
                left: 0,
                top: 0,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: tokens.line,
              },
              style,
            ]}
          />
        ))}
        <Svg width={52} height={52} viewBox="0 0 52 52">
          <Rect x={34} y={8} width={7} height={14} rx={1.5} fill={tokens.ink} />
          <Path
            d="M4 26 L26 8 L48 26 Z"
            fill={tokens.urgency}
            stroke={tokens.ink}
            strokeWidth={3}
            strokeLinejoin="round"
          />
          <Rect
            x={10}
            y={25}
            width={32}
            height={22}
            rx={4}
            fill={tokens.reward}
            stroke={tokens.ink}
            strokeWidth={3}
          />
          <Rect x={22} y={34} width={8} height={13} rx={2} fill={tokens.ink} />
        </Svg>
      </View>
      <View className="flex-1">
        <AppText variant="cardTitle" numberOfLines={1}>
          {name}
        </AppText>
        <AppText variant="caption" color="ink-muted">
          {kids} {kids === 1 ? "kid" : "kids"} · {parents}{" "}
          {parents === 1 ? "parent" : "parents"}
        </AppText>
      </View>
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
  linkedPhones,
  stars,
  patches,
}: {
  child: HouseholdSummary["children"][number];
  onOpen: () => void;
  /** undefined while loading. */
  linkedPhones: number | undefined;
  stars: number;
  patches: { kind: PatchKind; count?: number }[];
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
      accessibilityLabel={`${child.displayName}. ${stars} ${stars === 1 ? "star" : "stars"} this week${
        patches.length > 0
          ? `, patches: ${patches.map((patch) => PATCH_LABEL[patch.kind]).join(", ")}`
          : ""
      }. ${status}. Open their page`}
    >
      {/* The same astronaut badge the kid sees on their own Family tab. */}
      <CrewBadge
        name={child.displayName}
        color={avatarToneColor(childAvatarTone(child.displayName), tokens)}
        stars={stars}
        size={48}
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
        {patches.length > 0 ? (
          <View className="mt-1.5 flex-row gap-1">
            {patches.map((patch) => (
              <Patch
                key={patch.kind}
                kind={patch.kind}
                count={patch.count}
                size={20}
              />
            ))}
          </View>
        ) : null}
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
  const hourNow = useHourNow();
  const week = useQuery(
    api.householdActivity.weekForParent,
    visualDeviceCounts
      ? "skip"
      : { householdId: household.householdId, now: hourNow },
  );
  const todayKey = localDateKey(hourNow, household.timezone);
  const crewFor = (childId: string) => {
    const mine = (week?.stars ?? []).filter((star) => star.childId === childId);
    return {
      stars: mine.length,
      patches: patchesFor(mine, household.timezone, todayKey),
    };
  };
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
      <FamilyBanner
        name={household.name}
        kids={household.children.length}
        parents={household.parents.length}
      />

      <AppText variant="sectionTitle" className="mt-5">
        The crew
      </AppText>
      <View className="mt-3 gap-2.5">
        {household.children.map((child) => (
          <KidRow
            key={child.childId}
            child={child}
            onOpen={() => onOpenChildAccess(child.childId)}
            linkedPhones={linkedPhonesFor(child.childId)}
            {...crewFor(child.childId)}
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
        Ground crew
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`House rules: payday ${formatWeekday(household.payoutWeekday)}, ${household.weeklyUnclaimAllowance} abort passes a week, time zone ${shortTimezone(household.timezone)}. Change`}
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
          label="Abort passes"
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
