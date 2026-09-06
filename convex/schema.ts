import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

const weekdayValidator = v.union(
  v.literal('monday'),
  v.literal('tuesday'),
  v.literal('wednesday'),
  v.literal('thursday'),
  v.literal('friday'),
  v.literal('saturday'),
  v.literal('sunday'),
);

const choreKindValidator = v.union(
  v.literal('personal'),
  v.literal('claimable'),
);

/*
 * Chore Definitions retain Parent-authored local calendar intent.
 *
 * TASK-07 will resolve this intent through the Household IANA timezone
 * into immutable absolute timestamps on concrete Chore Occurrences.
 */
const choreRecurrenceValidator = v.union(
  v.object({
    kind: v.literal('one_off'),

    // Household-local calendar date: YYYY-MM-DD.
    scheduledDate: v.string(),
  }),

  v.object({
    kind: v.literal('daily'),

    // Household-local calendar date: YYYY-MM-DD.
    startDate: v.string(),

    // Every N days. Must be a positive whole number.
    interval: v.number(),
  }),

  v.object({
    kind: v.literal('weekly'),

    // Household-local calendar date from which recurrence begins.
    startDate: v.string(),

    // Every N weeks. Must be a positive whole number.
    interval: v.number(),

    weekdays: v.array(
      weekdayValidator,
    ),
  }),

  v.object({
    kind: v.literal('monthly'),

    // Household-local calendar date from which recurrence begins.
    startDate: v.string(),

    // Every N months. Must be a positive whole number.
    interval: v.number(),

    // Local calendar day 1-31.
    dayOfMonth: v.number(),
  }),
);

export default defineSchema({
  households: defineTable({
    name: v.string(),

    // Authoritative IANA timezone, e.g. "Europe/Stockholm".
    timezone: v.string(),

    payoutWeekday:
      weekdayValidator,

    weeklyUnclaimAllowance:
      v.number(),

    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  householdMembers: defineTable({
    householdId:
      v.id('households'),

    // Better Auth user ID.
    authUserId: v.string(),

    // Every parent has equal domain authority.
    role: v.literal('parent'),

    joinedAt: v.number(),
  })
    .index(
      'by_auth_user',
      ['authUserId'],
    )
    .index(
      'by_household',
      ['householdId'],
    )
    .index(
      'by_household_auth_user',
      [
        'householdId',
        'authUserId',
      ],
    ),

  children: defineTable({
    householdId:
      v.id('households'),

    // Child profiles do not require email accounts.
    displayName: v.string(),

    createdAt: v.number(),
    updatedAt: v.number(),
  }).index(
    'by_household',
    ['householdId'],
  ),

  parentInvites: defineTable({
    householdId:
      v.id('households'),

    // Hash of the actual invite token.
    // The raw token is never persisted.
    tokenHash: v.string(),

    createdByAuthUserId:
      v.string(),

    createdAt: v.number(),

    // Parent-invite expiry policy is not specified by the product docs.
    expiresAt:
      v.optional(v.number()),

    revokedAt:
      v.optional(v.number()),

    acceptedAt:
      v.optional(v.number()),

    acceptedByAuthUserId:
      v.optional(v.string()),
  })
    .index(
      'by_household',
      ['householdId'],
    )
    .index(
      'by_token_hash',
      ['tokenHash'],
    ),

  childPairingCredentials:
    defineTable({
      householdId:
        v.id('households'),

      childId:
        v.id('children'),

      // QR and manual credentials are separately generated.
      // Only hashes are stored.
      qrTokenHash:
        v.string(),

      manualCodeHash:
        v.string(),

      createdByAuthUserId:
        v.string(),

      createdAt:
        v.number(),

      // Child pairing credentials expire after 15 minutes.
      expiresAt:
        v.number(),

      // Per-credential observability for manual redemption attempts.
      // Global failed guesses are tracked separately below because an
      // invalid code may not identify any credential.
      manualAttemptCount:
        v.number(),

      lastManualAttemptAt:
        v.optional(v.number()),

      // Parent-controlled revocation.
      revokedAt:
        v.optional(v.number()),

      revokedByAuthUserId:
        v.optional(v.string()),

      // Either QR or manual redemption consumes the entire credential.
      redeemedAt:
        v.optional(v.number()),

      redeemedByAuthUserId:
        v.optional(v.string()),
    })
      .index(
        'by_household',
        ['householdId'],
      )
      .index(
        'by_child',
        ['childId'],
      )
      .index(
        'by_qr_token_hash',
        ['qrTokenHash'],
      )
      .index(
        'by_manual_code_hash',
        ['manualCodeHash'],
      ),

  /*
   * Manual pairing codes are intentionally human-enterable and
   * therefore need online guessing protection.
   *
   * This bucket is keyed by the authenticated Better Auth anonymous
   * device identity so failed guesses can be recorded even when the
   * supplied code does not correspond to any credential.
   */
  childPairingManualAttemptBuckets:
    defineTable({
      authUserId:
        v.string(),

      windowStartedAt:
        v.number(),

      attemptCount:
        v.number(),

      // Set when this identity has exceeded the configured attempt policy.
      blockedUntil:
        v.optional(v.number()),

      updatedAt:
        v.number(),
    }).index(
      'by_auth_user',
      ['authUserId'],
    ),

  childDeviceAccessGrants:
    defineTable({
      householdId:
        v.id('households'),

      childId:
        v.id('children'),

      // Better Auth user ID belonging to the anonymous authenticated
      // child-device identity.
      authUserId:
        v.string(),

      // The single-use pairing credential that established this grant.
      pairingCredentialId:
        v.id(
          'childPairingCredentials',
        ),

      createdAt:
        v.number(),

      // Revocation is authoritative in Convex even if Better Auth session
      // material remains temporarily present on the physical device.
      revokedAt:
        v.optional(v.number()),

      revokedByAuthUserId:
        v.optional(v.string()),
    })
      .index(
        'by_household',
        ['householdId'],
      )
      .index(
        'by_child',
        ['childId'],
      )
      .index(
        'by_auth_user',
        ['authUserId'],
      )
      .index(
        'by_child_auth_user',
        [
          'childId',
          'authUserId',
        ],
      ),

  /*
   * Durable Parent-authored templates.
   *
   * Concrete Chore Occurrences are intentionally NOT stored here.
   * TASK-07 will generate those separately and snapshot the relevant
   * definition terms so historical records remain immutable.
   */
  choreDefinitions: defineTable({
    householdId:
      v.id('households'),

    kind:
      choreKindValidator,

    title:
      v.string(),

    description:
      v.optional(v.string()),

    /*
     * Positive whole Swedish kronor.
     * Mutations must enforce Number.isSafeInteger(valueSek) && valueSek > 0.
     */
    valueSek:
      v.number(),

    recurrence:
      choreRecurrenceValidator,

    /*
     * Household-local HH:mm.
     *
     * Undefined means the occurrence becomes available at the beginning
     * of its scheduled local day.
     */
    availabilityLocalTime:
      v.optional(v.string()),

    /*
     * Household-local HH:mm deadline.
     *
     * deadlineDayOffset allows a deadline on the scheduled day (0)
     * or a later local calendar day without storing an absolute instant
     * in the definition.
     */
    deadlineLocalTime:
      v.string(),

    deadlineDayOffset:
      v.number(),

    /*
     * PERSONAL CHORE
     *
     * Required when kind === "personal".
     * Must reference a Child in this Household.
     */
    personalChildId:
      v.optional(
        v.id('children'),
      ),

    /*
     * CLAIMABLE CHORE
     *
     * Undefined means all Children in the Household are eligible.
     * A defined array means only those Children are eligible.
     *
     * The create/update mutation will reject an empty restricted list.
     */
    eligibleChildIds:
      v.optional(
        v.array(
          v.id('children'),
        ),
      ),

    /*
     * Only a recurring Personal Chore can be an Unlock Chore.
     * A Child may have at most one active Unlock Chore definition.
     */
    isUnlockChore:
      v.boolean(),

    createdByAuthUserId:
      v.string(),

    createdAt:
      v.number(),

    updatedAt:
      v.number(),

    /*
     * Definitions are archived rather than physically deleted.
     * TASK-07 skips archived definitions when generating future
     * occurrences, while existing occurrence history remains intact.
     */
    archivedAt:
      v.optional(v.number()),

    archivedByAuthUserId:
      v.optional(v.string()),
  })
    .index(
      'by_household',
      ['householdId'],
    )
    .index(
      'by_household_kind',
      [
        'householdId',
        'kind',
      ],
    )
    .index(
      'by_household_personal_child',
      [
        'householdId',
        'personalChildId',
      ],
    )
    .index(
      'by_household_personal_child_unlock',
      [
        'householdId',
        'personalChildId',
        'isUnlockChore',
      ],
    ),
});
