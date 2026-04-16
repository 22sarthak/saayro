"use client";

import type {
  GoogleAuthExchangeResponse,
  LogoutResponse,
  OtpChallengeResponse,
  OtpRequestPayload,
  OtpVerifyPayload,
  RefreshSessionResponse,
  AuthSession,
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
