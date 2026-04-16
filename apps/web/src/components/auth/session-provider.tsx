"use client";

import type { AuthSession } from "@saayro/types";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchSession, refreshSession as refreshApiSession, signOut as signOutApi } from "@/lib/auth-client";

type AuthState = "loading" | "ready";

interface SessionContextValue {
  session: AuthSession | null;
  state: AuthState;
  refreshSession: () => Promise<AuthSession>;
  signOut: () => Promise<void>;
  setSession: (session: AuthSession) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [state, setState] = useState<AuthState>("loading");

  useEffect(() => {
    let active = true;
    void fetchSession()
      .then((nextSession) => {
        if (!active) {
          return;
        }
        setSessionState(nextSession);
        setState("ready");
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setSessionState({
          authenticated: false,
          actor: null,
          sessionId: null,
          expiresAt: null,
          expiresInSeconds: null,
          transport: null,
          status: "signed_out",
        });
        setState("ready");
      });

    return () => {
      active = false;
    };
  }, [pathname]);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      state,
      setSession: (nextSession) => {
        setSessionState(nextSession);
        setState("ready");
      },
      refreshSession: async () => {
        const refreshed = await refreshApiSession();
        setSessionState(refreshed.session);
        setState("ready");
        return refreshed.session;
      },
      signOut: async () => {
        await signOutApi();
        setSessionState({
          authenticated: false,
          actor: null,
          sessionId: null,
          expiresAt: null,
          expiresInSeconds: null,
          transport: null,
          status: "signed_out",
        });
        setState("ready");
        router.replace("/sign-in");
      },
    }),
    [router, session, state],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider.");
  }
  return context;
}
