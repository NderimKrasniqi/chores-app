import {
  useState,
} from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

type NotificationPreviewProps = {
  audience:
    'Child' |
    'Parent';

  title:
    string;

  body:
    string;

  testID:
    string;
};

function NotificationPreview({
  audience,
  title,
  body,
  testID,
}: NotificationPreviewProps) {
  return (
    <View
      testID={
        testID
      }
      className="p-4 mt-3 border rounded-2xl border-slate-700 bg-slate-900"
    >
      <Text className="text-xs font-semibold tracking-widest text-amber-400">
        {audience.toUpperCase()}
      </Text>

      <Text className="mt-1 text-base font-semibold text-white">
        {title}
      </Text>

      <Text className="mt-1 text-sm text-slate-300">
        {body}
      </Text>
    </View>
  );
}

export function Task18NotificationsMaestroFixtureScreen() {
  const [
    claimActive,
    setClaimActive,
  ] =
    useState(
      true,
    );

  return (
    <ScrollView
      className="flex-1 bg-slate-950"
      contentContainerClassName="px-5 pt-16 pb-16"
    >
      <Text className="text-xs font-semibold tracking-widest text-amber-400">
        DEVELOPMENT ONLY
      </Text>

      <Text className="mt-2 text-2xl font-bold text-white">
        TASK-18 Notifications Fixture
      </Text>

      <Text className="mt-2 text-sm text-slate-400">
        Push messages are advisory. Chore state, deadlines, locks, reviews, and financial outcomes remain authoritative in Convex.
      </Text>

      <Text className="mt-7 text-lg font-bold text-white">
        Child notifications
      </Text>

      <NotificationPreview
        testID="task18-claimable-available"
        audience="Child"
        title="New claimable chore"
        body="Vacuum hallway · 70 kr"
      />

      <NotificationPreview
        testID="task18-approved"
        audience="Child"
        title="Chore approved"
        body="Make bed earned 35 kr."
      />

      <NotificationPreview
        testID="task18-redo-required"
        audience="Child"
        title="Redo requested"
        body="Clean desk needs a redo."
      />

      <NotificationPreview
        testID="task18-deadline"
        audience="Child"
        title="Deadline coming up"
        body="Feed the cat is due soon."
      />

      {claimActive ? (
        <NotificationPreview
          testID="task18-pre-lock"
          audience="Child"
          title="Claim locks soon"
          body="Take out recycling becomes locked in about 30 minutes."
        />
      ) : (
        <View
          testID="task18-stale-suppressed"
          className="p-4 mt-3 border rounded-2xl border-slate-700 bg-slate-900"
        >
          <Text className="text-base font-semibold text-white">
            Stale reminder suppressed
          </Text>

          <Text className="mt-1 text-sm text-slate-300">
            The Claim is no longer active, so the scheduled pre-lock notification has no recipient.
          </Text>
        </View>
      )}

      <Pressable
        testID="task18-simulate-unclaim"
        accessibilityRole="button"
        accessibilityLabel="Simulate claim becoming inactive"
        onPress={() =>
          setClaimActive(
            false,
          )
        }
        className="items-center px-4 py-3 mt-4 bg-white rounded-xl"
      >
        <Text className="font-semibold text-slate-950">
          Simulate unclaim
        </Text>
      </Pressable>

      <Text className="mt-8 text-lg font-bold text-white">
        Parent notifications
      </Text>

      <NotificationPreview
        testID="task18-parent-review"
        audience="Parent"
        title="Review needed"
        body="Alex submitted Load dishwasher."
      />
    </ScrollView>
  );
}
