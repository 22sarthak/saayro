"use client";

import type {
  AuthStatusResponse,
  BackendTripListItem,
  ConnectedTravelReviewRequest,
  EmailSignInPayload,
  EmailSignUpPayload,
  GoogleAuthExchangeResponse,
  LogoutResponse,
  OtpChallengeResponse,
  OtpRequestPayload,
  OtpVerifyPayload,
  ProfileRead,
  ProfileUpdatePayload,
  RefreshSessionResponse,
  AuthSession,
  ConnectedAccount,
  ConnectedTravelItem,
} from "@saayro/types";
import { normalizeConnectedItemMetadata, normalizeSession } from "@/lib/auth-normalizers";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    credentials: "include",
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
      // Keep the fallback message.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
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

function normalizeConnectedItem(raw: {
  id: string;
  title: string;
  item_type: ConnectedTravelItem["itemType"];
  state: ConnectedTravelItem["state"];
  confidence: ConnectedTravelItem["confidence"];
  start_at: string;
  end_at?: string | null;
  metadata_json: Record<string, object>;
  provider?: ConnectedTravelItem["provider"];
  account_label?: string | null;
  trip_id?: string | null;
  trip_title?: string | null;
}): ConnectedTravelItem {
  const item: ConnectedTravelItem = {
    id: raw.id,
    provider: raw.provider ?? "gmail",
    title: raw.title,
    itemType: raw.item_type,
    state: raw.state,
    confidence: raw.confidence,
    startAt: raw.start_at,
    metadata: normalizeConnectedItemMetadata(raw.metadata_json),
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

type RawSession = {
  authenticated: boolean;
  actor: {
    user_id: string;
    email: string;
    full_name: string;
    auth_mode: "google" | "otp" | "password";
    home_base?: string | null;
    phone_number?: string | null;
    date_of_birth?: string | null;
    age_range?: string | null;
    preferences?: Record<string, unknown> | null;
  } | null;
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

export async function fetchSession(): Promise<AuthSession> {
  const raw = await requestJson<RawSession>("/v1/auth/session", { method: "GET" });
  return normalizeSession(raw);
}

export async function exchangeGoogleWeb(accessToken: string, intent: "sign_in" | "sign_up" = "sign_in"): Promise<GoogleAuthExchangeResponse> {
  const raw = await requestJson<{
    session: RawSession;
    session_token?: string;
  }>("/v1/auth/google/web", {
    method: "POST",
    body: JSON.stringify({ access_token: accessToken, intent }),
  });
  return raw.session_token
    ? { session: normalizeSession(raw.session), sessionToken: raw.session_token }
    : { session: normalizeSession(raw.session) };
}

export async function signUpWithEmailWeb(payload: EmailSignUpPayload): Promise<GoogleAuthExchangeResponse> {
  const raw = await requestJson<{ session: RawSession; session_token?: string }>("/v1/auth/email/web/sign-up", {
    method: "POST",
    body: JSON.stringify({ email: payload.email, password: payload.password, full_name: payload.fullName }),
  });
  return raw.session_token
    ? { session: normalizeSession(raw.session), sessionToken: raw.session_token }
    : { session: normalizeSession(raw.session) };
}

export async function signInWithEmailWeb(payload: EmailSignInPayload): Promise<GoogleAuthExchangeResponse> {
  const raw = await requestJson<{ session: RawSession; session_token?: string }>("/v1/auth/email/web/sign-in", {
    method: "POST",
    body: JSON.stringify({ email: payload.email, password: payload.password }),
  });
  return raw.session_token
    ? { session: normalizeSession(raw.session), sessionToken: raw.session_token }
    : { session: normalizeSession(raw.session) };
}

export async function requestEmailVerification(): Promise<AuthStatusResponse> {
  return requestJson<AuthStatusResponse>("/v1/auth/email/verify/request", { method: "POST", body: JSON.stringify({}) });
}

export async function confirmEmailVerification(token: string): Promise<AuthStatusResponse> {
  return requestJson<AuthStatusResponse>("/v1/auth/email/verify/confirm", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function requestPasswordReset(email: string): Promise<AuthStatusResponse> {
  return requestJson<AuthStatusResponse>("/v1/auth/password/forgot", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, password: string): Promise<AuthStatusResponse> {
  return requestJson<AuthStatusResponse>("/v1/auth/password/reset", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

export async function signOut(): Promise<LogoutResponse> {
  return requestJson<LogoutResponse>("/v1/auth/logout", { method: "POST", body: JSON.stringify({}) });
}

export async function refreshSession(): Promise<RefreshSessionResponse> {
  const raw = await requestJson<{
    session: RawSession;
    session_token?: string;
  }>("/v1/auth/refresh", { method: "POST", body: JSON.stringify({}) });
  return raw.session_token
    ? { session: normalizeSession(raw.session), sessionToken: raw.session_token }
    : { session: normalizeSession(raw.session) };
}

export async function requestOtp(payload: OtpRequestPayload): Promise<OtpChallengeResponse> {
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
    body: JSON.stringify({ phone_number: payload.phoneNumber, intent: payload.intent ?? "sign_in" }),
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
}

export async function verifyOtp(payload: OtpVerifyPayload): Promise<OtpChallengeResponse> {
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
    body: JSON.stringify({ challenge_id: payload.challengeId, code: payload.code }),
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
}

export async function fetchProfile(): Promise<ProfileRead> {
  const raw = await requestJson<{
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
  }>("/v1/me/profile", { method: "GET" });
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
}

export async function updateProfile(payload: ProfileUpdatePayload): Promise<ProfileRead> {
  const raw = await requestJson<{
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
  }>("/v1/me/profile", {
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
}

export async function fetchConnections(): Promise<ConnectedAccount[]> {
  const raw = await requestJson<
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
  >("/v1/connections", { method: "GET" });
  return raw.map(normalizeConnectedAccount);
}

export async function fetchTripSummaries(): Promise<BackendTripListItem[]> {
  return requestJson<BackendTripListItem[]>("/v1/trips", { method: "GET" });
}

export async function syncConnection(provider: ConnectedAccount["provider"]): Promise<ConnectedAccount> {
  const raw = await requestJson<{
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
  }>(`/v1/connections/${provider}/sync`, { method: "POST" });
  return normalizeConnectedAccount(raw.account);
}

export async function disconnectConnection(provider: ConnectedAccount["provider"]): Promise<void> {
  await requestJson(`/v1/connections/${provider}`, { method: "DELETE" });
}

export async function fetchTripConnectedItems(tripId: string): Promise<ConnectedTravelItem[]> {
  const raw = await requestJson<
    Array<{
      id: string;
      provider?: ConnectedTravelItem["provider"];
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
  >(`/v1/trips/${tripId}/connected-items`, { method: "GET" });
  return raw.map(normalizeConnectedItem);
}

export async function fetchConnectedTravelItems(
  state?: ConnectedTravelItem["state"],
): Promise<ConnectedTravelItem[]> {
  const search = state ? `?state=${encodeURIComponent(state)}` : "";
  const raw = await requestJson<
    Array<{
      id: string;
      provider?: ConnectedTravelItem["provider"];
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
  >(`/v1/connected-travel/items${search}`, { method: "GET" });
  return raw.map(normalizeConnectedItem);
}

export async function reviewConnectedTravelItem(
  itemId: string,
  payload: ConnectedTravelReviewRequest,
): Promise<ConnectedTravelItem> {
  const raw = await requestJson<{
    id: string;
    provider?: ConnectedTravelItem["provider"];
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
  }>(`/v1/connected-travel/items/${itemId}/review`, {
    method: "POST",
    body: JSON.stringify({
      action: payload.action,
      trip_id: payload.tripId,
    }),
  });
  return normalizeConnectedItem(raw);
}

export function getConnectorStartUrl(provider: "gmail" | "calendar", returnTo = "/app/profile"): string {
  return `${apiBaseUrl}/v1/connections/${provider}/start?return_to=${encodeURIComponent(returnTo)}`;
}
