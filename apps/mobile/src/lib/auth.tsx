import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { Platform } from "react-native";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AuthSession, GoogleAuthExchangeResponse, OtpChallengeResponse } from "@saayro/types";

WebBrowser.maybeCompleteAuthSession();

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
const sessionTokenKey = "saayro.mobile.session";

type AuthStatus = "loading" | "ready";

interface AuthContextValue {
  session: AuthSession | null;
  status: AuthStatus;
  bootstrapSession: () => Promise<void>;
  exchangeGoogleAccessToken: (accessToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  requestOtp: (phoneNumber: string) => Promise<OtpChallengeResponse>;
  verifyOtp: (challengeId: string, code: string) => Promise<OtpChallengeResponse>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    let message = "Request failed.";
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      message = body.error?.message ?? message;
    } catch {
      // Keep fallback.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

async function getStoredSessionToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return globalThis.localStorage?.getItem(sessionTokenKey) ?? null;
  }
  return SecureStore.getItemAsync(sessionTokenKey);
}

async function setStoredSessionToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    globalThis.localStorage?.setItem(sessionTokenKey, token);
    return;
  }
  await SecureStore.setItemAsync(sessionTokenKey, token);
}

async function clearStoredSessionToken(): Promise<void> {
  if (Platform.OS === "web") {
    globalThis.localStorage?.removeItem(sessionTokenKey);
    return;
  }
  await SecureStore.deleteItemAsync(sessionTokenKey);
}

function normalizeSession(raw: {
  authenticated: boolean;
  actor: AuthSession["actor"];
  session_id: string | null;
  expires_at: string | null;
  expires_in_seconds: number | null;
  transport: AuthSession["transport"];
  status: AuthSession["status"];
}): AuthSession {
  return {
    authenticated: raw.authenticated,
    actor: raw.actor,
    sessionId: raw.session_id,
    expiresAt: raw.expires_at,
    expiresInSeconds: raw.expires_in_seconds,
    transport: raw.transport,
    status: raw.status,
  };
}

async function fetchMobileSession(token: string): Promise<AuthSession> {
  const raw = await requestJson<{
    authenticated: boolean;
    actor: AuthSession["actor"];
    session_id: string | null;
    expires_at: string | null;
    expires_in_seconds: number | null;
    transport: AuthSession["transport"];
    status: AuthSession["status"];
  }>("/v1/auth/session", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  return normalizeSession(raw);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const bootstrapSession = async () => {
    const token = await getStoredSessionToken();
    if (!token) {
      setSession({
        authenticated: false,
        actor: null,
        sessionId: null,
        expiresAt: null,
        expiresInSeconds: null,
        transport: null,
        status: "signed_out",
      });
      setStatus("ready");
      return;
    }

    try {
      const nextSession = await fetchMobileSession(token);
      if (!nextSession.authenticated) {
        await clearStoredSessionToken();
      }
      setSession(nextSession);
    } catch {
      await clearStoredSessionToken();
      setSession({
        authenticated: false,
        actor: null,
        sessionId: null,
        expiresAt: null,
        expiresInSeconds: null,
        transport: null,
        status: "signed_out",
      });
    } finally {
      setStatus("ready");
    }
  };

  useEffect(() => {
    void bootstrapSession();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      status,
      bootstrapSession,
      exchangeGoogleAccessToken: async (accessToken: string) => {
        const raw = await requestJson<{
          session: {
            authenticated: boolean;
            actor: AuthSession["actor"];
            session_id: string | null;
            expires_at: string | null;
            expires_in_seconds: number | null;
            transport: AuthSession["transport"];
            status: AuthSession["status"];
          };
          session_token?: string;
        }>("/v1/auth/google/mobile", {
          method: "POST",
          body: JSON.stringify({ access_token: accessToken }),
        });
        const result: GoogleAuthExchangeResponse = raw.session_token
          ? { session: normalizeSession(raw.session), sessionToken: raw.session_token }
          : { session: normalizeSession(raw.session) };
        if (result.sessionToken) {
          await setStoredSessionToken(result.sessionToken);
        }
        setSession(result.session);
        setStatus("ready");
      },
      signOut: async () => {
        const token = await getStoredSessionToken();
        if (token) {
          await requestJson("/v1/auth/logout", {
            method: "POST",
            body: JSON.stringify({}),
            headers: { Authorization: `Bearer ${token}` },
          });
        }
        await clearStoredSessionToken();
        setSession({
          authenticated: false,
          actor: null,
          sessionId: null,
          expiresAt: null,
          expiresInSeconds: null,
          transport: null,
          status: "signed_out",
        });
        setStatus("ready");
        router.replace("/sign-in");
      },
      requestOtp: async (phoneNumber: string) =>
        {
          const raw = await requestJson<{
            challenge_id: string;
            phone_number: string;
            status: OtpChallengeResponse["status"];
            provider: string;
            live: boolean;
            message: string;
            expires_at: string | null;
          }>("/v1/auth/otp/request", {
            method: "POST",
            body: JSON.stringify({ phone_number: phoneNumber }),
          });
          return {
            challengeId: raw.challenge_id,
            phoneNumber: raw.phone_number,
            status: raw.status,
            provider: raw.provider,
            live: raw.live,
            message: raw.message,
            expiresAt: raw.expires_at,
          };
        },
      verifyOtp: async (challengeId: string, code: string) =>
        {
          const raw = await requestJson<{
            challenge_id: string;
            phone_number: string;
            status: OtpChallengeResponse["status"];
            provider: string;
            live: boolean;
            message: string;
            expires_at: string | null;
          }>("/v1/auth/otp/verify", {
            method: "POST",
            body: JSON.stringify({ challenge_id: challengeId, code }),
          });
          return {
            challengeId: raw.challenge_id,
            phoneNumber: raw.phone_number,
            status: raw.status,
            provider: raw.provider,
            live: raw.live,
            message: raw.message,
            expiresAt: raw.expires_at,
          };
        },
    }),
    [session, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
