import type { User } from "@supercalorie/core";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api, tokenStore } from "./api";

interface SessionValue {
  user: User | null;
  /** True until the stored token has been checked on cold start. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore an existing session on launch so returning users skip the login
  // screen entirely.
  useEffect(() => {
    (async () => {
      try {
        if (await tokenStore.get()) {
          const { user: restored } = await api.me();
          setUser(restored);
        }
      } catch {
        await tokenStore.clear();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login({ email, password });
    await tokenStore.set(result.token);
    setUser(result.user);
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string) => {
    const result = await api.signup({ email, password, name });
    await tokenStore.set(result.token);
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    await api.logout().catch(() => {});
    await tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, signup, logout, setUser }),
    [user, loading, login, signup, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside <SessionProvider>");
  return context;
}
