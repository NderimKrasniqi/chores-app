import { DirectionCIcon } from "@/components/ui/direction-c-icon";
import { DirectionC } from "@/constants/direction-c";
import { ActionButton, AppText, Surface, TopBar } from "@/design-system";
import { useServerConfirmedMutation } from "@/hooks/use-server-confirmed-mutation";
import { useAction, useQuery } from "convex/react";
import { Image } from "expo-image";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Share, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const familyArtwork = require("../../../assets/images/direction-c/onboarding-family.png");

type ParentInviteCardProps = {
  householdId: Id<"households">;
  householdName: string;
  onClose: () => void;
};

type InviteFeedback = "generated" | "regenerated" | "revoked" | null;

function EqualAuthorityNotice() {
  return (
    <Surface
      tone="mint"
      elevated={false}
      className="mt-4 flex-row items-center p-4"
    >
      <View className="h-12 w-12 items-center justify-center rounded-full bg-action">
        <DirectionCIcon
          name="person"
          color={DirectionC.color.white}
          size={25}
        />
      </View>
      <View className="ml-3 flex-1">
        <AppText variant="cardTitle" color="action">
          Equal household authority
        </AppText>
        <AppText variant="bodySmall" color="ink-muted" className="mt-1">
          Every parent can manage chores, reviews, money, and family settings.
        </AppText>
      </View>
    </Surface>
  );
}

function InviteActionRow({
  title,
  subtitle,
  icon,
  destructive = false,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: "refresh" | "brokenLink";
  destructive?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`mt-3 min-h-[76px] flex-row items-center rounded-control px-4 ${
        destructive ? "bg-urgencySoft" : "border-2 border-ink bg-surfaceRaised"
      }`}
    >
      <DirectionCIcon
        name={icon}
        color={destructive ? DirectionC.color.coral : DirectionC.color.ink}
        size={29}
      />
      <View className="ml-3 flex-1">
        <AppText variant="cardTitle" color={destructive ? "urgency" : "ink"}>
          {title}
        </AppText>
        <AppText variant="bodySmall" color="ink-muted" className="mt-0.5">
          {subtitle}
        </AppText>
      </View>
      <DirectionCIcon
        name="chevron"
        color={destructive ? DirectionC.color.coral : DirectionC.color.ink}
        size={22}
      />
    </Pressable>
  );
}

export function ParentInviteCard({
  householdId,
  householdName,
  onClose,
}: ParentInviteCardProps) {
  const activeInvite = useQuery(api.parentInvites.getActive, { householdId });
  const createInvite = useAction(api.parentInvites.create);
  const revokeActiveInvite = useServerConfirmedMutation(
    api.parentInvites.revokeActive,
  );

  const [rawToken, setRawToken] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<InviteFeedback>(null);
  const [showRevokeConfirmation, setShowRevokeConfirmation] = useState(false);

  async function handleGenerateInvite() {
    const replacingInvite = Boolean(activeInvite);
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

  const inviteExists = Boolean(activeInvite);
  const statusLabel =
    feedback === "regenerated"
      ? "New parent invite ready"
      : "Parent invite ready";

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
      <TopBar title="Invite parent" onBack={onClose} />

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8"
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={familyArtwork}
          className="mt-1 h-44 w-full rounded-large"
          contentFit="cover"
          contentPosition="top"
          accessible={false}
        />

        <AppText variant="screenTitle" className="mt-4">
          Invite another parent
        </AppText>
        <AppText className="mt-2">
          They’ll sign in with their own account and join {householdName}.
        </AppText>

        <EqualAuthorityNotice />
        <AppText variant="sectionTitle" className="mt-5">
          Parent invite
        </AppText>

        {feedback === "revoked" && !inviteExists ? (
          <Surface
            tone="mint"
            elevated={false}
            className="mt-2 flex-row items-center p-3"
          >
            <View className="h-9 w-9 items-center justify-center rounded-full bg-action">
              <DirectionCIcon
                name="brokenLink"
                color={DirectionC.color.white}
                size={20}
              />
            </View>
            <AppText variant="cardTitle" color="action" className="ml-3">
              Invite revoked
            </AppText>
          </Surface>
        ) : null}

        {activeInvite === undefined ? (
          <Surface className="mt-2 items-center px-5 py-8">
            <AppText color="ink-muted">Checking parent invite…</AppText>
          </Surface>
        ) : !inviteExists ? (
          <>
            <Surface className="mt-2 items-center px-5 py-7">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-infoSoft">
                <DirectionCIcon
                  name="plus"
                  color={DirectionC.color.lavenderStrong}
                  size={36}
                />
              </View>
              <AppText variant="cardTitle" className="mt-3">
                No active invite
              </AppText>
              <AppText
                variant="bodySmall"
                color="ink-muted"
                className="mt-1 text-center"
              >
                {feedback === "revoked"
                  ? "The previous invite can no longer be used."
                  : "Generate a one-use invite when you’re ready."}
              </AppText>
            </Surface>
            <ActionButton
              className="mt-4"
              label="Generate parent invite"
              loading={working}
              onPress={() => void handleGenerateInvite()}
            />
            {feedback !== "revoked" ? (
              <View className="mt-4 flex-row items-center justify-center px-4">
                <DirectionCIcon
                  name="checkShield"
                  color={DirectionC.color.green}
                  size={21}
                />
                <AppText variant="bodySmall" color="ink-muted" className="ml-2">
                  You can revoke it before it is used.
                </AppText>
              </View>
            ) : null}
          </>
        ) : rawToken ? (
          <>
            <Surface
              tone="mint"
              elevated={false}
              className="mt-2 flex-row items-center p-3"
            >
              <View className="h-9 w-9 items-center justify-center rounded-full bg-action">
                <DirectionCIcon
                  name="check"
                  color={DirectionC.color.white}
                  size={20}
                />
              </View>
              <AppText variant="cardTitle" color="action" className="ml-3">
                {statusLabel}
              </AppText>
            </Surface>

            <Surface tone="lavender" elevated={false} className="mt-3 p-4">
              <AppText
                variant="caption"
                color="ink-muted"
                className="uppercase"
              >
                One-use invite code
              </AppText>
              <AppText
                selectable
                className="mt-2 font-mono text-[19px] leading-7"
              >
                {rawToken}
              </AppText>
              <ActionButton
                className="mt-4"
                label="Share invite"
                leading={
                  <DirectionCIcon
                    name="share"
                    color={DirectionC.color.white}
                    size={22}
                  />
                }
                onPress={() => void handleShareInvite()}
              />
              <AppText
                variant="bodySmall"
                color="ink-muted"
                className="mt-3 text-center"
              >
                This code is shown only after generation.
              </AppText>
            </Surface>

            <InviteActionRow
              title="Generate a new invite"
              subtitle="Replaces this invite"
              icon="refresh"
              onPress={() => void handleGenerateInvite()}
            />
            <InviteActionRow
              title="Revoke this invite"
              subtitle="Stops this invite from being used"
              icon="brokenLink"
              destructive
              onPress={() => setShowRevokeConfirmation(true)}
            />
          </>
        ) : (
          <>
            <Surface tone="lavender" elevated={false} className="mt-2 p-4">
              <View className="self-start rounded-full bg-actionSoftStrong px-3 py-2">
                <AppText variant="label" color="action">
                  ✓ Active invite
                </AppText>
              </View>
              <View className="mt-4 flex-row items-center">
                <View className="h-24 w-24 items-center justify-center rounded-large bg-infoSoftStrong">
                  <DirectionCIcon
                    name="key"
                    color={DirectionC.color.ink}
                    size={38}
                  />
                </View>
                <View className="ml-4 flex-1">
                  <AppText variant="cardTitle">Invite code unavailable</AppText>
                  <AppText
                    variant="bodySmall"
                    color="ink-muted"
                    className="mt-2"
                  >
                    For security, the code isn’t stored after generation.
                  </AppText>
                  <AppText
                    variant="bodySmall"
                    color="ink-muted"
                    className="mt-2"
                  >
                    Generate a new invite to get a shareable code.
                  </AppText>
                </View>
              </View>
            </Surface>
            <ActionButton
              className="mt-4"
              label="Generate a new invite"
              loading={working}
              onPress={() => void handleGenerateInvite()}
            />
            <AppText
              variant="bodySmall"
              color="ink-muted"
              className="mt-3 text-center"
            >
              This replaces the current invite.
            </AppText>
            <InviteActionRow
              title="Revoke this invite"
              subtitle="Stops this invite from being used"
              icon="brokenLink"
              destructive
              onPress={() => setShowRevokeConfirmation(true)}
            />
          </>
        )}

        {inviteError ? (
          <Surface tone="coral" elevated={false} className="mt-4 p-4">
            <AppText variant="bodySmall" color="urgency">
              {inviteError}
            </AppText>
          </Surface>
        ) : null}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent
        visible={showRevokeConfirmation}
        onRequestClose={() => setShowRevokeConfirmation(false)}
      >
        <View className="flex-1 justify-end bg-scrim">
          <SafeAreaView
            edges={["bottom"]}
            className="rounded-t-sheet bg-canvas px-5 pb-3 pt-3"
          >
            <View className="h-1.5 w-16 self-center rounded-full bg-infoSoftStrong" />
            <View className="mt-4 h-16 w-16 items-center justify-center self-center rounded-full bg-urgencySoft">
              <DirectionCIcon
                name="brokenLink"
                color={DirectionC.color.coral}
                size={34}
              />
            </View>
            <AppText variant="sectionTitle" className="mt-3 text-center">
              Revoke this invite?
            </AppText>
            <AppText className="mt-2 text-center">
              This invite will stop working immediately.
            </AppText>
            <AppText
              variant="bodySmall"
              color="action"
              className="mt-2 text-center"
            >
              Parents already in {householdName} keep their access.
            </AppText>
            <ActionButton
              className="mt-5"
              label="Revoke invite"
              tone="destructive"
              loading={working}
              onPress={() => void handleRevokeInvite()}
            />
            <ActionButton
              className="mt-2"
              label="Keep invite"
              tone="secondary"
              disabled={working}
              onPress={() => setShowRevokeConfirmation(false)}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
