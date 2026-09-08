import {
  defineSchema,
} from 'convex/server';

import { childAccessTables } from './schema/childAccess';
import { financeTables } from './schema/finance';
import { evidenceTables } from './schema/evidence';
import { claimTables } from './schema/claims';
import { choreTables } from './schema/chores';
import { householdTables } from './schema/households';
import { redoTables } from './schema/redos';

export default defineSchema({
  ...householdTables,
  ...childAccessTables,
  ...evidenceTables,
  ...financeTables,
  ...choreTables,
  ...claimTables,
  ...redoTables,
});
