import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { Platform } from "react-native";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  AuthSession,
  ConnectedAccount,
  ConnectedTravelItem,
  GoogleAuthExchangeResponse,
  OtpChallengeResponse,
  AuthStatusResponse,
  EmailSignInPayload,
  EmailSignUpPayload,
  ProfileRead,
  ProfileUpdatePayload,
} from "@saayro/types";
import type {
  BackendExportJobRead,
  BackendItineraryRead,
  BackendTripListItem,
  BackendTripRead,
} from "@saayro/types";

WebBrowser.maybeCompleteAuthSession();

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
const sessionTokenKey = "saayro.mobile.session";

function isMapsApp(value: unknown): value is NonNullable<NonNullable<AuthSession["actor"]>["preferences"]>["preferredMapsApp"] {
  return value === "google-maps" || value === "apple-maps" || value === "in-app-preview";
}

function isTravelPace(value: unknown): value is NonNullable<NonNullable<AuthSession["actor"]>["preferences"]>["travelPace"] {
  return value === "slow" || value === "balanced" || value === "full";
}

function isBudgetSensitivity(
  value: unknown,
): value is NonNullable<NonNullable<AuthSession["actor"]>["preferences"]>["budgetSensitivity"] {
  return value === "low" || value === "medium" || value === "high";
}

function isComfortPriority(
  value: unknown,
): value is NonNullable<NonNullable<AuthSession["actor"]>["preferences"]>["comfortPriority"] {
  return value === "essential" || value === "balanced" || value === "premium";
}

function normalizePreferences(raw: Record<string, unknown> | null | undefined) {
  if (!raw) {
    return null;
  }

  const preferredMapsApp = raw.preferred_maps_app;
  const travelPace = raw.travel_pace;
  const interests = raw.interests;
  const budgetSensitivity = raw.budget_sensitivity;
  const comfortPriority = raw.comfort_priority;
  const notificationsEnabled = raw.notifications_enabled;

  if (
    !isMapsApp(preferredMapsApp) ||
    !isTravelPace(travelPace) ||
    !Array.isArray(interests) ||
    !interests.every((item) => typeof item === "string") ||
    !isBudgetSensitivity(budgetSensitivity) ||
    !isComfortPriority(comfortPriority) ||
    typeof notificationsEnabled !== "boolean"
  ) {
    return null;
  }

  return {
    preferredMapsApp,
    travelPace,
    interests,
    budgetSensitivity,
    comfortPriority,
    notificationsEnabled,
  };
}

type AuthStatus = "loading" | "ready";

interface AuthContextValue {
  session: AuthSession | null;
  status: AuthStatus;
  bootstrapSession: () => Promise<void>;
  exchangeGoogleAccessToken: (accessToken: string) => Promise<void>;
  exchangeGoogleAccessTokenWithIntent: (accessToken: string, intent: "sign_in" | "sign_up") => Promise<void>;
  signUpWithEmailPassword: (payload: EmailSignUpPayload) => Promise<void>;
  signInWithEmailPassword: (payload: EmailSignInPayload) => Promise<void>;
  signOut: () => Promise<void>;
  requestEmailVerification: () => Promise<AuthStatusResponse>;
  confirmEmailVerification: (token: string) => Promise<AuthStatusResponse>;
  requestPasswordReset: (email: string) => Promise<AuthStatusResponse>;
  resetPassword: (token: string, password: string) => Promise<AuthStatusResponse>;
  requestOtp: (phoneNumber: string, intent?: "sign_in" | "sign_up" | "verify_phone") => Promise<OtpChallengeResponse>;
  verifyOtp: (challengeId: string, code: string) => Promise<OtpChallengeResponse>;
  getProfile: () => Promise<ProfileRead>;
  updateProfile: (payload: ProfileUpdatePayload) => Promise<ProfileRead>;
  listConnections: () => Promise<ConnectedAccount[]>;
  syncConnection: (provider: "gmail" | "calendar") => Promise<ConnectedAccount>;
  disconnectConnection: (provider: "gmail" | "calendar") => Promise<void>;
  listTripConnectedItems: (tripId: string) => Promise<ConnectedTravelItem[]>;
  listTrips: () => Promise<BackendTripListItem[]>;
  getTrip: (tripId: string) => Promise<BackendTripRead>;
  getTripItinerary: (tripId: string) => Promise<BackendItineraryRead>;
  listTripExports: (tripId: string) => Promise<BackendExportJobRead[]>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

type RawSessionActor = {
  user_id: string;
  email: string;
  full_name: string;
  auth_mode: "google" | "otp" | "password";
  home_base?: string | null;
  phone_number?: string | null;
  date_of_birth?: string | null;
  age_range?: string | null;
  preferences?: Record<string, unknown> | null;
};

type RawSession = {
  authenticated: boolean;
  actor: RawSessionActor | null;
  session_id: string | null;
  expires_at: string | null;
  expires_in_seconds: number | null;
  transport: AuthSession["transport"];
  status: AuthSession["status"];
  auth_outcome?: AuthSession["authOutcome"] | null;
  needs_onboarding?: boolean;
  email_verified?: boolean;
  phone_verified?: boolean;
};

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

function normalizeSession(raw: RawSession): AuthSession {
  return {
    authenticated: raw.authenticated,
    actor: raw.actor
      ? {
          userId: raw.actor.user_id,
          email: raw.actor.email,
          fullName: raw.actor.full_name,
          authMode: raw.actor.auth_mode,
          homeBase: raw.actor.home_base ?? null,
          phoneNumber: raw.actor.phone_number ?? null,
          dateOfBirth: raw.actor.date_of_birth ?? null,
          ageRange: raw.actor.age_range ?? null,
          preferences: normalizePreferences(raw.actor.preferences),
        }
      : null,
    sessionId: raw.session_id,
    expiresAt: raw.expires_at,
    expiresInSeconds: raw.expires_in_seconds,
    transport: raw.transport,
    status: raw.status,
    authOutcome: raw.auth_outcome ?? null,
    needsOnboarding: raw.needs_onboarding ?? false,
    emailVerified: raw.email_verified ?? false,
    phoneVerified: raw.phone_verified ?? false,
  };
}

function normalizeConnectedAccount(raw: {
  id: string;
  provider: ConnectedAccount["provider"];
  label: string;
  state: ConnectedAccount["state"];
  granted_scopes: string[];
  capabilities?: string[];
  provider_account_email?: string | null;
  provider_account_name?: string | null;
  last_synced_at?: string | null;
  last_imported_at?: string | null;
  attached_item_count?: number;
  review_needed_item_count?: number;
  imported_item_count?: number;
  status_message?: string | null;
}): ConnectedAccount {
  const account: ConnectedAccount = {
    id: raw.id,
    provider: raw.provider,
    label: raw.label,
    state: raw.state,
    grantedScopes: raw.granted_scopes,
  };
  if (raw.capabilities?.length) {
    account.capabilities = raw.capabilities;
  }
  if (raw.provider_account_email) {
    account.providerAccountEmail = raw.provider_account_email;
  }
  if (raw.provider_account_name) {
    account.providerAccountName = raw.provider_account_name;
  }
  if (raw.last_synced_at) {
    account.lastSyncedAt = raw.last_synced_at;
  }
  if (raw.last_imported_at) {
    account.lastImportedAt = raw.last_imported_at;
  }
  if (typeof raw.attached_item_count === "number") {
    account.attachedItemCount = raw.attached_item_count;
  }
  if (typeof raw.review_needed_item_count === "number") {
    account.reviewNeededItemCount = raw.review_needed_item_count;
  }
  if (typeof raw.imported_item_count === "number") {
    account.importedItemCount = raw.imported_item_count;
  }
  if (raw.status_message) {
    account.statusMessage = raw.status_message;
  }
  return account;
}

function normalizeConnectedTravelItem(raw: {
  id: string;
  provider: ConnectedTravelItem["provider"];
  title: string;
  item_type: ConnectedTravelItem["itemType"];
  state: ConnectedTravelItem["state"];
  confidence: ConnectedTravelItem["confidence"];
  start_at: string;
  end_at?: string | null;
  metadata_json: Record<string, object>;
}): ConnectedTravelItem {
  const item: ConnectedTravelItem = {
    id: raw.id,
    provider: raw.provider,
    title: raw.title,
    itemType: raw.item_type,
    state: raw.state,
    confidence: raw.confidence,
    startAt: raw.start_at,
    metadata: Object.fromEntries(Object.entries(raw.metadata_json).map(([key, value]) => [key, String(value)])),
  };
  if (raw.end_at) {
    item.endAt = raw.end_at;
  }
  return item;
}

async function fetchMobileSession(token: string): Promise<AuthSession> {
  const raw = await requestJson<RawSession>("/v1/auth/session", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  return normalizeSession(raw);
}

async function authedRequestJson<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  return requestJson<T>(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
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
        authOutcome: null,
        needsOnboarding: false,
        emailVerified: false,
        phoneVerified: false,
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
        authOutcome: null,
        needsOnboarding: false,
        emailVerified: false,
        phoneVerified: false,
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
          session: RawSession;
          session_token?: string;
        }>("/v1/auth/google/mobile", {
          method: "POST",
          body: JSON.stringify({ access_token: accessToken, intent: "sign_in" }),
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
      exchangeGoogleAccessTokenWithIntent: async (accessToken: string, intent: "sign_in" | "sign_up") => {
        const raw = await requestJson<{
          session: RawSession;
          session_token?: string;
        }>("/v1/auth/google/mobile", {
          method: "POST",
          body: JSON.stringify({ access_token: accessToken, intent }),
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
      signUpWithEmailPassword: async (payload) => {
        const raw = await requestJson<{ session: RawSession; session_token?: string }>("/v1/auth/email/mobile/sign-up", {
          method: "POST",
          body: JSON.stringify({ email: payload.email, password: payload.password, full_name: payload.fullName }),
        });
        const result = raw.session_token
          ? { session: normalizeSession(raw.session), sessionToken: raw.session_token }
          : { session: normalizeSession(raw.session) };
        if (result.sessionToken) {
          await setStoredSessionToken(result.sessionToken);
        }
        setSession(result.session);
        setStatus("ready");
      },
      signInWithEmailPassword: async (payload) => {
        const raw = await requestJson<{ session: RawSession; session_token?: string }>("/v1/auth/email/mobile/sign-in", {
          method: "POST",
          body: JSON.stringify({ email: payload.email, password: payload.password }),
        });
        const result = raw.session_token
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
          authOutcome: null,
          needsOnboarding: false,
          emailVerified: false,
          phoneVerified: false,
        });
        setStatus("ready");
        router.replace("/sign-in");
      },
      requestEmailVerification: async () => {
        const token = await getStoredSessionToken();
        if (!token) {
          throw new Error("Sign in to request verification.");
        }
        return authedRequestJson<AuthStatusResponse>("/v1/auth/email/verify/request", token, {
          method: "POST",
          body: JSON.stringify({}),
        });
      },
      confirmEmailVerification: async (token: string) =>
        requestJson<AuthStatusResponse>("/v1/auth/email/verify/confirm", {
          method: "POST",
          body: JSON.stringify({ token }),
        }),
      requestPasswordReset: async (email: string) =>
        requestJson<AuthStatusResponse>("/v1/auth/password/forgot", {
          method: "POST",
          body: JSON.stringify({ email }),
        }),
      resetPassword: async (token: string, password: string) =>
        requestJson<AuthStatusResponse>("/v1/auth/password/reset", {
          method: "POST",
          body: JSON.stringify({ token, password }),
        }),
      requestOtp: async (phoneNumber: string, intent = "sign_in") =>
        {
          const raw = await requestJson<{
            challenge_id: string;
            phone_number: string;
            intent: OtpChallengeResponse["intent"];
            status: OtpChallengeResponse["status"];
            provider: string;
            live: boolean;
            message: string;
            expires_at: string | null;
          }>("/v1/auth/otp/request", {
            method: "POST",
            body: JSON.stringify({ phone_number: phoneNumber, intent }),
          });
          return {
            challengeId: raw.challenge_id,
            phoneNumber: raw.phone_number,
            intent: raw.intent,
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
            intent: OtpChallengeResponse["intent"];
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
            intent: raw.intent,
            status: raw.status,
            provider: raw.provider,
            live: raw.live,
            message: raw.message,
            expiresAt: raw.expires_at,
          };
        },
      getProfile: async () => {
        const token = await getStoredSessionToken();
        if (!token) {
          throw new Error("Sign in to load your profile.");
        }
        const raw = await authedRequestJson<{
          user_id: string;
          email: string;
          full_name: string;
          home_base?: string | null;
          phone_number?: string | null;
          date_of_birth?: string | null;
          age_range?: string | null;
          preferences: Record<string, unknown>;
          email_verified: boolean;
          phone_verified: boolean;
          needs_onboarding: boolean;
          onboarding_completed: boolean;
        }>("/v1/me/profile", token, { method: "GET" });
        return {
          userId: raw.user_id,
          email: raw.email,
          fullName: raw.full_name,
          homeBase: raw.home_base ?? null,
          phoneNumber: raw.phone_number ?? null,
          dateOfBirth: raw.date_of_birth ?? null,
          ageRange: raw.age_range ?? null,
          preferences: raw.preferences,
          emailVerified: raw.email_verified,
          phoneVerified: raw.phone_verified,
          needsOnboarding: raw.needs_onboarding,
          onboardingCompleted: raw.onboarding_completed,
        };
      },
      updateProfile: async (payload) => {
        const token = await getStoredSessionToken();
        if (!token) {
          throw new Error("Sign in to update your profile.");
        }
        const raw = await authedRequestJson<{
          user_id: string;
          email: string;
          full_name: string;
          home_base?: string | null;
          phone_number?: string | null;
          date_of_birth?: string | null;
          age_range?: string | null;
          preferences: Record<string, unknown>;
          email_verified: boolean;
          phone_verified: boolean;
          needs_onboarding: boolean;
          onboarding_completed: boolean;
        }>("/v1/me/profile", token, {
          method: "PATCH",
          body: JSON.stringify({
            full_name: payload.fullName ?? undefined,
            home_base: payload.homeBase ?? undefined,
            phone_number: payload.phoneNumber ?? undefined,
            date_of_birth: payload.dateOfBirth ?? undefined,
            age_range: payload.ageRange ?? undefined,
            preferences: payload.preferences ?? undefined,
            confirm_full_name: payload.confirmFullName ?? false,
            complete_onboarding: payload.completeOnboarding ?? false,
          }),
        });
        return {
          userId: raw.user_id,
          email: raw.email,
          fullName: raw.full_name,
          homeBase: raw.home_base ?? null,
          phoneNumber: raw.phone_number ?? null,
          dateOfBirth: raw.date_of_birth ?? null,
          ageRange: raw.age_range ?? null,
          preferences: raw.preferences,
          emailVerified: raw.email_verified,
          phoneVerified: raw.phone_verified,
          needsOnboarding: raw.needs_onboarding,
          onboardingCompleted: raw.onboarding_completed,
        };
      },
      listConnections: async () => {
        const token = await getStoredSessionToken();
        if (!token) {
          return [];
        }
        const raw = await authedRequestJson<
          Array<{
            id: string;
            provider: ConnectedAccount["provider"];
            label: string;
            state: ConnectedAccount["state"];
            granted_scopes: string[];
            capabilities?: string[];
            provider_account_email?: string | null;
            provider_account_name?: string | null;
            last_synced_at?: string | null;
            last_imported_at?: string | null;
            attached_item_count?: number;
            review_needed_item_count?: number;
            imported_item_count?: number;
            status_message?: string | null;
          }>
        >("/v1/connections", token, { method: "GET" });
        return raw.map(normalizeConnectedAccount);
      },
      syncConnection: async (provider) => {
        const token = await getStoredSessionToken();
        if (!token) {
          throw new Error("Sign in to refresh Connected Travel.");
        }
        const raw = await authedRequestJson<{
          account: {
            id: string;
            provider: ConnectedAccount["provider"];
            label: string;
            state: ConnectedAccount["state"];
            granted_scopes: string[];
            capabilities?: string[];
            provider_account_email?: string | null;
            provider_account_name?: string | null;
            last_synced_at?: string | null;
            last_imported_at?: string | null;
            attached_item_count?: number;
            review_needed_item_count?: number;
            imported_item_count?: number;
            status_message?: string | null;
          };
        }>(`/v1/connections/${provider}/sync`, token, { method: "POST" });
        return normalizeConnectedAccount(raw.account);
      },
      disconnectConnection: async (provider) => {
        const token = await getStoredSessionToken();
        if (!token) {
          return;
        }
        await authedRequestJson(`/v1/connections/${provider}`, token, { method: "DELETE" });
      },
      listTripConnectedItems: async (tripId) => {
        const token = await getStoredSessionToken();
        if (!token) {
          return [];
        }
        const raw = await authedRequestJson<
          Array<{
            id: string;
            provider: ConnectedTravelItem["provider"];
            title: string;
            item_type: ConnectedTravelItem["itemType"];
            state: ConnectedTravelItem["state"];
            confidence: ConnectedTravelItem["confidence"];
            start_at: string;
            end_at?: string | null;
            metadata_json: Record<string, object>;
          }>
        >(`/v1/trips/${tripId}/connected-items`, token, { method: "GET" });
        return raw.map(normalizeConnectedTravelItem);
      },
      listTrips: async () => {
        const token = await getStoredSessionToken();
        if (!token) {
          return [];
        }
        return authedRequestJson<BackendTripListItem[]>("/v1/trips", token, { method: "GET" });
      },
      getTrip: async (tripId) => {
        const token = await getStoredSessionToken();
        if (!token) {
          throw new Error("Sign in to load trip details.");
        }
        return authedRequestJson<BackendTripRead>(`/v1/trips/${tripId}`, token, { method: "GET" });
      },
      getTripItinerary: async (tripId) => {
        const token = await getStoredSessionToken();
        if (!token) {
          throw new Error("Sign in to load itinerary details.");
        }
        return authedRequestJson<BackendItineraryRead>(`/v1/trips/${tripId}/itinerary`, token, { method: "GET" });
      },
      listTripExports: async (tripId) => {
        const token = await getStoredSessionToken();
        if (!token) {
          return [];
        }
        return authedRequestJson<BackendExportJobRead[]>(`/v1/trips/${tripId}/exports`, token, { method: "GET" });
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
