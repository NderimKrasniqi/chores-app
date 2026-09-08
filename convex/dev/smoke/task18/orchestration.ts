import {
  v,
} from 'convex/values';

import {
  internal,
} from '../../../_generated/api';
import {
  internalMutation,
} from '../../../_generated/server';
import {
  notifyChildOfApproval,
  notifyChildRedoRequired,
  notifyParentsOfSubmission,
  scheduleClaimNotifications,
  scheduleOccurrenceNotifications,
} from '../../../lib/notifications/orchestration';

function assert(
  condition:
    unknown,
  message:
    string,
): asserts condition {
  if (!condition) {
    throw new Error(
      message,
    );
  }
}

export const run =
  internalMutation({
    args: {},

    returns:
      v.object({
        passed:
          v.boolean(),

        eventCount:
          v.number(),
      }),

    handler: async (
      ctx,
    ) => {
      const now =
        Date.now();

      const hour =
        60 * 60 * 1000;

      const householdId =
        await ctx.db.insert(
          'households',
          {
            name:
              'TASK18 orchestration smoke',

            timezone:
              'Europe/Stockholm',

            payoutWeekday:
              'friday',

            weeklyUnclaimAllowance:
              2,

            createdAt:
              now,

            updatedAt:
              now,
          },
        );

      const childId =
        await ctx.db.insert(
          'children',
          {
            householdId,

            displayName:
              'TASK18 Child',

            createdAt:
              now,

            updatedAt:
              now,
          },
        );

      const parentMembershipId =
        await ctx.db.insert(
          'householdMembers',
          {
            householdId,

            authUserId:
              'task18-parent',

            role:
              'parent',

            joinedAt:
              now,
          },
        );

      const credentialId =
        await ctx.db.insert(
          'childPairingCredentials',
          {
            householdId,

            childId,

            qrTokenHash:
              `task18-orchestration-qr-${now}`,

            manualCodeHash:
              `task18-orchestration-code-${now}`,

            createdByAuthUserId:
              'task18-parent',

            createdAt:
              now,

            expiresAt:
              now +
              15 * 60 * 1000,

            manualAttemptCount:
              0,
          },
        );

      const grantId =
        await ctx.db.insert(
          'childDeviceAccessGrants',
          {
            householdId,

            childId,

            authUserId:
              'task18-child',

            pairingCredentialId:
              credentialId,

            createdAt:
              now,
          },
        );

      const parentRegistrationId =
        await ctx.db.insert(
          'pushRegistrations',
          {
            authUserId:
              'task18-parent',

            expoPushToken:
              `ExpoPushToken[task18-parent-${now}]`,

            platform:
              'ios',

            createdAt:
              now,

            updatedAt:
              now,
          },
        );

      const childRegistrationId =
        await ctx.db.insert(
          'pushRegistrations',
          {
            authUserId:
              'task18-child',

            expoPushToken:
              `ExpoPushToken[task18-child-${now}]`,

            platform:
              'ios',

            childAccessGrantId:
              grantId,

            childId,

            createdAt:
              now,

            updatedAt:
              now,
          },
        );

      const personalDefinitionId =
        await ctx.db.insert(
          'choreDefinitions',
          {
            householdId,

            kind:
              'personal',

            title:
              'TASK18 Personal',

            valueSek:
              40,

            recurrence: {
              kind:
                'one_off',

              scheduledDate:
                '2030-01-01',
            },

            deadlineLocalTime:
              '18:00',

            deadlineDayOffset:
              0,

            personalChildId:
              childId,

            isUnlockChore:
              false,

            createdByAuthUserId:
              'task18-parent',

            createdAt:
              now,

            updatedAt:
              now,
          },
        );

      const claimableDefinitionId =
        await ctx.db.insert(
          'choreDefinitions',
          {
            householdId,

            kind:
              'claimable',

            title:
              'TASK18 Claimable',

            valueSek:
              70,

            recurrence: {
              kind:
                'one_off',

              scheduledDate:
                '2030-01-01',
            },

            deadlineLocalTime:
              '20:00',

            deadlineDayOffset:
              0,

            eligibleChildIds: [
              childId,
            ],

            isUnlockChore:
              false,

            createdByAuthUserId:
              'task18-parent',

            createdAt:
              now,

            updatedAt:
              now,
          },
        );

      /*
       * Personal occurrence:
       * creates an upcoming deadline
       * reminder.
       */
      const personalOccurrenceId =
        await ctx.db.insert(
          'choreOccurrences',
          {
            householdId,

            choreDefinitionId:
              personalDefinitionId,

            kind:
              'personal',

            title:
              'Feed the cat',

            valueSek:
              40,

            scheduledLocalDate:
              '2030-01-01',

            timezone:
              'Europe/Stockholm',

            deadlineLocalTime:
              '18:00',

            deadlineDayOffset:
              0,

            availabilityStartsAt:
              now -
              hour,

            deadlineAt:
              now +
              3 * hour,

            personalChildId:
              childId,

            isUnlockChore:
              false,

            state:
              'available',

            createdAt:
              now,
          },
        );

      await scheduleOccurrenceNotifications(
        ctx,
        personalOccurrenceId,
        {
          now,

          scheduleDelivery:
            false,
        },
      );

      /*
       * Unclaimed Claimable occurrence:
       * creates a new-chore notification.
       */
      const availableClaimableOccurrenceId =
        await ctx.db.insert(
          'choreOccurrences',
          {
            householdId,

            choreDefinitionId:
              claimableDefinitionId,

            kind:
              'claimable',

            title:
              'Vacuum hallway',

            valueSek:
              70,

            scheduledLocalDate:
              '2030-01-01',

            timezone:
              'Europe/Stockholm',

            deadlineLocalTime:
              '20:00',

            deadlineDayOffset:
              0,

            availabilityStartsAt:
              now -
              hour,

            deadlineAt:
              now +
              4 * hour,

            eligibleChildIds: [
              childId,
            ],

            isUnlockChore:
              false,

            state:
              'available',

            createdAt:
              now,
          },
        );

      await scheduleOccurrenceNotifications(
        ctx,
        availableClaimableOccurrenceId,
        {
          now,

          scheduleDelivery:
            false,
        },
      );

      /*
       * Claimed occurrence:
       * creates deadline + pre-lock
       * reminders.
       */
      const claimedOccurrenceId =
        await ctx.db.insert(
          'choreOccurrences',
          {
            householdId,

            choreDefinitionId:
              claimableDefinitionId,

            kind:
              'claimable',

            title:
              'Take out recycling',

            valueSek:
              80,

            scheduledLocalDate:
              '2030-01-02',

            timezone:
              'Europe/Stockholm',

            deadlineLocalTime:
              '20:00',

            deadlineDayOffset:
              0,

            availabilityStartsAt:
              now -
              hour,

            deadlineAt:
              now +
              4 * hour,

            eligibleChildIds: [
              childId,
            ],

            isUnlockChore:
              false,

            state:
              'available',

            createdAt:
              now,
          },
        );

      const claimId =
        await ctx.db.insert(
          'choreClaims',
          {
            householdId,

            occurrenceId:
              claimedOccurrenceId,

            childId,

            state:
              'claimed',

            claimedAt:
              now,
          },
        );

      await scheduleClaimNotifications(
        ctx,
        claimId,
        {
          now,

          scheduleDelivery:
            false,
        },
      );

      /*
       * Child submission:
       * Parent review notification.
       */
      const submittedOccurrenceId =
        await ctx.db.insert(
          'choreOccurrences',
          {
            householdId,

            choreDefinitionId:
              personalDefinitionId,

            kind:
              'personal',

            title:
              'Load dishwasher',

            valueSek:
              50,

            scheduledLocalDate:
              '2030-01-03',

            timezone:
              'Europe/Stockholm',

            deadlineLocalTime:
              '18:00',

            deadlineDayOffset:
              0,

            availabilityStartsAt:
              now -
              hour,

            deadlineAt:
              now +
              hour,

            personalChildId:
              childId,

            isUnlockChore:
              false,

            state:
              'submitted',

            createdAt:
              now,
          },
        );

      const pendingSubmissionId =
        await ctx.db.insert(
          'choreSubmissions',
          {
            householdId,

            occurrenceId:
              submittedOccurrenceId,

            childId,

            attemptNumber:
              1,

            submittedAt:
              now,
          },
        );

      const reviewEvent =
        await notifyParentsOfSubmission(
          ctx,
          pendingSubmissionId,
          {
            now,

            scheduleDelivery:
              false,
          },
        );

      assert(
        reviewEvent,
        'Parent review event was not created.',
      );

      const reviewDispatch =
        await ctx.runQuery(
          internal
            .jobs.notifications.data
            .loadDispatchContext,
          {
            eventId:
              reviewEvent.eventId,
          },
        );

      assert(
        reviewDispatch !==
          null &&
          reviewDispatch
            .targets
            .length ===
            1 &&
          reviewDispatch
            .targets[0]
            .registrationId ===
            parentRegistrationId,
        'Pending submission must target the active Parent registration.',
      );

      /*
       * Approval:
       * Child outcome notification.
       */
      const approvedOccurrenceId =
        await ctx.db.insert(
          'choreOccurrences',
          {
            householdId,

            choreDefinitionId:
              personalDefinitionId,

            kind:
              'personal',

            title:
              'Make bed',

            valueSek:
              35,

            scheduledLocalDate:
              '2030-01-04',

            timezone:
              'Europe/Stockholm',

            deadlineLocalTime:
              '18:00',

            deadlineDayOffset:
              0,

            availabilityStartsAt:
              now -
              hour,

            deadlineAt:
              now +
              hour,

            personalChildId:
              childId,

            isUnlockChore:
              false,

            state:
              'approved',

            createdAt:
              now,
          },
        );

      const approvedSubmissionId =
        await ctx.db.insert(
          'choreSubmissions',
          {
            householdId,

            occurrenceId:
              approvedOccurrenceId,

            childId,

            attemptNumber:
              1,

            submittedAt:
              now,
          },
        );

      const approvedReviewId =
        await ctx.db.insert(
          'choreReviews',
          {
            householdId,

            occurrenceId:
              approvedOccurrenceId,

            submissionId:
              approvedSubmissionId,

            decision:
              'approved',

            reviewedByAuthUserId:
              'task18-parent',

            reviewedAt:
              now,
          },
        );

      await notifyChildOfApproval(
        ctx,
        approvedReviewId,
        {
          now,

          scheduleDelivery:
            false,
        },
      );

      /*
       * Rejection:
       * immediate Redo + Redo deadline
       * reminder.
       */
      const redoOccurrenceId =
        await ctx.db.insert(
          'choreOccurrences',
          {
            householdId,

            choreDefinitionId:
              personalDefinitionId,

            kind:
              'personal',

            title:
              'Clean desk',

            valueSek:
              45,

            scheduledLocalDate:
              '2030-01-05',

            timezone:
              'Europe/Stockholm',

            deadlineLocalTime:
              '18:00',

            deadlineDayOffset:
              0,

            availabilityStartsAt:
              now -
              hour,

            deadlineAt:
              now +
              hour,

            personalChildId:
              childId,

            isUnlockChore:
              false,

            state:
              'redo_required',

            createdAt:
              now,
          },
        );

      const rejectedSubmissionId =
        await ctx.db.insert(
          'choreSubmissions',
          {
            householdId,

            occurrenceId:
              redoOccurrenceId,

            childId,

            attemptNumber:
              1,

            submittedAt:
              now,
          },
        );

      const rejectionReviewId =
        await ctx.db.insert(
          'choreReviews',
          {
            householdId,

            occurrenceId:
              redoOccurrenceId,

            submissionId:
              rejectedSubmissionId,

            decision:
              'rejected',

            reviewedByAuthUserId:
              'task18-parent',

            reviewedAt:
              now,
          },
        );

      const redoId =
        await ctx.db.insert(
          'choreRedos',
          {
            householdId,

            occurrenceId:
              redoOccurrenceId,

            initialSubmissionId:
              rejectedSubmissionId,

            rejectionReviewId,

            deadlineLocalDate:
              '2030-01-05',

            deadlineLocalTime:
              '22:00',

            deadlineAt:
              now +
              2 * hour,

            createdAt:
              now,
          },
        );

      await notifyChildRedoRequired(
        ctx,
        redoId,
        {
          now,

          scheduleDelivery:
            false,
        },
      );

      const events =
        await ctx.db
          .query(
            'notificationEvents',
          )
          .withIndex(
            'by_household_created_at',
            (q) =>
              q.eq(
                'householdId',
                householdId,
              ),
          )
          .collect();

      function countKind(
        kind:
          typeof events[number]['kind'],
      ) {
        return events.filter(
          (
            event,
          ) =>
            event.kind ===
            kind,
        ).length;
      }

      assert(
        events.length ===
          8,
        `Expected 8 TASK-18 events, found ${events.length}.`,
      );

      assert(
        countKind(
          'claimable_available',
        ) ===
          1,
        'Expected one Claimable availability notification.',
      );

      assert(
        countKind(
          'submission_review',
        ) ===
          1,
        'Expected one Parent review notification.',
      );

      assert(
        countKind(
          'approved',
        ) ===
          1,
        'Expected one approval notification.',
      );

      assert(
        countKind(
          'redo_required',
        ) ===
          1,
        'Expected one immediate Redo notification.',
      );

      assert(
        countKind(
          'redo_deadline_reminder',
        ) ===
          1,
        'Expected one Redo deadline reminder.',
      );

      assert(
        countKind(
          'deadline_reminder',
        ) ===
          2,
        'Expected Personal and claimed-Chore deadline reminders.',
      );

      assert(
        countKind(
          'pre_lock_reminder',
        ) ===
          1,
        'Expected one pre-lock warning.',
      );

      /*
       * Stale scheduled notification guard:
       * once the Claim is no longer active,
       * its future pre-lock push must have
       * zero recipients.
       */
      const preLockEvent =
        events.find(
          (
            event,
          ) =>
            event.kind ===
            'pre_lock_reminder',
        );

      assert(
        preLockEvent,
        'Pre-lock event missing.',
      );

      const activePreLockDispatch =
        await ctx.runQuery(
          internal
            .jobs.notifications.data
            .loadDispatchContext,
          {
            eventId:
              preLockEvent._id,
          },
        );

      assert(
        activePreLockDispatch !==
          null &&
          activePreLockDispatch
            .targets
            .length ===
            1 &&
          activePreLockDispatch
            .targets[0]
            .registrationId ===
            childRegistrationId,
        'Active Claim pre-lock reminder must target its Child.',
      );

      await ctx.db.patch(
        claimId,
        {
          state:
            'unclaimed',

          unclaimedAt:
            now,
        },
      );

      const stalePreLockDispatch =
        await ctx.runQuery(
          internal
            .jobs.notifications.data
            .loadDispatchContext,
          {
            eventId:
              preLockEvent._id,
          },
        );

      assert(
        stalePreLockDispatch !==
          null &&
          stalePreLockDispatch
            .targets
            .length ===
            0,
        'A stale pre-lock reminder must not be delivered after unclaim.',
      );

      /*
       * Cleanup.
       */
      for (
        const event
        of events
      ) {
        await ctx.db.delete(
          event._id,
        );
      }

      await ctx.db.delete(
        redoId,
      );

      await ctx.db.delete(
        rejectionReviewId,
      );

      await ctx.db.delete(
        rejectedSubmissionId,
      );

      await ctx.db.delete(
        approvedReviewId,
      );

      await ctx.db.delete(
        approvedSubmissionId,
      );

      await ctx.db.delete(
        pendingSubmissionId,
      );

      await ctx.db.delete(
        claimId,
      );

      await ctx.db.delete(
        redoOccurrenceId,
      );

      await ctx.db.delete(
        approvedOccurrenceId,
      );

      await ctx.db.delete(
        submittedOccurrenceId,
      );

      await ctx.db.delete(
        claimedOccurrenceId,
      );

      await ctx.db.delete(
        availableClaimableOccurrenceId,
      );

      await ctx.db.delete(
        personalOccurrenceId,
      );

      await ctx.db.delete(
        claimableDefinitionId,
      );

      await ctx.db.delete(
        personalDefinitionId,
      );

      await ctx.db.delete(
        childRegistrationId,
      );

      await ctx.db.delete(
        parentRegistrationId,
      );

      await ctx.db.delete(
        grantId,
      );

      await ctx.db.delete(
        credentialId,
      );

      await ctx.db.delete(
        parentMembershipId,
      );

      await ctx.db.delete(
        childId,
      );

      await ctx.db.delete(
        householdId,
      );

      return {
        passed:
          true,

        eventCount:
          events.length,
      };
    },
  });
