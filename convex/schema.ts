import { defineSchema } from 'convex/server';

import { childAccessTables } from './schema/childAccess';
import { choreTables } from './schema/chores';
import { householdTables } from './schema/households';

export default defineSchema({
  ...householdTables,
  ...childAccessTables,
  ...choreTables,
});
