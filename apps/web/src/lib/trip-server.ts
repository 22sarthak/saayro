import type { ConnectedAccount, ConnectedTravelItem, Trip, TripSummary } from "@saayro/types";
import {
  buildTripViewModel,
  normalizeBackendConnectedAccount,
  normalizeBackendConnectedTravelItem,
  normalizeBackendTripSummary,
  type BackendConnectedAccountRead,
  type BackendConnectedTravelItemRead,
  type BackendExportJobRead,
  type BackendItineraryRead,
  type BackendTripListItem,
  type BackendTripRead,
} from "@saayro/types";
import { cookies } from "next/headers";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function fetchServerApiJson<T>(path: string): Promise<T | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  if (!cookieHeader) {
    return null;
  }

  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchServerTripSummaries(): Promise<TripSummary[] | null> {
  const rawTrips = await fetchServerApiJson<BackendTripListItem[]>("/v1/trips");
  if (!rawTrips) {
    return null;
  }

  return rawTrips.map((trip) => normalizeBackendTripSummary(trip));
}

export async function fetchServerTripBundle(
  tripId: string,
): Promise<{ trip: Trip; connectedAccounts: ConnectedAccount[]; connectedItems: ConnectedTravelItem[] } | null> {
  const [trip, itinerary, exportJobs, rawAccounts, rawConnectedItems] = await Promise.all([
    fetchServerApiJson<BackendTripRead>(`/v1/trips/${tripId}`),
    fetchServerApiJson<BackendItineraryRead>(`/v1/trips/${tripId}/itinerary`),
    fetchServerApiJson<BackendExportJobRead[]>(`/v1/trips/${tripId}/exports`),
    fetchServerApiJson<BackendConnectedAccountRead[]>("/v1/connections"),
    fetchServerApiJson<BackendConnectedTravelItemRead[]>(`/v1/trips/${tripId}/connected-items`),
  ]);

  if (!trip) {
    return null;
  }

  const connectedAccounts = (rawAccounts ?? []).map(normalizeBackendConnectedAccount);
  const connectedItems = (rawConnectedItems ?? []).map(normalizeBackendConnectedTravelItem);

  return {
    trip: buildTripViewModel({
      trip,
      itinerary,
      exports: exportJobs ?? [],
      connectedAccounts,
      connectedItems,
    }),
    connectedAccounts,
    connectedItems,
  };
}

export async function fetchServerFeaturedTripData(): Promise<{
  featuredTrip: Trip | null;
  recentTrips: TripSummary[];
}> {
  const rawTrips = await fetchServerApiJson<BackendTripListItem[]>("/v1/trips");

  if (!rawTrips || rawTrips.length === 0) {
    return { featuredTrip: null, recentTrips: [] };
  }

  const primaryTrip = rawTrips[0];
  if (!primaryTrip) {
    return { featuredTrip: null, recentTrips: [] };
  }

  const featuredBundle = await fetchServerTripBundle(primaryTrip.id);
  const recentTrips = rawTrips.map((trip, index) =>
    normalizeBackendTripSummary(trip, {
      connectedItemCount: index === 0 ? featuredBundle?.connectedItems.length ?? 0 : 0,
    }),
  );

  return {
    featuredTrip: featuredBundle?.trip ?? null,
    recentTrips,
  };
}
