"use client";

import { normalizeBackendTripSummary, type BackendTripListItem, type BackendTripRead, type TravelerParty, type TripSummary } from "@saayro/types";

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
      // keep fallback
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function createTrip(payload: {
  title: string;
  destinationCity: string;
  destinationRegion: string;
  destinationCountry?: string;
  startDate: string;
  endDate: string;
  party: TravelerParty;
  overview: string;
  highlights: string[];
}): Promise<{ id: string }> {
  return requestJson<{ id: string }>("/v1/trips", {
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
}

export async function fetchTrips(): Promise<TripSummary[]> {
  const raw = await requestJson<BackendTripListItem[]>("/v1/trips", { method: "GET" });
  return raw.map((trip) => normalizeBackendTripSummary(trip));
}

export async function fetchTripDetail(tripId: string): Promise<BackendTripRead> {
  return requestJson<BackendTripRead>(`/v1/trips/${tripId}`, { method: "GET" });
}

export async function updateTrip(
  tripId: string,
  payload: {
    title: string;
    destinationCity: string;
    destinationRegion: string;
    destinationCountry?: string;
    startDate: string;
    endDate: string;
    party: TravelerParty;
    overview: string;
    highlights: string[];
  },
): Promise<{ id: string }> {
  return requestJson<{ id: string }>(`/v1/trips/${tripId}`, {
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
}
