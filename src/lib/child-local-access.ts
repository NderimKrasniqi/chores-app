import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { PARENT_AUTH_STORAGE_PREFIX } from '@/lib/auth-client';

const CHILD_CONTEXT_REGISTRY_KEY =
  'choresapp.child-context-registry.v1';

const PIN_MIN_LENGTH = 4;
const PIN_MAX_LENGTH = 8;

export type LocalChildContext = {
  contextId: string;

  householdId: string;
  householdName: string;

  childId: string;
  childDisplayName: string;

  /**
   * Better Auth Expo SecureStore namespace belonging
   * only to this local Child device identity.
   */
  authStoragePrefix: string;

  /**
   * Only a random salt and PIN verifier are persisted.
   * The raw PIN is never stored.
   */
  pinSalt: string;
  pinVerifier: string;

  createdAt: number;
  updatedAt: number;
};

type RegisterLocalChildContextInput = {
  householdId: string;
  householdName: string;

  childId: string;
  childDisplayName: string;

  authStoragePrefix: string;

  pin: string;
};

function bytesToHex(
  bytes: Uint8Array,
) {
  return Array.from(
    bytes,
    (byte) =>
      byte
        .toString(16)
        .padStart(2, '0'),
  ).join('');
}

function normalizePin(pin: string) {
  return pin.trim();
}

export function isValidChildPin(
  pin: string,
) {
  const normalized =
    normalizePin(pin);

  return new RegExp(
    `^\\d{${PIN_MIN_LENGTH},${PIN_MAX_LENGTH}}$`,
  ).test(normalized);
}

export function getChildPinRequirements() {
  return {
    minLength: PIN_MIN_LENGTH,
    maxLength: PIN_MAX_LENGTH,
  };
}

async function createPinSalt() {
  const bytes =
    await Crypto.getRandomBytesAsync(
      16,
    );

  return bytesToHex(bytes);
}

async function createPinVerifier(
  pin: string,
  salt: string,
) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm
      .SHA256,
    `${salt}:${normalizePin(pin)}`,
  );
}

function constantTimeEqual(
  left: string,
  right: string,
) {
  if (left.length !== right.length) {
    return false;
  }

  let difference = 0;

  for (
    let index = 0;
    index < left.length;
    index += 1
  ) {
    difference |=
      left.charCodeAt(index) ^
      right.charCodeAt(index);
  }

  return difference === 0;
}

function isLocalChildContext(
  value: unknown,
): value is LocalChildContext {
  if (
    typeof value !== 'object' ||
    value === null
  ) {
    return false;
  }

  const candidate = value as Record<
    string,
    unknown
  >;

  return (
    typeof candidate.contextId ===
      'string' &&
    typeof candidate.householdId ===
      'string' &&
    typeof candidate.householdName ===
      'string' &&
    typeof candidate.childId ===
      'string' &&
    typeof candidate.childDisplayName ===
      'string' &&
    typeof candidate.authStoragePrefix ===
      'string' &&
    typeof candidate.pinSalt ===
      'string' &&
    typeof candidate.pinVerifier ===
      'string' &&
    typeof candidate.createdAt ===
      'number' &&
    typeof candidate.updatedAt ===
      'number'
  );
}

async function readRegistry() {
  const stored =
    await SecureStore.getItemAsync(
      CHILD_CONTEXT_REGISTRY_KEY,
    );

  if (!stored) {
    return [] as LocalChildContext[];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(stored);
  } catch {
    throw new Error(
      'Stored child access data is corrupted.',
    );
  }

  if (!Array.isArray(parsed)) {
    throw new Error(
      'Stored child access data is invalid.',
    );
  }

  if (
    !parsed.every(
      isLocalChildContext,
    )
  ) {
    throw new Error(
      'Stored child access data has an invalid format.',
    );
  }

  return parsed;
}

async function writeRegistry(
  contexts: LocalChildContext[],
) {
  await SecureStore.setItemAsync(
    CHILD_CONTEXT_REGISTRY_KEY,
    JSON.stringify(contexts),
  );
}

/**
 * Creates a unique Better Auth SecureStore namespace.
 *
 * A Child pairing session should use this prefix before
 * anonymous sign-in, so every saved Child gets a distinct
 * Better Auth/device identity.
 */
export function createChildAuthStoragePrefix() {
  return `${PARENT_AUTH_STORAGE_PREFIX}-child-${Crypto.randomUUID()}`;
}

export async function listLocalChildContexts() {
  const contexts =
    await readRegistry();

  return [...contexts].sort(
    (left, right) =>
      left.childDisplayName.localeCompare(
        right.childDisplayName,
      ),
  );
}

export async function getLocalChildContext(
  contextId: string,
) {
  const contexts =
    await readRegistry();

  return (
    contexts.find(
      (context) =>
        context.contextId ===
        contextId,
    ) ?? null
  );
}

export async function getLocalChildContextByStoragePrefix(
  authStoragePrefix: string,
) {
  const contexts =
    await readRegistry();

  return (
    contexts.find(
      (context) =>
        context.authStoragePrefix ===
        authStoragePrefix,
    ) ?? null
  );
}

export async function registerLocalChildContext({
  householdId,
  householdName,
  childId,
  childDisplayName,
  authStoragePrefix,
  pin,
}: RegisterLocalChildContextInput) {
  const normalizedPin =
    normalizePin(pin);

  if (
    !isValidChildPin(
      normalizedPin,
    )
  ) {
    throw new Error(
      `PIN must contain ${PIN_MIN_LENGTH} to ${PIN_MAX_LENGTH} digits.`,
    );
  }

  const normalizedStoragePrefix =
    authStoragePrefix.trim();

  if (!normalizedStoragePrefix) {
    throw new Error(
      'Child auth storage prefix is required.',
    );
  }

  if (
    normalizedStoragePrefix ===
    PARENT_AUTH_STORAGE_PREFIX
  ) {
    throw new Error(
      'Child access cannot use the Parent auth storage context.',
    );
  }

  const pinSalt =
    await createPinSalt();

  const pinVerifier =
    await createPinVerifier(
      normalizedPin,
      pinSalt,
    );

  const contexts =
    await readRegistry();

  const existing =
    contexts.find(
      (context) =>
        context.childId ===
          childId ||
        context.authStoragePrefix ===
          normalizedStoragePrefix,
    );

  const now = Date.now();

  const context: LocalChildContext =
    {
      contextId:
        existing?.contextId ??
        Crypto.randomUUID(),

      householdId,
      householdName,

      childId,
      childDisplayName,

      authStoragePrefix:
        normalizedStoragePrefix,

      pinSalt,
      pinVerifier,

      createdAt:
        existing?.createdAt ??
        now,

      updatedAt: now,
    };

  /*
   * One saved local context per Child on this
   * physical device.
   *
   * Re-pairing the same Child replaces the old
   * local context metadata instead of creating
   * duplicate profile-picker entries.
   */
  const nextContexts =
    contexts.filter(
      (candidate) =>
        candidate.contextId !==
          context.contextId &&
        candidate.childId !==
          childId &&
        candidate.authStoragePrefix !==
          normalizedStoragePrefix,
    );

  nextContexts.push(context);

  await writeRegistry(
    nextContexts,
  );

  return context;
}

export async function verifyLocalChildPin(
  contextId: string,
  pin: string,
) {
  const normalizedPin =
    normalizePin(pin);

  if (
    !isValidChildPin(
      normalizedPin,
    )
  ) {
    return false;
  }

  const context =
    await getLocalChildContext(
      contextId,
    );

  if (!context) {
    return false;
  }

  const candidateVerifier =
    await createPinVerifier(
      normalizedPin,
      context.pinSalt,
    );

  return constantTimeEqual(
    candidateVerifier,
    context.pinVerifier,
  );
}

export async function changeLocalChildPin(
  contextId: string,
  currentPin: string,
  newPin: string,
) {
  const currentPinValid =
    await verifyLocalChildPin(
      contextId,
      currentPin,
    );

  if (!currentPinValid) {
    throw new Error(
      'Current PIN is incorrect.',
    );
  }

  if (
    !isValidChildPin(newPin)
  ) {
    throw new Error(
      `New PIN must contain ${PIN_MIN_LENGTH} to ${PIN_MAX_LENGTH} digits.`,
    );
  }

  const contexts =
    await readRegistry();

  const context =
    contexts.find(
      (candidate) =>
        candidate.contextId ===
        contextId,
    );

  if (!context) {
    throw new Error(
      'Child profile is no longer stored on this device.',
    );
  }

  const pinSalt =
    await createPinSalt();

  const pinVerifier =
    await createPinVerifier(
      newPin,
      pinSalt,
    );

  const updatedContext: LocalChildContext =
    {
      ...context,
      pinSalt,
      pinVerifier,
      updatedAt: Date.now(),
    };

  await writeRegistry(
    contexts.map(
      (candidate) =>
        candidate.contextId ===
        contextId
          ? updatedContext
          : candidate,
    ),
  );

  return updatedContext;
}

export async function removeLocalChildContext(
  contextId: string,
) {
  const contexts =
    await readRegistry();

  const nextContexts =
    contexts.filter(
      (context) =>
        context.contextId !==
        contextId,
    );

  if (
    nextContexts.length ===
    contexts.length
  ) {
    return false;
  }

  if (
    nextContexts.length === 0
  ) {
    await SecureStore.deleteItemAsync(
      CHILD_CONTEXT_REGISTRY_KEY,
    );

    return true;
  }

  await writeRegistry(
    nextContexts,
  );

  return true;
}
