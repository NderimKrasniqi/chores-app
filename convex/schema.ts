import {
  defineSchema,
} from 'convex/server';

import { childAccessTables } from './schema/childAccess';
import { claimTables } from './schema/claims';
import { choreTables } from './schema/chores';
import { householdTables } from './schema/households';
import { redoTables } from './schema/redos';

export default defineSchema({
  ...householdTables,
  ...childAccessTables,
  ...choreTables,
  ...claimTables,
  ...redoTables,
});
