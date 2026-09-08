import * as SecureStore from 'expo-secure-store';

const CHILD_EXPLICIT_LOCK_KEY_PREFIX =
  'choresapp.child-explicit-lock.v1.';

/*
 * This set deliberately exists only for the
 * lifetime of the current JavaScript process.
 *
 * EntryChoiceScreen marks the sole Child
 * profile as trusted when:
 *
 * - exactly one Child is stored locally; and
 * - that Child was not explicitly locked.
 *
 * ChildAccessGate consumes the mark once.
 *
 * A manually selected Child is never marked,
 * so multi-Child devices always require PIN.
 */
const trustedSingleChildStoragePrefixes =
  new Set<string>();

function explicitLockKey(
  childId: string,
) {
  return `${CHILD_EXPLICIT_LOCK_KEY_PREFIX}${childId}`;
}

export function markTrustedSingleChildAutoOpen(
  authStoragePrefix: string,
) {
  trustedSingleChildStoragePrefixes.add(
    authStoragePrefix,
  );
}

export function consumeTrustedSingleChildAutoOpen(
  authStoragePrefix: string,
) {
  if (
    !trustedSingleChildStoragePrefixes.has(
      authStoragePrefix,
    )
  ) {
    return false;
  }

  trustedSingleChildStoragePrefixes.delete(
    authStoragePrefix,
  );

  return true;
}

export async function isChildExplicitlyLocked(
  childId: string,
) {
  const stored =
    await SecureStore.getItemAsync(
      explicitLockKey(
        childId,
      ),
    );

  return stored === '1';
}

export async function setChildExplicitlyLocked(
  childId: string,
  locked: boolean,
) {
  const key =
    explicitLockKey(
      childId,
    );

  if (locked) {
    await SecureStore.setItemAsync(
      key,
      '1',
    );

    return;
  }

  await SecureStore.deleteItemAsync(
    key,
  );
}
