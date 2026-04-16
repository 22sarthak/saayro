import {
  buddyThread,
  connectedAccounts,
  connectedTravelItems,
  defaultPreferences,
  emptyTripState,
  exportPacks,
  failedConnectedItem,
  getBuddyScenario,
  getDashboardScenario,
  getProfileScenario,
  getSavedScenario,
  getTripHubScenario,
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

type ScreenState = "loading" | "empty" | "populated" | "partial";

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
  partialConnection: ConnectedTravelItem | undefined;
  trustNotes: string[];
  supportActions: ChipOption[];
  exportPacks: ExportPack[];
}

export const authEntryOptions: ChipOption[] = [
  { id: "google", label: "Google-first" },
  { id: "otp", label: "Mobile + OTP" },
  { id: "preview", label: "Mock shell" }
];

const homeQuickActions: ChipOption[] = getDashboardScenario("populated").quickActions.map(({ id, label }) => ({ id, label }));
const buddyPromptOptions: ChipOption[] = getBuddyScenario("empty").promptOptions.map(({ id, label }) => ({ id, label }));

function toPrettyMapsLabel(preferredMapsApp: MapsApp) {
  if (preferredMapsApp === "google-maps") {
    return "Google Maps";
  }

  if (preferredMapsApp === "apple-maps") {
    return "Apple Maps";
  }

  return "In-app Preview";
}

function buildSavedSections(_trip: Trip): SavedSectionViewModel[] {
  return getSavedScenario("populated").sections.map((section) => ({
    id: section.id,
    title: section.title,
    description: section.description,
    items: section.items
  }));
}

export function getHomeScreenData(state: ScreenState = "populated"): ScreenData<HomeScreenData> {
  const scenario = getDashboardScenario(state);

  return {
    state: scenario.state,
    data: {
      featuredTrip: scenario.featuredTrip,
      recentTrips: scenario.recentTrips,
      quickActions: scenario.quickActions.map(({ id, label }) => ({ id, label })),
      connectedSummary: {
        attachedCount: scenario.connectedSummary.attachedCount,
        candidateCount: scenario.connectedSummary.candidateCount,
        confidenceLabel: scenario.connectedSummary.confidenceLabel
      },
      exportHighlights: scenario.exportHighlights,
      discoveryPrompts: scenario.discoveryPrompts.map(({ id, label }) => ({ id, label }))
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
        partialConnection: undefined,
        trustNotes: [],
        supportActions: [],
        exportPacks: []
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
      partialConnection: failedConnectedItem,
      trustNotes: [
        "Permission prompts stay staged and contextual.",
        "Exports and map handoffs should feel portable, not locked in.",
        "Connected sources should stay calm even when confidence is partial."
      ],
      supportActions: [
        { id: "maps", label: "Review maps preference" },
        { id: "support", label: "Open support playbook" },
        { id: "privacy", label: "Read privacy summary" }
      ],
      exportPacks
    }
  };
}
