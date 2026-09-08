import {
  defineTable,
} from 'convex/server';
import {
  v,
} from 'convex/values';

export const pushPlatformValidator =
  v.union(
    v.literal('ios'),
    v.literal('android'),
  );

export const notificationEventKindValidator =
  v.union(
    v.literal(
      'claimable_available',
    ),
    v.literal(
      'submission_review',
    ),
    v.literal(
      'approved',
    ),
    v.literal(
      'redo_required',
    ),
    v.literal(
      'deadline_reminder',
    ),
    v.literal(
      'redo_deadline_reminder',
    ),
    v.literal(
      'pre_lock_reminder',
    ),
  );

export const notificationRecipientKindValidator =
  v.union(
    v.literal('parents'),
    v.literal('child'),
  );

export const pushDeliveryStatusValidator =
  v.union(
    v.literal('ticket_ok'),
    v.literal('ticket_error'),
    v.literal('receipt_ok'),
    v.literal('receipt_error'),
  );

export const notificationTables = {
  pushRegistrations:
    defineTable({
      authUserId:
        v.string(),

      expoPushToken:
        v.string(),

      platform:
        pushPlatformValidator,

      childAccessGrantId:
        v.optional(
          v.id(
            'childDeviceAccessGrants',
          ),
        ),

      childId:
        v.optional(
          v.id('children'),
        ),

      createdAt:
        v.number(),

      updatedAt:
        v.number(),

      disabledAt:
        v.optional(
          v.number(),
        ),
    })
      .index(
        'by_expo_push_token',
        [
          'expoPushToken',
        ],
      )
      .index(
        'by_auth_user_and_expo_push_token',
        [
          'authUserId',
          'expoPushToken',
        ],
      )
      .index(
        'by_auth_user',
        [
          'authUserId',
        ],
      )
      .index(
        'by_child',
        [
          'childId',
        ],
      )
      .index(
        'by_child_access_grant',
        [
          'childAccessGrantId',
        ],
      ),

  notificationEvents:
    defineTable({
      eventKey:
        v.string(),

      kind:
        notificationEventKindValidator,

      householdId:
        v.id(
          'households',
        ),

      recipientKind:
        notificationRecipientKindValidator,

      childId:
        v.optional(
          v.id(
            'children',
          ),
        ),

      title:
        v.string(),

      body:
        v.string(),

      occurrenceId:
        v.optional(
          v.id(
            'choreOccurrences',
          ),
        ),

      submissionId:
        v.optional(
          v.id(
            'choreSubmissions',
          ),
        ),

      claimId:
        v.optional(
          v.id(
            'choreClaims',
          ),
        ),

      redoId:
        v.optional(
          v.id(
            'choreRedos',
          ),
        ),

      scheduledFor:
        v.number(),

      createdAt:
        v.number(),

      dispatchAttemptCount:
        v.number(),

      lastDispatchError:
        v.optional(
          v.string(),
        ),

      dispatchedAt:
        v.optional(
          v.number(),
        ),
    })
      .index(
        'by_event_key',
        [
          'eventKey',
        ],
      )
      .index(
        'by_household_created_at',
        [
          'householdId',
          'createdAt',
        ],
      ),

  pushDeliveries:
    defineTable({
      eventId:
        v.id(
          'notificationEvents',
        ),

      registrationId:
        v.id(
          'pushRegistrations',
        ),

      expoPushToken:
        v.string(),

      status:
        pushDeliveryStatusValidator,

      ticketId:
        v.optional(
          v.string(),
        ),

      errorCode:
        v.optional(
          v.string(),
        ),

      errorMessage:
        v.optional(
          v.string(),
        ),

      createdAt:
        v.number(),

      updatedAt:
        v.number(),
    })
      .index(
        'by_event_and_registration',
        [
          'eventId',
          'registrationId',
        ],
      )
      .index(
        'by_event',
        [
          'eventId',
        ],
      )
      .index(
        'by_ticket_id',
        [
          'ticketId',
        ],
      ),
};
