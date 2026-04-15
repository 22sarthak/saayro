import { buddyThread, connectedAccounts, defaultPreferences, jaipurTrip, tripSummaries } from "@saayro/mock-data";
import type { ChipOption } from "@saayro/ui";

export const authEntryOptions: ChipOption[] = [
  { id: "google", label: "Google-first" },
  { id: "otp", label: "Mobile + OTP" },
  { id: "preview", label: "Mock shell" }
];

export const homeQuickActions: ChipOption[] = [
  { id: "trip", label: "Open trip hub" },
  { id: "buddy", label: "Ask Buddy" },
  { id: "saved", label: "Review saved" }
];

export const buddyPromptOptions: ChipOption[] = [
  { id: "pace", label: "Soften day two pacing" },
  { id: "route", label: "Review Amber route" },
  { id: "export", label: "Prep export handoff" }
];

export function getHomePreview() {
  return {
    featuredTrip: jaipurTrip,
    recentTrips: tripSummaries
  };
}

export function getBuddyPreview() {
  return {
    tripTitle: jaipurTrip.title,
    messages: buddyThread
  };
}

export function getTripsPreview() {
  return tripSummaries;
}

export function getSavedPreview() {
  return jaipurTrip.itinerary.flatMap((day) =>
    day.stops.slice(0, 2).map((stop) => ({
      id: stop.id,
      title: stop.title,
      subtitle: stop.subtitle,
      city: stop.city
    }))
  );
}

export function getProfilePreview() {
  return {
    userName: "Aarohi Mehta",
    homeBase: "Delhi",
    preferences: defaultPreferences,
    connectedAccounts
  };
}

