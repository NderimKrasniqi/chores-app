import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import {
  activateAuthStoragePrefix,
  type AppAuthClient,
  authClient,
  PARENT_AUTH_STORAGE_PREFIX,
} from '@/lib/auth-client';

type AuthRuntimeContextValue = {
  authClient: AppAuthClient;
  storagePrefix: string;

  activateStoragePrefix: (storagePrefix: string) => AppAuthClient;

  activateParentStorage: () => AppAuthClient;
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
        throw new Error('Auth storage prefix cannot be empty.');
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

  const value = useMemo(
    () => ({
      authClient,
      storagePrefix,
      activateStoragePrefix,
      activateParentStorage,
    }),
    [storagePrefix, activateStoragePrefix, activateParentStorage],
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
    throw new Error('useAuthRuntime must be used inside AuthRuntimeProvider.');
  }

  return context;
}
