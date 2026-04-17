import type { Trip } from "@saayro/types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

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
  role: string;
  content: string;
  confidence: string | null;
  actions: BuddyActionView[] | null;
  response: BuddyResponseView | null;
  scopeClass: string | null;
  createdAt: string;
}

export interface BuddyPageLiveState {
  mode: "live";
  trip: Trip;
  messages: BuddyMessageView[];
  emptyPrompts: Array<{ id: string; label: string }>;
}

export interface BuddyPageFallbackState {
  mode: "fallback";
  trip: Trip;
  messages: BuddyMessageView[];
  emptyPrompts: Array<{ id: string; label: string }>;
  fallbackReason: "signed_out" | "fetch_failed";
}

export interface BuddyPageNoTripState {
  mode: "no_trip";
  emptyPrompts: Array<{ id: string; label: string }>;
}

export interface BuddyAttachTripResult {
  attached: boolean;
  tripId: string;
  migratedMessageCount: number;
}

export function normalizeMockBuddyMessage(raw: {
  id: string;
  role: string;
  content: string;
  confidence?: string;
  actions?: Array<{ id: string; type?: string; label: string; payload?: Record<string, unknown> }>;
  createdAt?: string;
}): BuddyMessageView {
  return {
    id: raw.id,
    role: raw.role,
    content: raw.content,
    confidence: raw.confidence ?? null,
    actions: raw.actions
      ? raw.actions.map((action) => ({
          id: action.id,
          type: action.type ?? "open_trip_hub",
          label: action.label,
          payload: action.payload ?? {},
        }))
      : null,
    response: null,
    scopeClass: null,
    createdAt: raw.createdAt ?? new Date(0).toISOString(),
  };
}

type RawBuddyMessage = {
  id: string;
  role: string;
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
      // keep fallback
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

function normalizeBuddyMessage(raw: RawBuddyMessage): BuddyMessageView {
  return {
    id: raw.id,
    role: raw.role,
    content: raw.content,
    confidence: raw.confidence,
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

export async function fetchBuddyMessages(tripId: string): Promise<BuddyMessageView[]> {
  const raw = await requestJson<RawBuddyMessage[]>(`/v1/trips/${tripId}/buddy/messages`, { method: "GET" });
  return raw.map(normalizeBuddyMessage);
}

export async function postBuddyMessage(tripId: string, content: string): Promise<BuddyMessageView[]> {
  const raw = await requestJson<RawBuddyMessage[]>(`/v1/trips/${tripId}/buddy/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  return raw.map(normalizeBuddyMessage);
}

export async function fetchPreTripBuddyMessages(): Promise<BuddyMessageView[]> {
  const raw = await requestJson<RawBuddyMessage[]>("/v1/buddy/pre-trip/messages", { method: "GET" });
  return raw.map(normalizeBuddyMessage);
}

export async function postPreTripBuddyMessage(content: string): Promise<BuddyMessageView[]> {
  const raw = await requestJson<RawBuddyMessage[]>("/v1/buddy/pre-trip/messages", {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  return raw.map(normalizeBuddyMessage);
}

export async function attachPreTripBuddyToTrip(tripId: string): Promise<BuddyAttachTripResult> {
  const raw = await requestJson<{
    attached: boolean;
    trip_id: string;
    migrated_message_count: number;
  }>("/v1/buddy/pre-trip/attach-trip", {
    method: "POST",
    body: JSON.stringify({ trip_id: tripId }),
  });
  return {
    attached: raw.attached,
    tripId: raw.trip_id,
    migratedMessageCount: raw.migrated_message_count,
  };
}
