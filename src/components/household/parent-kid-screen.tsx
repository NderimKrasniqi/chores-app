import { useQuery } from "convex/react";
import { useEffect, useState, type ReactNode } from "react";
import { AppState, Modal, Pressable, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ChoreIcon } from "@/components/art";
import { ActiveClaimableClaimsView } from "@/components/chores/active-claimable-claims-view";
import { childAvatarTone, Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { ActionButton, AppText } from "@/design-system";
import { useTheme } from "@/design-system/theme";
import { useServerConfirmedMutation } from "@/hooks/use-server-confirmed-mutation";

import { api } from "../../../convex/_generated/api";
import type { HouseholdSummary } from "./household-types";
import { ActionRow, ScreenFrame } from "./parent-secondary-screens";

type ChoreState =
  | "scheduled"
  | "available"
  | "submitted"
  | "redo_required"
  | "approved"
  | "missed"
  | "failed"
  | "cancelled"
  | "expired_unclaimed";

const BLOCKER_COPY: Record<string, string> = {
  balance: "their balance isn’t 0 kr yet",
  pending_payout: "a payout is waiting to be paid",
  active_extra: "they have an Extra in progress",
  awaiting_review: "some work is waiting for review",
};

function stateBadge(
  state: ChoreState,
  value: number,
  tokens: ReturnType<typeof useTheme>["tokens"],
) {
  switch (state) {
    case "approved":
      return { label: `+${value} kr`, color: tokens.action };
    case "submitted":
      return { label: "To check", color: tokens.info };
    case "redo_required":
      return { label: "Redo", color: tokens.urgency };
    case "missed":
    case "failed":
      return { label: "Missed · 0 kr", color: tokens.inkMuted };
    case "scheduled":
      return { label: "Coming up", color: tokens.inkMuted };
    case "available":
      return { label: "To do", color: tokens.reward };
    default:
      return { label: "—", color: tokens.inkMuted };
  }
}

function dayLabel(timestamp: number, timezone: string, now: number) {
  const key = (value: number) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  if (key(timestamp) === key(now)) return "Today";
  if (key(timestamp) === key(now - 86_400_000)) return "Yesterday";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    weekday: "short",
    day: "numeric",
  }).format(new Date(timestamp));
}

/**
 * One kid, everything a Parent needs: balance, their chores this week and
 * how each went, this payout week's coins, their active Extra (with the
 * no-penalty cancel), their phones, and rename / remove.
 */
export function ParentKidScreen({
  household,
  child,
  onBack,
  onOpenPhones,
  onRemoved,
}: {
  household: HouseholdSummary;
  child: HouseholdSummary["children"][number];
  onBack: () => void;
  onOpenPhones: () => void;
  onRemoved: () => void;
}) {
  const { tokens } = useTheme();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setNow(Date.now());
    });
    return () => subscription.remove();
  }, []);

  const overview = useQuery(api.childOverview.getForParent, {
    childId: child.childId,
    now,
  });
  const claims = useQuery(api.claimableChores.listActiveForParent, {
    householdId: household.householdId,
  });
  const cancelClaim = useServerConfirmedMutation(
    api.claimableClaimCancellations.cancelForParent,
  );
  const renameChild = useServerConfirmedMutation(api.households.renameChild);
  const archiveChild = useServerConfirmedMutation(api.households.archiveChild);

  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(child.displayName);
  const [removing, setRemoving] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const myClaims = (claims ?? []).filter(
    (claim) => claim.childId === child.childId,
  );
  const weekTotal = (overview?.entries ?? []).reduce(
    (sum, entry) => sum + entry.amountSek,
    0,
  );

  async function saveName() {
    setWorking(true);
    setMessage(null);
    try {
      await renameChild({ childId: child.childId, displayName: name });
      setRenaming(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not rename.");
    } finally {
      setWorking(false);
    }
  }

  async function remove() {
    setWorking(true);
    setMessage(null);
    try {
      const result = await archiveChild({ childId: child.childId });
      if (result.status === "archived") {
        setRemoving(false);
        onRemoved();
      } else {
        setMessage(
          `Not yet — ${result.blockers.map((blocker) => BLOCKER_COPY[blocker]).join(", and ")}. Settle that first.`,
        );
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove.");
    } finally {
      setWorking(false);
    }
  }

  const timezone = overview?.timezone ?? household.timezone;

  return (
    <ScreenFrame title={child.displayName} onBack={onBack}>
      <View
        className="mt-1 flex-row items-center gap-4 rounded-[26px] p-5"
        style={{ backgroundColor: tokens.surface }}
      >
        <Avatar
          tone={childAvatarTone(child.displayName)}
          className="rounded-full"
          fallbackLabel={child.displayName}
          size={64}
        />
        <View className="flex-1">
          <AppText variant="label" color="ink-muted">
            Balance
          </AppText>
          <AppText
            variant="display"
            color={(overview?.runningBalanceSek ?? 0) < 0 ? "urgency" : "ink"}
          >
            {overview ? `${overview.runningBalanceSek} kr` : "…"}
          </AppText>
          {overview ? (
            <AppText variant="caption" color="ink-muted">
              {weekTotal >= 0 ? "+" : "−"}
              {Math.abs(weekTotal)} kr this payout week
            </AppText>
          ) : null}
        </View>
      </View>

      {myClaims.length > 0 ? (
        <ActiveClaimableClaimsView
          claims={myClaims}
          homeVariant
          onCancel={async (claimId) => {
            await cancelClaim({
              householdId: household.householdId,
              claimId,
            });
          }}
        />
      ) : null}

      <AppText variant="sectionTitle" className="mt-6">
        Their chores
      </AppText>
      <View className="mt-3 gap-2">
        {!overview ? (
          <AppText color="ink-muted">Loading…</AppText>
        ) : overview.chores.length === 0 ? (
          <View
            className="rounded-[20px] p-4"
            style={{ backgroundColor: tokens.surface }}
          >
            <AppText color="ink-muted">
              No chores for {child.displayName} this week.
            </AppText>
          </View>
        ) : (
          overview.chores.map((chore) => {
            const badge = stateBadge(chore.state, chore.valueSek, tokens);
            return (
              <View
                key={chore.occurrenceId}
                className="flex-row items-center gap-3 rounded-[18px] px-3 py-2.5"
                style={{ backgroundColor: tokens.surface }}
                accessible
                accessibilityLabel={`${chore.title}, ${dayLabel(chore.deadlineAt, timezone, now)}, ${badge.label}`}
              >
                <ChoreIcon title={chore.title} size={40} animated={false} />
                <View className="flex-1">
                  <AppText variant="label" numberOfLines={1}>
                    {chore.title}
                  </AppText>
                  <AppText variant="caption" color="ink-muted">
                    {dayLabel(chore.deadlineAt, timezone, now)}
                    {chore.isUnlockChore ? " · unlocks Extras" : ""}
                  </AppText>
                </View>
                <AppText variant="label" style={{ color: badge.color }}>
                  {badge.label}
                </AppText>
              </View>
            );
          })
        )}
      </View>

      {overview && overview.entries.length > 0 ? (
        <>
          <AppText variant="sectionTitle" className="mt-6">
            This week’s coins
          </AppText>
          <View className="mt-3 gap-2">
            {overview.entries.slice(0, 12).map((entry, index) => {
              const penalty = entry.kind === "penalty";
              return (
                <View
                  key={`${entry.createdAt}-${index}`}
                  className="flex-row items-center gap-3 rounded-[16px] px-4 py-2.5"
                  style={{ backgroundColor: tokens.surface }}
                >
                  <Icon
                    name={penalty ? "minus" : "plus"}
                    color={penalty ? tokens.urgency : tokens.action}
                    size={16}
                  />
                  <AppText className="flex-1" numberOfLines={1}>
                    {entry.choreTitle ?? "A chore"}
                    {penalty ? " · Extra not finished" : ""}
                  </AppText>
                  <AppText
                    variant="label"
                    color={penalty ? "urgency" : "action"}
                  >
                    {entry.amountSek > 0 ? "+" : "−"}
                    {Math.abs(entry.amountSek)} kr
                  </AppText>
                </View>
              );
            })}
          </View>
        </>
      ) : null}

      <View className="mt-6 gap-2.5">
        <ActionRow
          icon="phone"
          title="Phones"
          subtitle="Link or unlink their devices"
          onPress={onOpenPhones}
        />
        <ActionRow
          icon="edit"
          title="Rename"
          subtitle={`Currently “${child.displayName}”`}
          onPress={() => {
            setName(child.displayName);
            setMessage(null);
            setRenaming(true);
          }}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setMessage(null);
          setRemoving(true);
        }}
        className="mt-8 min-h-[44px] items-center justify-center"
      >
        <AppText variant="label" color="urgency">
          Remove {child.displayName} from the household
        </AppText>
      </Pressable>

      <Sheet visible={renaming} onClose={() => !working && setRenaming(false)}>
        <AppText variant="sectionTitle">Rename</AppText>
        <TextInput
          accessibilityLabel="Name"
          value={name}
          onChangeText={setName}
          autoFocus
          maxLength={40}
          className="mt-4 min-h-[52px] rounded-[16px] px-4 font-body-heavy text-ink"
          style={{ backgroundColor: tokens.surfaceMuted }}
        />
        {message ? (
          <AppText variant="bodySmall" color="urgency" className="mt-3">
            {message}
          </AppText>
        ) : null}
        <ActionButton
          className="mt-5"
          label="Save"
          loading={working}
          disabled={!name.trim() || name.trim() === child.displayName}
          onPress={() => void saveName()}
        />
      </Sheet>

      <Sheet visible={removing} onClose={() => !working && setRemoving(false)}>
        <AppText variant="sectionTitle">Remove {child.displayName}?</AppText>
        <AppText color="ink-muted" className="mt-2">
          Their phones are unlinked and their chores stop. Past chores, wins and
          payouts stay in the history. You can only remove a kid once everything
          is settled.
        </AppText>
        {message ? (
          <AppText variant="bodySmall" color="urgency" className="mt-3">
            {message}
          </AppText>
        ) : null}
        <ActionButton
          className="mt-5"
          tone="destructive"
          label={`Remove ${child.displayName}`}
          loading={working}
          onPress={() => void remove()}
        />
        <ActionButton
          className="mt-1"
          tone="quiet"
          label="Keep"
          disabled={working}
          onPress={() => setRemoving(false)}
        />
      </Sheet>
    </ScreenFrame>
  );
}

function Sheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const { tokens } = useTheme();
  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable
        accessible={false}
        onPress={onClose}
        className="flex-1 justify-end bg-scrim"
      >
        <Pressable accessible={false} onPress={() => {}}>
          <SafeAreaView
            edges={["bottom"]}
            className="rounded-t-sheet px-5 pb-2 pt-5"
            style={{ backgroundColor: tokens.canvas }}
          >
            {children}
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
