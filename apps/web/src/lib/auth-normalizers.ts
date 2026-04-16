import type { AuthSession, AuthSessionActor, ConnectedTravelItem, UserPreferences } from "@saayro/types";

type RawSessionActor = {
  user_id: string;
  email: string;
  full_name: string;
  auth_mode: AuthSessionActor["authMode"];
  home_base?: string | null;
  preferences?: Record<string, unknown> | null;
};

function isMapsApp(value: unknown): value is UserPreferences["preferredMapsApp"] {
  return value === "google-maps" || value === "apple-maps" || value === "in-app-preview";
}

function isTravelPace(value: unknown): value is UserPreferences["travelPace"] {
  return value === "slow" || value === "balanced" || value === "full";
}

function isBudgetSensitivity(value: unknown): value is UserPreferences["budgetSensitivity"] {
  return value === "low" || value === "medium" || value === "high";
}

function isComfortPriority(value: unknown): value is UserPreferences["comfortPriority"] {
  return value === "essential" || value === "balanced" || value === "premium";
}

export function normalizePreferences(raw: Record<string, unknown> | null | undefined): UserPreferences | null {
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

export function normalizeSessionActor(raw: RawSessionActor | null | undefined): AuthSessionActor | null {
  if (!raw) {
    return null;
  }

  return {
    userId: raw.user_id,
    email: raw.email,
    fullName: raw.full_name,
    authMode: raw.auth_mode,
    homeBase: raw.home_base ?? null,
    preferences: normalizePreferences(raw.preferences),
  };
}

export function normalizeSession(raw: {
  authenticated: boolean;
  actor: RawSessionActor | null;
  session_id: string | null;
  expires_at: string | null;
  expires_in_seconds: number | null;
  transport: AuthSession["transport"];
  status: AuthSession["status"];
}): AuthSession {
  return {
    authenticated: raw.authenticated,
    actor: normalizeSessionActor(raw.actor),
    sessionId: raw.session_id,
    expiresAt: raw.expires_at,
    expiresInSeconds: raw.expires_in_seconds,
    transport: raw.transport,
    status: raw.status,
  };
}

export function normalizeConnectedItemMetadata(raw: Record<string, object>): ConnectedTravelItem["metadata"] {
  return Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, String(value)]));
}
