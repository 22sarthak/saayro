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
import type {
  BuddyMessage,
  ConnectedAccount,
  ConnectedTravelItem,
  ConfidenceLabel,
  ExportPack,
  ItineraryDay,
  ItineraryStop,
  MapsApp,
  Trip,
  TripSummary,
  UserPreferences
} from "@saayro/types";
import type { ChipOption } from "@saayro/ui";

type ScreenState = "loading" | "empty" | "populated";

interface ScreenData<T> {
  state: ScreenState;
  data: T;
}

interface HomeScreenData {
  featuredTrip: Trip | undefined;
  recentTrips: TripSummary[];
  quickActions: ChipOption[];
  connectedSummary: {
    attachedCount: number;
    candidateCount: number;
    confidenceLabel: ConfidenceLabel;
  };
  exportHighlights: ExportPack[];
  discoveryPrompts: ChipOption[];
}

interface BuddyScreenData {
  tripTitle: string;
  tripContext: string;
  messages: BuddyMessage[];
  promptOptions: ChipOption[];
  actionChips: ChipOption[];
  composerHint: string;
}

interface TripsScreenData {
  trip: Trip | undefined;
  itineraryDays: ItineraryDay[];
  exportPacks: ExportPack[];
  connectedAccounts: ConnectedAccount[];
  connectedItems: ConnectedTravelItem[];
  mapsPreference: MapsApp;
}

interface SavedItemViewModel {
  id: string;
  title: string;
  subtitle: string;
  city: string;
  category: string;
  tags: string[];
  routeStop?: ItineraryStop;
}

interface SavedSectionViewModel {
  id: string;
  title: string;
  description: string;
  items: SavedItemViewModel[];
}

interface SavedScreenData {
  sections: SavedSectionViewModel[];
  suggestionChips: ChipOption[];
}

interface ProfileScreenData {
  userName: string;
  homeBase: string;
  preferences: UserPreferences;
  connectedAccounts: ConnectedAccount[];
  trustNotes: string[];
  supportActions: ChipOption[];
}

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

function toPrettyMapsLabel(preferredMapsApp: MapsApp) {
  if (preferredMapsApp === "google-maps") {
    return "Google Maps";
  }

  if (preferredMapsApp === "apple-maps") {
    return "Apple Maps";
  }

  return "In-app preview";
}

function deriveConfidenceLabel(items: ConnectedTravelItem[]): ConfidenceLabel {
  if (items.some((item) => item.confidence === "needs-review")) {
    return "needs-review";
  }

  if (items.some((item) => item.confidence === "medium" || item.confidence === "low")) {
    return "medium";
  }

  return "high";
}

function buildSavedSections(trip: Trip): SavedSectionViewModel[] {
  const stays = trip.itinerary
    .flatMap((day) => day.stops)
    .filter((stop) => stop.type === "stay" || stop.type === "meal")
    .map((stop) => ({
      id: stop.id,
      title: stop.title,
      subtitle: stop.subtitle,
      city: stop.city,
      category: stop.type === "stay" ? "Stay" : "Table",
      tags: stop.tags,
      routeStop: stop
    }));

  const discovery = trip.itinerary
    .flatMap((day) => day.stops)
    .filter((stop) => stop.type === "activity")
    .map((stop) => ({
      id: stop.id,
      title: stop.title,
      subtitle: stop.subtitle,
      city: stop.city,
      category: "Discovery",
      tags: stop.tags,
      routeStop: stop
    }));

  return [
    {
      id: "editors-picks",
      title: "Held for this trip",
      description: "A quieter shortlist of premium stays and meals worth carrying forward.",
      items: stays
    },
    {
      id: "discovery",
      title: "Discovery saves",
      description: "Cultural and route-aware stops that still feel warm on mobile.",
      items: discovery
    }
  ];
}

export function getHomeScreenData(state: ScreenState = "populated"): ScreenData<HomeScreenData> {
  if (state === "loading") {
    return {
      state,
      data: {
        featuredTrip: undefined,
        recentTrips: [],
        quickActions: homeQuickActions,
        connectedSummary: {
          attachedCount: 0,
          candidateCount: 0,
          confidenceLabel: "medium"
        },
        exportHighlights: [loadingExportState],
        discoveryPrompts: []
      }
    };
  }

  if (state === "empty") {
    return {
      state,
      data: {
        featuredTrip: undefined,
        recentTrips: emptyTripState,
        quickActions: homeQuickActions,
        connectedSummary: {
          attachedCount: 0,
          candidateCount: 0,
          confidenceLabel: "medium"
        },
        exportHighlights: [],
        discoveryPrompts: defaultPreferences.interests.map((interest, index) => ({
          id: `interest-${index}`,
          label: interest
        }))
      }
    };
  }

  const attachedCount = connectedTravelItems.filter((item) => item.state === "attached").length;
  const candidateCount = connectedTravelItems.filter((item) => item.state === "candidate").length;

  return {
    state,
    data: {
      featuredTrip: jaipurTrip,
      recentTrips: tripSummaries,
      quickActions: homeQuickActions,
      connectedSummary: {
        attachedCount,
        candidateCount,
        confidenceLabel: deriveConfidenceLabel(connectedTravelItems)
      },
      exportHighlights: exportPacks,
      discoveryPrompts: jaipurTrip.highlights.map((highlight, index) => ({
        id: `highlight-${index}`,
        label: highlight
      }))
    }
  };
}

export function getBuddyScreenData(state: ScreenState = "populated"): ScreenData<BuddyScreenData> {
  if (state === "loading") {
    return {
      state,
      data: {
        tripTitle: jaipurTrip.title,
        tripContext: "Loading the active trip context for Buddy.",
        messages: [],
        promptOptions: [],
        actionChips: [],
        composerHint: "Preparing your trip-aware composer."
      }
    };
  }

  if (state === "empty") {
    return {
      state,
      data: {
        tripTitle: jaipurTrip.title,
        tripContext: "Buddy is ready, but this thread has not started yet.",
        messages: [],
        promptOptions: buddyPromptOptions,
        actionChips: homeQuickActions,
        composerHint: "Ask about pacing, exports, routes, or a softer plan."
      }
    };
  }

  return {
    state,
    data: {
      tripTitle: jaipurTrip.title,
      tripContext: `${jaipurTrip.destinationCity}, ${jaipurTrip.destinationRegion} · ${jaipurTrip.preferences.travelPace} pace · preferred maps ${toPrettyMapsLabel(
        jaipurTrip.preferences.preferredMapsApp
      )}`,
      messages: buddyThread,
      promptOptions: buddyPromptOptions,
      actionChips: buddyThread.flatMap((message) =>
        (message.actions ?? []).map((action) => ({
          id: action.id,
          label: action.label
        }))
      ),
      composerHint: "No live AI yet. This shell keeps Buddy grounded to the trip and its next actions."
    }
  };
}

export function getTripsScreenData(state: ScreenState = "populated"): ScreenData<TripsScreenData> {
  if (state === "loading") {
    return {
      state,
      data: {
        trip: undefined,
        itineraryDays: [],
        exportPacks: [loadingExportState],
        connectedAccounts: [],
        connectedItems: [],
        mapsPreference: defaultPreferences.preferredMapsApp
      }
    };
  }

  if (state === "empty") {
    return {
      state,
      data: {
        trip: undefined,
        itineraryDays: [],
        exportPacks: [],
        connectedAccounts: [],
        connectedItems: [],
        mapsPreference: defaultPreferences.preferredMapsApp
      }
    };
  }

  return {
    state,
    data: {
      trip: jaipurTrip,
      itineraryDays: jaipurTrip.itinerary,
      exportPacks,
      connectedAccounts,
      connectedItems: [...connectedTravelItems, failedConnectedItem],
      mapsPreference: jaipurTrip.preferences.preferredMapsApp
    }
  };
}

export function getSavedScreenData(state: ScreenState = "populated"): ScreenData<SavedScreenData> {
  if (state === "loading") {
    return {
      state,
      data: {
        sections: [],
        suggestionChips: []
      }
    };
  }

  if (state === "empty") {
    return {
      state,
      data: {
        sections: [],
        suggestionChips: defaultPreferences.interests.map((interest, index) => ({
          id: `empty-interest-${index}`,
          label: interest
        }))
      }
    };
  }

  return {
    state,
    data: {
      sections: buildSavedSections(jaipurTrip),
      suggestionChips: jaipurTrip.preferences.interests.map((interest, index) => ({
        id: `saved-interest-${index}`,
        label: interest
      }))
    }
  };
}

export function getProfileScreenData(state: ScreenState = "populated"): ScreenData<ProfileScreenData> {
  if (state === "loading") {
    return {
      state,
      data: {
        userName: "Aarohi Mehta",
        homeBase: "Delhi",
        preferences: defaultPreferences,
        connectedAccounts: [],
        trustNotes: [],
        supportActions: []
      }
    };
  }

  return {
    state,
    data: {
      userName: "Aarohi Mehta",
      homeBase: "Delhi",
      preferences: defaultPreferences,
      connectedAccounts,
      trustNotes: [
        "Permission prompts stay staged and contextual.",
        "Exports and map handoffs should feel portable, not locked in.",
        "Connected sources should stay calm even when confidence is partial."
      ],
      supportActions: [
        { id: "maps", label: "Review maps preference" },
        { id: "support", label: "Open support playbook" },
        { id: "privacy", label: "Read privacy summary" }
      ]
    }
  };
}
