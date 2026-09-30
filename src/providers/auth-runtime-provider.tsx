import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  activateAuthStoragePrefix,
  type AppAuthClient,
  authClient,
  PARENT_AUTH_STORAGE_PREFIX,
} from "@/lib/auth/client";
import { createChildAuthStoragePrefix } from "@/lib/child-access/local-access";
import { userErrorMessage } from "@/lib/errors";

type AuthRuntimeContextValue = {
  authClient: AppAuthClient;
  storagePrefix: string;

  activateStoragePrefix: (storagePrefix: string) => AppAuthClient;

  activateParentStorage: () => AppAuthClient;

  /**
   * Start setting up this phone for a new Child (a fresh anonymous login in
   * its own storage slot). Lives here, above the Convex provider that
   * remounts on every switch, so "starting…" and any error survive it.
   */
  startChildSetup: () => Promise<void>;
  childSetupPending: boolean;
  childSetupError: string | null;
  clearChildSetupError: () => void;
};

const AuthRuntimeContext = createContext<AuthRuntimeContextValue | null>(null);

export function AuthRuntimeProvider({ children }: PropsWithChildren) {
  const [storagePrefix, setStoragePrefix] = useState(
    PARENT_AUTH_STORAGE_PREFIX,
  );

  const activateStoragePrefix = useCallback(
    (nextStoragePrefix: string) => {
      const normalized = nextStoragePrefix.trim();

      if (!normalized) {
        throw new Error("Auth storage prefix cannot be empty.");
      }

      if (normalized === storagePrefix) {
        return authClient;
      }

      const nextAuthClient = activateAuthStoragePrefix(normalized);

      setStoragePrefix(normalized);

      return nextAuthClient;
    },
    [storagePrefix],
  );

  const activateParentStorage = useCallback(() => {
    return activateStoragePrefix(PARENT_AUTH_STORAGE_PREFIX);
  }, [activateStoragePrefix]);

  const [childSetupPending, setChildSetupPending] = useState(false);
  const [childSetupError, setChildSetupError] = useState<string | null>(null);

  // A second tap before the first setup finishes must not start another
  // login (it would orphan one and could switch the phone back mid-way).
  const childSetupInFlight = useRef(false);

  const clearChildSetupError = useCallback(() => setChildSetupError(null), []);

  const startChildSetup = useCallback(async () => {
    if (childSetupInFlight.current) return;
    childSetupInFlight.current = true;
    setChildSetupPending(true);
    setChildSetupError(null);
    try {
      const childAuthClient = activateStoragePrefix(
        createChildAuthStoragePrefix(),
      );
      const result = await childAuthClient.signIn.anonymous();
      if (result.error) {
        activateAuthStoragePrefix(PARENT_AUTH_STORAGE_PREFIX);
        setStoragePrefix(PARENT_AUTH_STORAGE_PREFIX);
        setChildSetupError(
          result.error.message ?? "Could not start child session.",
        );
      }
    } catch (error) {
      activateAuthStoragePrefix(PARENT_AUTH_STORAGE_PREFIX);
      setStoragePrefix(PARENT_AUTH_STORAGE_PREFIX);
      setChildSetupError(
        userErrorMessage(error, "Could not start child session."),
      );
    } finally {
      childSetupInFlight.current = false;
      setChildSetupPending(false);
    }
  }, [activateStoragePrefix]);

  const value = useMemo(
    () => ({
      authClient,
      storagePrefix,
      activateStoragePrefix,
      activateParentStorage,
      startChildSetup,
      childSetupPending,
      childSetupError,
      clearChildSetupError,
    }),
    [
      storagePrefix,
      activateStoragePrefix,
      activateParentStorage,
      startChildSetup,
      childSetupPending,
      childSetupError,
      clearChildSetupError,
    ],
  );

  return (
    <AuthRuntimeContext.Provider value={value}>
      {children}
    </AuthRuntimeContext.Provider>
  );
}

export function useAuthRuntime() {
  const context = useContext(AuthRuntimeContext);

  if (!context) {
    throw new Error("useAuthRuntime must be used inside AuthRuntimeProvider.");
  }

  return context;
}
