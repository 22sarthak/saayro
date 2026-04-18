import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { Platform } from "react-native";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  AuthSession,
  ConfidenceLabel,
  ConnectedAccount,
  ConnectedTravelItem,
  ConnectedTravelReviewRequest,
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

function isConfidenceLabel(value: unknown): value is ConfidenceLabel {
  return value === "high" || value === "medium" || value === "low" || value === "needs-review";
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

export interface BuddyActionView {
  id: string;
  type: string;
  label: string;
  payload: Record<string, unknown>;
}

export interface BuddyToolHintView {
  tool: string;
  reason: string;
}

export interface BuddyDevMetadataView {
  provider: string;
  model: string;
  fallbackUsed: boolean;
}

export interface BuddyResponseView {
  summary: string;
  guidance: string;
  confidenceLabel: string;
  scopeClass: string;
  actions: BuddyActionView[];
  followUpQuestion: string | null;
  toolHints: BuddyToolHintView[];
  devMetadata: BuddyDevMetadataView | null;
}

export interface BuddyMessageView {
  id: string;
  role: "user" | "buddy";
  content: string;
  confidence: ConfidenceLabel | null;
  actions: BuddyActionView[] | null;
  response: BuddyResponseView | null;
  scopeClass: string | null;
  createdAt: string;
}

export interface BuddyAttachTripResult {
  attached: boolean;
  tripId: string;
  migratedMessageCount: number;
}

type TripMutationPayload = {
  title: string;
  destinationCity: string;
  destinationRegion: string;
  destinationCountry?: string;
  startDate: string;
  endDate: string;
  party: BackendTripRead["party"];
  overview: string;
  highlights: string[];
};

interface AuthContextValue {
  session: AuthSession | null;
  status: AuthStatus;
  bootstrapSession: () => Promise<void>;
  exchangeGoogleAccessToken: (accessToken: string) => Promise<AuthSession>;
  exchangeGoogleAccessTokenWithIntent: (accessToken: string, intent: "sign_in" | "sign_up") => Promise<AuthSession>;
  signUpWithEmailPassword: (payload: EmailSignUpPayload) => Promise<AuthSession>;
  signInWithEmailPassword: (payload: EmailSignInPayload) => Promise<AuthSession>;
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
  listConnectedTravelItems: (state?: ConnectedTravelItem["state"]) => Promise<ConnectedTravelItem[]>;
  reviewConnectedTravelItem: (itemId: string, payload: ConnectedTravelReviewRequest) => Promise<ConnectedTravelItem>;
  listTrips: () => Promise<BackendTripListItem[]>;
  createTrip: (payload: TripMutationPayload) => Promise<BackendTripRead>;
  updateTrip: (tripId: string, payload: TripMutationPayload) => Promise<BackendTripRead>;
  getTrip: (tripId: string) => Promise<BackendTripRead>;
  getTripItinerary: (tripId: string) => Promise<BackendItineraryRead>;
  listTripExports: (tripId: string) => Promise<BackendExportJobRead[]>;
  fetchBuddyMessages: (tripId: string) => Promise<BuddyMessageView[]>;
  postBuddyMessage: (tripId: string, content: string) => Promise<BuddyMessageView[]>;
  fetchPreTripBuddyMessages: () => Promise<BuddyMessageView[]>;
  postPreTripBuddyMessage: (content: string) => Promise<BuddyMessageView[]>;
  attachPreTripBuddyToTrip: (tripId: string) => Promise<BuddyAttachTripResult>;
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

type RawBuddyMessage = {
  id: string;
  role: "user" | "buddy";
  content: string;
  confidence: string | null;
  actions: Array<{ id: string; type: string; label: string; payload: Record<string, object> }> | null;
  response: {
    summary: string;
    guidance: string;
    confidence_label: string;
    scope_class: string;
    actions: Array<{ id: string; type: string; label: string; payload: Record<string, object> }>;
    follow_up_question: string | null;
    tool_hints: Array<{ tool: string; reason: string }>;
    dev_metadata: { provider: string; model: string; fallback_used: boolean } | null;
  } | null;
  scope_class: string | null;
  created_at: string;
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
  account_label?: string | null;
  title: string;
  item_type: ConnectedTravelItem["itemType"];
  state: ConnectedTravelItem["state"];
  confidence: ConnectedTravelItem["confidence"];
  start_at: string;
  end_at?: string | null;
  trip_id?: string | null;
  trip_title?: string | null;
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
  if (raw.account_label) {
    item.accountLabel = raw.account_label;
  }
  if (raw.end_at) {
    item.endAt = raw.end_at;
  }
  if (raw.trip_id) {
    item.tripId = raw.trip_id;
  }
  if (raw.trip_title) {
    item.tripTitle = raw.trip_title;
  }
  return item;
}

function normalizeBuddyMessage(raw: RawBuddyMessage): BuddyMessageView {
  return {
    id: raw.id,
    role: raw.role,
    content: raw.content,
    confidence: isConfidenceLabel(raw.confidence) ? raw.confidence : null,
    actions: raw.actions,
    response: raw.response
      ? {
          summary: raw.response.summary,
          guidance: raw.response.guidance,
          confidenceLabel: raw.response.confidence_label,
          scopeClass: raw.response.scope_class,
          actions: raw.response.actions,
          followUpQuestion: raw.response.follow_up_question,
          toolHints: raw.response.tool_hints,
          devMetadata: raw.response.dev_metadata
            ? {
                provider: raw.response.dev_metadata.provider,
                model: raw.response.dev_metadata.model,
                fallbackUsed: raw.response.dev_metadata.fallback_used,
              }
            : null,
        }
      : null,
    scopeClass: raw.scope_class,
    createdAt: raw.created_at,
  };
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
        return result.session;
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
        return result.session;
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
        return result.session;
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
        return result.session;
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
      listConnectedTravelItems: async (state) => {
        const token = await getStoredSessionToken();
        if (!token) {
          return [];
        }
        const search = state ? `?state=${encodeURIComponent(state)}` : "";
        const raw = await authedRequestJson<
          Array<{
            id: string;
            provider: ConnectedTravelItem["provider"];
            account_label?: string | null;
            title: string;
            item_type: ConnectedTravelItem["itemType"];
            state: ConnectedTravelItem["state"];
            confidence: ConnectedTravelItem["confidence"];
            start_at: string;
            end_at?: string | null;
            trip_id?: string | null;
            trip_title?: string | null;
            metadata_json: Record<string, object>;
          }>
        >(`/v1/connected-travel/items${search}`, token, { method: "GET" });
        return raw.map(normalizeConnectedTravelItem);
      },
      reviewConnectedTravelItem: async (itemId, payload) => {
        const token = await getStoredSessionToken();
        if (!token) {
          throw new Error("Sign in to review imported travel items.");
        }
        const raw = await authedRequestJson<{
          id: string;
          provider: ConnectedTravelItem["provider"];
          account_label?: string | null;
          title: string;
          item_type: ConnectedTravelItem["itemType"];
          state: ConnectedTravelItem["state"];
          confidence: ConnectedTravelItem["confidence"];
          start_at: string;
          end_at?: string | null;
          trip_id?: string | null;
          trip_title?: string | null;
          metadata_json: Record<string, object>;
        }>(`/v1/connected-travel/items/${itemId}/review`, token, {
          method: "POST",
          body: JSON.stringify({
            action: payload.action,
            trip_id: payload.tripId,
          }),
        });
        return normalizeConnectedTravelItem(raw);
      },
      listTrips: async () => {
        const token = await getStoredSessionToken();
        if (!token) {
          return [];
        }
        return authedRequestJson<BackendTripListItem[]>("/v1/trips", token, { method: "GET" });
      },
      createTrip: async (payload) => {
        const token = await getStoredSessionToken();
        if (!token) {
          throw new Error("Sign in to create a trip.");
        }
        return authedRequestJson<BackendTripRead>("/v1/trips", token, {
          method: "POST",
          body: JSON.stringify({
            title: payload.title,
            destination_city: payload.destinationCity,
            destination_region: payload.destinationRegion,
            destination_country: payload.destinationCountry ?? "India",
            start_date: payload.startDate,
            end_date: payload.endDate,
            party: payload.party,
            overview: payload.overview,
            highlights: payload.highlights,
            preferences: {
              preferred_maps_app: "google-maps",
              travel_pace: "balanced",
              interests: [],
              budget_sensitivity: "medium",
              comfort_priority: "premium",
              notifications_enabled: true,
            },
          }),
        });
      },
      updateTrip: async (tripId, payload) => {
        const token = await getStoredSessionToken();
        if (!token) {
          throw new Error("Sign in to update a trip.");
        }
        return authedRequestJson<BackendTripRead>(`/v1/trips/${tripId}`, token, {
          method: "PATCH",
          body: JSON.stringify({
            title: payload.title,
            destination_city: payload.destinationCity,
            destination_region: payload.destinationRegion,
            destination_country: payload.destinationCountry ?? "India",
            start_date: payload.startDate,
            end_date: payload.endDate,
            party: payload.party,
            overview: payload.overview,
            highlights: payload.highlights,
          }),
        });
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
      fetchBuddyMessages: async (tripId) => {
        const token = await getStoredSessionToken();
        if (!token) {
          return [];
        }
        const raw = await authedRequestJson<RawBuddyMessage[]>(`/v1/trips/${tripId}/buddy/messages`, token, { method: "GET" });
        return raw.map(normalizeBuddyMessage);
      },
      postBuddyMessage: async (tripId, content) => {
        const token = await getStoredSessionToken();
        if (!token) {
          throw new Error("Sign in to talk with Buddy.");
        }
        const raw = await authedRequestJson<RawBuddyMessage[]>(`/v1/trips/${tripId}/buddy/messages`, token, {
          method: "POST",
          body: JSON.stringify({ content }),
        });
        return raw.map(normalizeBuddyMessage);
      },
      fetchPreTripBuddyMessages: async () => {
        const token = await getStoredSessionToken();
        if (!token) {
          return [];
        }
        const raw = await authedRequestJson<RawBuddyMessage[]>("/v1/buddy/pre-trip/messages", token, { method: "GET" });
        return raw.map(normalizeBuddyMessage);
      },
      postPreTripBuddyMessage: async (content) => {
        const token = await getStoredSessionToken();
        if (!token) {
          throw new Error("Sign in to talk with Buddy.");
        }
        const raw = await authedRequestJson<RawBuddyMessage[]>("/v1/buddy/pre-trip/messages", token, {
          method: "POST",
          body: JSON.stringify({ content }),
        });
        return raw.map(normalizeBuddyMessage);
      },
      attachPreTripBuddyToTrip: async (tripId) => {
        const token = await getStoredSessionToken();
        if (!token) {
          throw new Error("Sign in to move this planning thread into a trip.");
        }
        const raw = await authedRequestJson<{
          attached: boolean;
          trip_id: string;
          migrated_message_count: number;
        }>("/v1/buddy/pre-trip/attach-trip", token, {
          method: "POST",
          body: JSON.stringify({ trip_id: tripId }),
        });
        return {
          attached: raw.attached,
          tripId: raw.trip_id,
          migratedMessageCount: raw.migrated_message_count,
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
