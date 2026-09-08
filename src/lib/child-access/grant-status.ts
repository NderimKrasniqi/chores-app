import * as SecureStore from 'expo-secure-store';

import type { Id } from '../../../convex/_generated/dataModel';

const CHILD_GRANT_BINDINGS_KEY =
  'choresapp.child-grant-bindings.v1';

export type LocalChildGrantBinding = {
  contextId: string;

  accessGrantId:
    Id<'childDeviceAccessGrants'>;
};

function isBinding(
  value: unknown,
): value is LocalChildGrantBinding {
  if (
    typeof value !== 'object' ||
    value === null
  ) {
    return false;
  }

  const candidate =
    value as Record<
      string,
      unknown
    >;

  return (
    typeof candidate.contextId ===
      'string' &&
    typeof candidate.accessGrantId ===
      'string'
  );
}

async function readBindings() {
  const stored =
    await SecureStore.getItemAsync(
      CHILD_GRANT_BINDINGS_KEY,
    );

  if (!stored) {
    return [] as
      LocalChildGrantBinding[];
  }

  let parsed: unknown;

  try {
    parsed =
      JSON.parse(
        stored,
      );
  } catch {
    throw new Error(
      'Stored Child grant bindings are corrupted.',
    );
  }

  if (
    !Array.isArray(
      parsed,
    ) ||
    !parsed.every(
      isBinding,
    )
  ) {
    throw new Error(
      'Stored Child grant bindings are invalid.',
    );
  }

  return parsed;
}

async function writeBindings(
  bindings:
    LocalChildGrantBinding[],
) {
  if (
    bindings.length ===
    0
  ) {
    await SecureStore.deleteItemAsync(
      CHILD_GRANT_BINDINGS_KEY,
    );

    return;
  }

  await SecureStore.setItemAsync(
    CHILD_GRANT_BINDINGS_KEY,
    JSON.stringify(
      bindings,
    ),
  );
}

export async function listLocalChildGrantBindings() {
  return await readBindings();
}

export async function rememberLocalChildGrant(
  contextId: string,
  accessGrantId:
    Id<'childDeviceAccessGrants'>,
) {
  const bindings =
    await readBindings();

  const next =
    bindings.filter(
      (binding) =>
        binding.contextId !==
        contextId,
    );

  next.push({
    contextId,
    accessGrantId,
  });

  await writeBindings(
    next,
  );
}

export async function forgetLocalChildGrant(
  contextId: string,
) {
  const bindings =
    await readBindings();

  await writeBindings(
    bindings.filter(
      (binding) =>
        binding.contextId !==
        contextId,
    ),
  );
}
