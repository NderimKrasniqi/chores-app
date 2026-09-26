import { useAction, useQuery } from "convex/react";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Share, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { useLoop } from "@/components/art";
import { Icon } from "@/components/ui/icon";
import { ActionButton, AppText } from "@/design-system";
import { useTheme } from "@/design-system/theme";
import { useServerConfirmedMutation } from "@/hooks/use-server-confirmed-mutation";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type ParentInviteCardProps = {
  householdId: Id<"households">;
  householdName: string;
  onClose: () => void;
};

type InviteFeedback = "generated" | "regenerated" | "revoked" | null;

export type ParentInviteVisualFixture = {
  activeInviteExists: boolean;
  rawToken?: string;
  feedback?: InviteFeedback;
  showRevokeConfirmation?: boolean;
};

/** A sealed invite that bobs gently; the seal turns green once sent out. */
function InviteSeal({ ready }: { ready: boolean }) {
  const { tokens } = useTheme();
  const bob = useLoop({ duration: 3000, reverse: true, rest: 0.5 });
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(bob.get(), [0, 1], [-4, 4]) },
      { rotate: `${interpolate(bob.get(), [0, 1], [-3, 3])}deg` },
    ],
  }));
  return (
    <Animated.View style={[{ alignSelf: "center" }, style]} accessible={false}>
      <Svg width={170} height={120}>
        <Rect
          x={10}
          y={20}
          width={150}
          height={96}
          rx={12}
          fill={tokens.surface}
        />
        <Path
          d="M10 30 L85 78 L160 30"
          fill="none"
          stroke={tokens.line}
          strokeWidth={4}
          strokeLinejoin="round"
        />
        <Circle
          cx={85}
          cy={78}
          r={15}
          fill={ready ? tokens.action : tokens.urgency}
        />
        <Path
          d="M78 78 l5 5 9 -10"
          fill="none"
          stroke={tokens.surface}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  );
}

export function ParentInviteCard({
  householdId,
  householdName,
  onClose,
  visualFixture,
}: ParentInviteCardProps & { visualFixture?: ParentInviteVisualFixture }) {
  const queriedActiveInvite = useQuery(
    api.parentInvites.getActive,
    visualFixture ? "skip" : { householdId },
  );
  const inviteExists =
    visualFixture?.activeInviteExists ?? Boolean(queriedActiveInvite);
  const inviteLoading = !visualFixture && queriedActiveInvite === undefined;
  const createInvite = useAction(api.parentInvites.create);
  const revokeActiveInvite = useServerConfirmedMutation(
    api.parentInvites.revokeActive,
  );

  const [rawToken, setRawToken] = useState<string | null>(
    visualFixture?.rawToken ?? null,
  );
  const [working, setWorking] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<InviteFeedback>(
    visualFixture?.feedback ?? null,
  );
  const [showRevokeConfirmation, setShowRevokeConfirmation] = useState(
    visualFixture?.showRevokeConfirmation ?? false,
  );

  async function handleGenerateInvite() {
    const replacingInvite = inviteExists;
    setWorking(true);
    setInviteError(null);

    try {
      const result = await createInvite({ householdId });
      setRawToken(result.token);
      setFeedback(replacingInvite ? "regenerated" : "generated");
    } catch (error) {
      setInviteError(
        error instanceof Error
          ? error.message
          : "Could not create parent invite.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function handleRevokeInvite() {
    setWorking(true);
    setInviteError(null);

    try {
      await revokeActiveInvite({ householdId });
      setRawToken(null);
      setFeedback("revoked");
      setShowRevokeConfirmation(false);
    } catch (error) {
      setInviteError(
        error instanceof Error
          ? error.message
          : "Could not revoke parent invite.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function handleShareInvite() {
    if (!rawToken) return;

    try {
      await Share.share({
        message: [
          `Join ${householdName} in Chores as a parent.`,
          "",
          "One-use parent invite code:",
          rawToken,
        ].join("\n"),
      });
    } catch (error) {
      setInviteError(
        error instanceof Error
          ? error.message
          : "Could not share parent invite.",
      );
    }
  }

  const { tokens } = useTheme();

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
      <View className="flex-row items-center justify-between px-5 pt-2">
        <AppText variant="sectionTitle">Invite a parent</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          hitSlop={8}
          className="h-11 w-11 items-center justify-center rounded-full"
          style={{ backgroundColor: tokens.surface }}
        >
          <Icon name="close" color={tokens.ink} size={18} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerClassName="px-5 pb-10 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <InviteSeal ready={rawToken !== null} />
        <AppText color="ink-muted" className="mt-4 text-center">
          The person you invite joins {householdName} with the same controls as
          you. Each invite works once.
        </AppText>

        {rawToken ? (
          <View
            className="mt-6 overflow-hidden rounded-[24px]"
            style={{ backgroundColor: tokens.surface }}
          >
            <View className="px-5 pt-4">
              <AppText variant="label" color="action">
                {feedback === "regenerated"
                  ? "New invite ready — the old one stopped working"
                  : "Invite ready"}
              </AppText>
              <AppText
                selectable
                className="mt-2 font-body-heavy text-ink"
                style={{ fontSize: 15, lineHeight: 22, letterSpacing: 0.5 }}
              >
                {rawToken}
              </AppText>
            </View>
            <View
              className="mt-4 border-t border-dashed px-5 py-3"
              style={{ borderColor: tokens.line }}
            >
              <AppText variant="caption" color="ink-muted">
                Send it privately. It shows only once here.
              </AppText>
            </View>
          </View>
        ) : inviteLoading ? (
          <AppText color="ink-muted" className="mt-6 text-center">
            Checking for an open invite…
          </AppText>
        ) : inviteExists ? (
          <View
            className="mt-6 rounded-[20px] p-4"
            style={{ backgroundColor: tokens.surface }}
          >
            <AppText variant="cardTitle">An invite is already out</AppText>
            <AppText variant="caption" color="ink-muted" className="mt-1">
              For safety it can’t be shown again. Make a new one to replace it,
              or cancel it.
            </AppText>
          </View>
        ) : feedback === "revoked" ? (
          <AppText
            variant="bodySmall"
            color="action"
            className="mt-6 text-center"
          >
            Invite cancelled. It no longer works.
          </AppText>
        ) : null}

        {inviteError ? (
          <View
            className="mt-4 rounded-[18px] px-4 py-3"
            style={{ backgroundColor: tokens.urgencySoft }}
          >
            <AppText variant="bodySmall" color="urgency">
              {inviteError}
            </AppText>
          </View>
        ) : null}

        <View className="mt-6 gap-2">
          {rawToken ? (
            <ActionButton
              label="Share invite"
              leading={<Icon name="share" color={tokens.onAction} size={18} />}
              onPress={() => void handleShareInvite()}
            />
          ) : null}
          <ActionButton
            tone={rawToken ? "secondary" : "primary"}
            label={
              inviteExists || rawToken ? "Make a new invite" : "Make an invite"
            }
            loading={working && !showRevokeConfirmation}
            disabled={inviteLoading}
            onPress={() => void handleGenerateInvite()}
          />
          {inviteExists || rawToken ? (
            <ActionButton
              tone="destructiveSecondary"
              label="Cancel invite"
              disabled={working}
              onPress={() => setShowRevokeConfirmation(true)}
            />
          ) : null}
        </View>
      </ScrollView>

      <Modal
        transparent
        animationType="fade"
        visible={showRevokeConfirmation}
        onRequestClose={() => setShowRevokeConfirmation(false)}
      >
        <View className="flex-1 justify-end bg-scrim">
          <SafeAreaView
            edges={["bottom"]}
            className="rounded-t-sheet px-5 pt-4"
            style={{ backgroundColor: tokens.canvas }}
          >
            <AppText variant="sectionTitle" className="text-center">
              Cancel this invite?
            </AppText>
            <AppText color="ink-muted" className="mt-1 text-center">
              It stops working right away. Parents already in the household
              aren’t affected.
            </AppText>
            <ActionButton
              className="mt-5"
              tone="destructive"
              label="Cancel invite"
              loading={working}
              onPress={() => void handleRevokeInvite()}
            />
            <ActionButton
              className="mb-2 mt-1"
              tone="quiet"
              label="Keep it"
              disabled={working}
              onPress={() => setShowRevokeConfirmation(false)}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
