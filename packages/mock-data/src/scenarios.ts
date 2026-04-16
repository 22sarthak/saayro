import type {
  BuddyMessage,
  ConfidenceLabel,
  ConnectedAccount,
  ConnectedTravelItem,
  ExportPack,
  ItineraryDay,
  ItineraryStop,
  MapsApp,
  RoutePreview,
  Trip,
  TripSummary,
  UserPreferences
} from "@saayro/types";
import {
  buddyThread,
  connectedAccounts,
  connectedTravelItems,
  defaultPreferences,
  exportPacks,
  jaipurTrip,
  tripSummaries
} from "./fixtures.js";
import { emptyTripState, failedConnectedItem, loadingExportState } from "./states.js";

export type MockViewState = "loading" | "empty" | "populated" | "partial";
export type ScenarioTone = "buddy" | "connected" | "discovery" | "neutral";

export interface ScenarioChip {
  id: string;
  label: string;
  active?: boolean;
}

export interface ScenarioAction extends ScenarioChip {
  description?: string;
  href?: string;
  tone?: ScenarioTone;
}

export interface ConnectedTravelSummary {
  attachedCount: number;
  candidateCount: number;
  confidenceLabel: ConfidenceLabel;
  reviewCount: number;
  summaryLine: string;
}

export interface DashboardScenario {
  state: MockViewState;
  featuredTrip: Trip | undefined;
  recentTrips: TripSummary[];
  quickActions: ScenarioAction[];
  connectedSummary: ConnectedTravelSummary;
  exportHighlights: ExportPack[];
  discoveryPrompts: ScenarioChip[];
}

export interface BuddyScenario {
  state: MockViewState;
  tripTitle: string;
  tripContext: string;
  messages: BuddyMessage[];
  promptOptions: ScenarioChip[];
  actionChips: ScenarioChip[];
  composerHint: string;
}

export interface SavedScenarioItem {
  id: string;
  title: string;
  subtitle: string;
  category: "Stay" | "Meal" | "Discovery" | "Connected Travel";
  city: string;
  tags: string[];
  routeStop?: ItineraryStop;
}

export interface SavedScenarioSection {
  id: string;
  title: string;
  description: string;
  items: SavedScenarioItem[];
}

export interface TripHubScenario {
  state: MockViewState;
  trip: Trip | undefined;
  itineraryDays: ItineraryDay[];
  exportPacks: ExportPack[];
  connectedAccounts: ConnectedAccount[];
  connectedItems: ConnectedTravelItem[];
  connectedSummary: ConnectedTravelSummary;
  mapsPreference: MapsApp;
  routeHandoffCtaLabel: string;
  railActions: ScenarioAction[];
}

export interface SavedScenario {
  state: MockViewState;
  sections: SavedScenarioSection[];
  suggestionChips: ScenarioChip[];
  routePreview: RoutePreview | undefined;
}

export interface ProfileScenario {
  state: MockViewState;
  userName: string;
  homeBase: string;
  preferences: UserPreferences;
  connectedAccounts: ConnectedAccount[];
  partialConnection: ConnectedTravelItem | undefined;
  exportPacks: ExportPack[];
  trustNotes: string[];
  supportActions: ScenarioChip[];
}

function toPrettyMapsLabel(preferredMapsApp: MapsApp) {
  if (preferredMapsApp === "google-maps") {
    return "Google Maps";
  }

  if (preferredMapsApp === "apple-maps") {
    return "Apple Maps";
  }

  return "In-app Preview";
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

function buildConnectedSummary(items: ConnectedTravelItem[]): ConnectedTravelSummary {
  const attachedCount = items.filter((item) => item.state === "attached").length;
  const candidateCount = items.filter((item) => item.state === "candidate").length;
  const reviewCount = items.filter((item) => item.confidence === "needs-review").length;

  return {
    attachedCount,
    candidateCount,
    confidenceLabel: deriveConfidenceLabel(items),
    reviewCount,
    summaryLine:
      reviewCount > 0
        ? `${attachedCount} attached, ${candidateCount} awaiting review, ${reviewCount} needs a confidence check.`
        : `${attachedCount} attached and ${candidateCount} awaiting review.`
  };
}

const dashboardQuickActions: ScenarioAction[] = [
  {
    id: "ask-buddy",
    label: "Ask Buddy",
    description: "Get trip-aware guidance for pacing, route decisions, and handoff moments.",
    href: "/app/buddy",
    tone: "buddy"
  },
  {
    id: "open-trip-hub",
    label: "Open Trip Hub",
    description: "Review itinerary flow, export readiness, and connected travel in one place.",
    href: `/app/trips/${jaipurTrip.id}`,
    tone: "connected"
  },
  {
    id: "review-saved-places",
    label: "Review Saved Places",
    description: "Keep stays, meals, and discoveries close before you reshape the day.",
    href: "/app/saved",
    tone: "discovery"
  }
];

const buddyPromptOptions: ScenarioChip[] = [
  { id: "pace", label: "Soften day two pacing" },
  { id: "route", label: "Open Amber route" },
  { id: "export", label: "Share Export Pack" }
];

const profileSupportActions: ScenarioChip[] = [
  { id: "maps", label: "Review Preferred Maps App" },
  { id: "connected", label: "Review Connected Travel" },
  { id: "privacy", label: "Review privacy summary" }
];

function stopToSavedItem(stop: ItineraryStop): SavedScenarioItem {
  const category =
    stop.type === "stay"
      ? "Stay"
      : stop.type === "meal"
        ? "Meal"
        : "Discovery";

  return {
    id: stop.id,
    title: stop.title,
    subtitle: stop.subtitle,
    category,
    city: stop.city,
    tags: stop.tags,
    routeStop: stop
  };
}

function connectedToSavedItem(item: ConnectedTravelItem): SavedScenarioItem {
  return {
    id: item.id,
    title: item.title,
    subtitle: item.state === "attached" ? "Connected Travel item attached to this trip." : "Connected Travel item waiting for review.",
    category: "Connected Travel",
    city: "Linked source",
    tags: [item.provider.toUpperCase(), item.itemType, item.state]
  };
}

function buildSavedSections(trip: Trip, items: ConnectedTravelItem[]): SavedScenarioSection[] {
  const tripStops = trip.itinerary.flatMap((day) => day.stops);

  return [
    {
      id: "held-for-this-trip",
      title: "Held for this trip",
      description: "The stays and tables worth keeping close while the itinerary is still taking shape.",
      items: tripStops.filter((stop) => stop.type === "stay" || stop.type === "meal").map(stopToSavedItem)
    },
    {
      id: "saved-discoveries",
      title: "Saved discoveries",
      description: "Cultural and route-aware stops that still feel worth carrying forward.",
      items: tripStops.filter((stop) => stop.type === "activity").map(stopToSavedItem)
    },
    {
      id: "connected-travel",
      title: "Connected Travel",
      description: "Travel items surfaced from connected sources that can support the trip when reviewed calmly.",
      items: items.map(connectedToSavedItem)
    }
  ].filter((section) => section.items.length > 0);
}

export function getMapsAppLabel(preferredMapsApp: MapsApp) {
  return toPrettyMapsLabel(preferredMapsApp);
}

export function getDashboardScenario(state: MockViewState = "populated"): DashboardScenario {
  if (state === "loading") {
    return {
      state,
      featuredTrip: undefined,
      recentTrips: [],
      quickActions: dashboardQuickActions,
      connectedSummary: {
        attachedCount: 0,
        candidateCount: 0,
        confidenceLabel: "medium",
        reviewCount: 0,
        summaryLine: "Connected Travel is still preparing your trip context."
      },
      exportHighlights: [loadingExportState],
      discoveryPrompts: []
    };
  }

  if (state === "empty") {
    return {
      state,
      featuredTrip: undefined,
      recentTrips: emptyTripState,
      quickActions: dashboardQuickActions,
      connectedSummary: {
        attachedCount: 0,
        candidateCount: 0,
        confidenceLabel: "medium",
        reviewCount: 0,
        summaryLine: "Connected Travel will appear here once a trip starts to take shape."
      },
      exportHighlights: [],
      discoveryPrompts: defaultPreferences.interests.map((interest, index) => ({
        id: `interest-${index}`,
        label: interest
      }))
    };
  }

  return {
    state,
    featuredTrip: jaipurTrip,
    recentTrips: tripSummaries,
    quickActions: dashboardQuickActions,
    connectedSummary: buildConnectedSummary(connectedTravelItems),
    exportHighlights: exportPacks,
    discoveryPrompts: jaipurTrip.highlights.map((highlight, index) => ({
      id: `highlight-${index}`,
      label: highlight
    }))
  };
}

export function getBuddyScenario(state: MockViewState = "populated"): BuddyScenario {
  const baseContext = `${jaipurTrip.destinationCity}, ${jaipurTrip.destinationRegion} · ${jaipurTrip.startDate} to ${jaipurTrip.endDate} · ${jaipurTrip.preferences.travelPace} pace · preferred maps ${toPrettyMapsLabel(
    jaipurTrip.preferences.preferredMapsApp
  )}`;

  if (state === "loading") {
    return {
      state,
      tripTitle: jaipurTrip.title,
      tripContext: "Loading the active Trip Hub context for Buddy.",
      messages: [],
      promptOptions: [],
      actionChips: [],
      composerHint: "Preparing trip-aware guidance."
    };
  }

  if (state === "empty") {
    return {
      state,
      tripTitle: jaipurTrip.title,
      tripContext: baseContext,
      messages: [],
      promptOptions: buddyPromptOptions,
      actionChips: dashboardQuickActions.map(({ id, label }) => ({ id, label })),
      composerHint: "Ask about pacing, route handoff, connected travel, or the best Export Pack for this trip."
    };
  }

  return {
    state,
    tripTitle: jaipurTrip.title,
    tripContext: baseContext,
    messages: buddyThread,
    promptOptions: buddyPromptOptions,
    actionChips: buddyThread.flatMap((message) =>
      (message.actions ?? []).map((action) => ({
        id: action.id,
        label: action.label
      }))
    ),
    composerHint: "Buddy stays grounded to the active Trip Hub, its next stops, and the handoff decisions around it."
  };
}

export function getTripHubScenario(state: MockViewState = "partial"): TripHubScenario {
  if (state === "loading") {
    return {
      state,
      trip: undefined,
      itineraryDays: [],
      exportPacks: [loadingExportState],
      connectedAccounts: [],
      connectedItems: [],
      connectedSummary: {
        attachedCount: 0,
        candidateCount: 0,
        confidenceLabel: "medium",
        reviewCount: 0,
        summaryLine: "Connected Travel is still preparing the trip rail."
      },
      mapsPreference: defaultPreferences.preferredMapsApp,
      routeHandoffCtaLabel: "Open in Maps",
      railActions: dashboardQuickActions.filter((action) => action.id !== "open-trip-hub")
    };
  }

  if (state === "empty") {
    return {
      state,
      trip: undefined,
      itineraryDays: [],
      exportPacks: [],
      connectedAccounts: [],
      connectedItems: [],
      connectedSummary: {
        attachedCount: 0,
        candidateCount: 0,
        confidenceLabel: "medium",
        reviewCount: 0,
        summaryLine: "Connected Travel will appear alongside the Trip Hub once a trip exists."
      },
      mapsPreference: defaultPreferences.preferredMapsApp,
      routeHandoffCtaLabel: "Open in Maps",
      railActions: dashboardQuickActions
    };
  }

  const scenarioItems = state === "partial" ? [...connectedTravelItems, failedConnectedItem] : connectedTravelItems;

  return {
    state,
    trip: jaipurTrip,
    itineraryDays: jaipurTrip.itinerary,
    exportPacks,
    connectedAccounts,
    connectedItems: scenarioItems,
    connectedSummary: buildConnectedSummary(scenarioItems),
    mapsPreference: jaipurTrip.preferences.preferredMapsApp,
    routeHandoffCtaLabel: "Open in Maps",
    railActions: dashboardQuickActions.filter((action) => action.id !== "open-trip-hub")
  };
}

export function getSavedScenario(state: MockViewState = "populated"): SavedScenario {
  if (state === "loading") {
    return {
      state,
      sections: [],
      suggestionChips: [],
      routePreview: undefined
    };
  }

  if (state === "empty") {
    return {
      state,
      sections: [],
      suggestionChips: defaultPreferences.interests.map((interest, index) => ({
        id: `saved-interest-${index}`,
        label: interest
      })),
      routePreview: undefined
    };
  }

  const routePreview = jaipurTrip.itinerary.flatMap((day) => day.stops).find((stop) => stop.routePreview)?.routePreview;

  return {
    state,
    sections: buildSavedSections(jaipurTrip, connectedTravelItems),
    suggestionChips: jaipurTrip.preferences.interests.map((interest, index) => ({
      id: `saved-interest-${index}`,
      label: interest
    })),
    routePreview
  };
}

export function getProfileScenario(state: MockViewState = "partial"): ProfileScenario {
  if (state === "loading") {
    return {
      state,
      userName: "Aarohi Mehta",
      homeBase: "Delhi",
      preferences: defaultPreferences,
      connectedAccounts: [],
      partialConnection: undefined,
      exportPacks: [],
      trustNotes: [],
      supportActions: []
    };
  }

  return {
    state,
    userName: "Aarohi Mehta",
    homeBase: "Delhi",
    preferences: defaultPreferences,
    connectedAccounts,
    partialConnection: failedConnectedItem,
    exportPacks,
    trustNotes: [
      "Buddy and planning surfaces should stay grounded to the Trip Hub instead of becoming generic chat.",
      "Export Packs and map handoffs should feel portable, calm, and easy to review.",
      "Connected Travel should explain what is attached, what is inferred, and what still needs review."
    ],
    supportActions: profileSupportActions
  };
}
