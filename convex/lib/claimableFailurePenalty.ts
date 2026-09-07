import {
  ConvexError,
} from 'convex/values';

import type {
  Id,
} from '../_generated/dataModel';
import type {
  MutationCtx,
} from '../_generated/server';

/*
 * TASK-14 financial primitive.
 *
 * One terminal failed Claimable Claim
 * produces exactly one full-value negative
 * Ledger Entry.
 *
 * Callers must first move both the Claim
 * and its Chore Occurrence to `failed`
 * inside the same Convex mutation.
 *
 * The Claim ID is the authority for Child
 * ownership. No client-supplied Child ID
 * participates in the financial decision.
 */
export async function ensureClaimableFailurePenalty(
  ctx:
    MutationCtx,
  claimId:
    Id<'choreClaims'>,
  now =
    Date.now(),
) {
  if (
    !Number.isFinite(
      now,
    )
  ) {
    throw new ConvexError(
      'Penalty timestamp must be finite.',
    );
  }

  const claim =
    await ctx.db.get(
      claimId,
    );

  if (!claim) {
    throw new ConvexError(
      'Claim not found.',
    );
  }

  if (
    claim.state !==
    'failed'
  ) {
    throw new ConvexError(
      'Only a failed Claim can receive a failure penalty.',
    );
  }

  const occurrence =
    await ctx.db.get(
      claim.occurrenceId,
    );

  if (!occurrence) {
    throw new ConvexError(
      'Chore Occurrence not found.',
    );
  }

  if (
    occurrence.householdId !==
    claim.householdId
  ) {
    throw new ConvexError(
      'Claim Household does not match its Chore Occurrence.',
    );
  }

  if (
    occurrence.kind !==
    'claimable'
  ) {
    throw new ConvexError(
      'Personal Chores cannot receive a failure penalty.',
    );
  }

  if (
    occurrence.state !==
    'failed'
  ) {
    throw new ConvexError(
      'Only a failed Claimable Chore can receive a failure penalty.',
    );
  }

  if (
    !Number.isSafeInteger(
      occurrence.valueSek,
    ) ||
    occurrence.valueSek <=
      0
  ) {
    throw new ConvexError(
      'Claimable Chore value must be a positive whole SEK amount.',
    );
  }

  const child =
    await ctx.db.get(
      claim.childId,
    );

  if (!child) {
    throw new ConvexError(
      'Claim Child not found.',
    );
  }

  if (
    child.householdId !==
      claim.householdId ||
    child.householdId !==
      occurrence.householdId
  ) {
    throw new ConvexError(
      'Claim Child Household does not match the failed Chore.',
    );
  }

  /*
   * A single Chore Occurrence can never
   * both earn and incur its failure
   * penalty.
   */
  const earnings =
    await ctx.db
      .query(
        'ledgerEntries',
      )
      .withIndex(
        'by_occurrence_kind',
        (q) =>
          q
            .eq(
              'occurrenceId',
              occurrence._id,
            )
            .eq(
              'kind',
              'earning',
            ),
      )
      .collect();

  if (
    earnings.length >
    0
  ) {
    throw new ConvexError(
      'A Chore Occurrence with an earning cannot receive a failure penalty.',
    );
  }

  const penalties =
    await ctx.db
      .query(
        'ledgerEntries',
      )
      .withIndex(
        'by_occurrence_kind',
        (q) =>
          q
            .eq(
              'occurrenceId',
              occurrence._id,
            )
            .eq(
              'kind',
              'penalty',
            ),
      )
      .collect();

  if (
    penalties.length >
    1
  ) {
    throw new ConvexError(
      'Chore Occurrence has duplicate penalty Ledger Entries.',
    );
  }

  const expectedAmountSek =
    -occurrence.valueSek;

  const existingPenalty =
    penalties[0];

  /*
   * Reconciliation is deliberately
   * idempotent. A delayed/repeated
   * scheduled callback reuses the
   * authoritative existing entry rather
   * than charging again.
   */
  if (existingPenalty) {
    if (
      existingPenalty.householdId !==
        occurrence.householdId ||
      existingPenalty.childId !==
        claim.childId ||
      existingPenalty.amountSek !==
        expectedAmountSek
    ) {
      throw new ConvexError(
        'Existing penalty Ledger Entry does not match the failed Claim.',
      );
    }

    return {
      ledgerEntryId:
        existingPenalty._id,

      occurrenceId:
        occurrence._id,

      claimId:
        claim._id,

      childId:
        claim.childId,

      amountSek:
        existingPenalty.amountSek,

      createdAt:
        existingPenalty.createdAt,

      created:
        false,
    };
  }

  const ledgerEntryId =
    await ctx.db.insert(
      'ledgerEntries',
      {
        householdId:
          occurrence.householdId,

        childId:
          claim.childId,

        occurrenceId:
          occurrence._id,

        kind:
          'penalty',

        amountSek:
          expectedAmountSek,

        createdAt:
          now,
      },
    );

  return {
    ledgerEntryId,

    occurrenceId:
      occurrence._id,

    claimId:
      claim._id,

    childId:
      claim.childId,

    amountSek:
      expectedAmountSek,

    createdAt:
      now,

    created:
      true,
  };
}
