"use client";

import type {
  GoogleAuthExchangeResponse,
  LogoutResponse,
  OtpChallengeResponse,
  OtpRequestPayload,
  OtpVerifyPayload,
  RefreshSessionResponse,
  AuthSession,
  ConnectedAccount,
  ConnectedTravelItem,
} from "@saayro/types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

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
}): ConnectedTravelItem {
  const item: ConnectedTravelItem = {
    id: raw.id,
    provider: raw.provider ?? "gmail",
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

export async function fetchSession(): Promise<AuthSession> {
  const raw = await requestJson<{
    authenticated: boolean;
    actor: AuthSession["actor"];
    session_id: string | null;
    expires_at: string | null;
    expires_in_seconds: number | null;
    transport: AuthSession["transport"];
    status: AuthSession["status"];
  }>("/v1/auth/session", { method: "GET" });
  return normalizeSession(raw);
}

export async function exchangeGoogleWeb(accessToken: string): Promise<GoogleAuthExchangeResponse> {
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
  }>("/v1/auth/google/web", {
    method: "POST",
    body: JSON.stringify({ access_token: accessToken }),
  });
  return raw.session_token
    ? { session: normalizeSession(raw.session), sessionToken: raw.session_token }
    : { session: normalizeSession(raw.session) };
}

export async function signOut(): Promise<LogoutResponse> {
  return requestJson<LogoutResponse>("/v1/auth/logout", { method: "POST", body: JSON.stringify({}) });
}

export async function refreshSession(): Promise<RefreshSessionResponse> {
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
  }>("/v1/auth/refresh", { method: "POST", body: JSON.stringify({}) });
  return raw.session_token
    ? { session: normalizeSession(raw.session), sessionToken: raw.session_token }
    : { session: normalizeSession(raw.session) };
}

export async function requestOtp(payload: OtpRequestPayload): Promise<OtpChallengeResponse> {
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
    body: JSON.stringify({ phone_number: payload.phoneNumber }),
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
}

export async function verifyOtp(payload: OtpVerifyPayload): Promise<OtpChallengeResponse> {
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
    body: JSON.stringify({ challenge_id: payload.challengeId, code: payload.code }),
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
      title: string;
      item_type: ConnectedTravelItem["itemType"];
      state: ConnectedTravelItem["state"];
      confidence: ConnectedTravelItem["confidence"];
      start_at: string;
      end_at?: string | null;
      metadata_json: Record<string, object>;
    }>
  >(`/v1/trips/${tripId}/connected-items`, { method: "GET" });
  return raw.map(normalizeConnectedItem);
}

export function getConnectorStartUrl(provider: "gmail" | "calendar", returnTo = "/app/profile"): string {
  return `${apiBaseUrl}/v1/connections/${provider}/start?return_to=${encodeURIComponent(returnTo)}`;
}
