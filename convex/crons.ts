import {
  cronJobs,
} from 'convex/server';

import {
  internal,
} from './_generated/api';

const crons =
  cronJobs();

/*
 * Exact occurrence transitions are
 * handled by scheduled functions.
 *
 * This rolling job:
 *
 * 1. keeps the next 14 Household-local
 *    calendar days generated;
 *
 * 2. reconciles any due transitions
 *    as a safety net.
 */
crons.interval(
  'maintain chore occurrences',
  {
    minutes: 15,
  },
  internal
    .jobs.occurrences.maintenance
    .run,
);

export default crons;
