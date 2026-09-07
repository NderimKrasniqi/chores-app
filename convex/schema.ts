import {
  defineSchema,
} from 'convex/server';

import { childAccessTables } from './schema/childAccess';
import { claimTables } from './schema/claims';
import { choreTables } from './schema/chores';
import { householdTables } from './schema/households';

export default defineSchema({
  ...householdTables,
  ...childAccessTables,
  ...choreTables,
  ...claimTables,
});
