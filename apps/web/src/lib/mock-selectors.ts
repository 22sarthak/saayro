import {
  buddyThread,
  connectedAccounts,
  connectedTravelItems,
  defaultPreferences,
  emptyTripState,
  exportPacks,
  failedConnectedItem,
  jaipurTrip,
  loadingExportState,
  tripSummaries
} from "@saayro/mock-data";
import type { ConnectedTravelItem, ItineraryStop, Trip, TripSummary } from "@saayro/types";

export interface QuickAction {
  label: string;
  description: string;
  href: string;
  tone: "buddy" | "connected" | "discovery";
}

export interface SavedCollectionItem {
  id: string;
  title: string;
  subtitle: string;
  category: "stay" | "meal" | "experience" | "travel";
  city: string;
}

export const quickActions: QuickAction[] = [
  {
    label: "Ask Buddy",
    description: "Start with guidance tied to your live itinerary.",
    href: "/app/buddy",
    tone: "buddy"
  },
  {
    label: "Open trip hub",
    description: "Review your current Jaipur route and day pacing.",
    href: `/app/trips/${jaipurTrip.id}`,
    tone: "connected"
  },
  {
    label: "Refine discoveries",
    description: "Save places worth keeping for the next pass.",
    href: "/app/saved",
    tone: "discovery"
  }
];

export function getFeaturedTrip(): Trip {
  return jaipurTrip;
}

export function getRecentTrips(): TripSummary[] {
  return tripSummaries;
}

export function getNoTripState(): TripSummary[] {
  return emptyTripState;
}

export function getDashboardLoadingCard() {
  return loadingExportState;
}

export function getBuddyThread() {
  return buddyThread;
}

export function getTripById(tripId: string): Trip | undefined {
  return tripId === jaipurTrip.id ? jaipurTrip : undefined;
}

function fromStop(stop: ItineraryStop): SavedCollectionItem {
  return {
    id: stop.id,
    title: stop.title,
    subtitle: stop.subtitle,
    category:
      stop.type === "meal"
        ? "meal"
        : stop.type === "stay"
          ? "stay"
          : stop.type === "flight" || stop.type === "transfer"
            ? "travel"
            : "experience",
    city: stop.city
  };
}

function fromConnectedItem(item: ConnectedTravelItem): SavedCollectionItem {
  return {
    id: item.id,
    title: item.title,
    subtitle: item.itemType === "hotel" ? "Connected stay candidate" : "Connected travel item",
    category: item.itemType === "hotel" ? "stay" : "travel",
    city: "Linked source"
  };
}

export function getSavedCollection(): SavedCollectionItem[] {
  const stopItems = jaipurTrip.itinerary.flatMap((day) => day.stops).map(fromStop);
  const connectedItems = connectedTravelItems.map(fromConnectedItem);
  return [...stopItems.slice(0, 4), ...connectedItems.slice(0, 2)];
}

export function getSavedEmptyCollection(): SavedCollectionItem[] {
  return [];
}

export function getProfileData() {
  return {
    userName: "Aarohi Mehta",
    homeBase: "Delhi",
    preferences: defaultPreferences,
    connectedAccounts,
    partialConnection: failedConnectedItem,
    exportPacks
  };
}

