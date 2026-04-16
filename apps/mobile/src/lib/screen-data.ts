import {
  getBuddyScenario,
  getDashboardScenario,
  getProfileScenario,
  getSavedScenario,
  getTripHubScenario
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

export type ScreenState = "loading" | "empty" | "populated" | "partial";

export interface ScreenData<T> {
  state: ScreenState;
  data: T;
}

export interface HomeScreenData {
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

export interface BuddyScreenData {
  tripTitle: string;
  tripContext: string;
  messages: BuddyMessage[];
  promptOptions: ChipOption[];
  actionChips: ChipOption[];
  composerHint: string;
}

export interface TripsScreenData {
  trip: Trip | undefined;
  itineraryDays: ItineraryDay[];
  exportPacks: ExportPack[];
  connectedAccounts: ConnectedAccount[];
  connectedItems: ConnectedTravelItem[];
  mapsPreference: MapsApp;
}

export interface SavedItemViewModel {
  id: string;
  title: string;
  subtitle: string;
  city: string;
  category: string;
  tags: string[];
  routeStop?: ItineraryStop;
}

export interface SavedSectionViewModel {
  id: string;
  title: string;
  description: string;
  items: SavedItemViewModel[];
}

export interface SavedScreenData {
  sections: SavedSectionViewModel[];
  suggestionChips: ChipOption[];
}

export interface ProfileScreenData {
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
  const scenario = getBuddyScenario(state);

  return {
    state: scenario.state,
    data: {
      tripTitle: scenario.tripTitle,
      tripContext: scenario.tripContext,
      messages: scenario.messages,
      promptOptions: scenario.promptOptions.map(({ id, label }) => ({ id, label })),
      actionChips: scenario.actionChips.map(({ id, label }) => ({ id, label })),
      composerHint: scenario.composerHint
    }
  };
}

export function getTripsScreenData(state: ScreenState = "partial"): ScreenData<TripsScreenData> {
  const scenario = getTripHubScenario(state);

  return {
    state: scenario.state,
    data: {
      trip: scenario.trip,
      itineraryDays: scenario.itineraryDays,
      exportPacks: scenario.exportPacks,
      connectedAccounts: scenario.connectedAccounts,
      connectedItems: scenario.connectedItems,
      mapsPreference: scenario.mapsPreference
    }
  };
}

export function getSavedScreenData(state: ScreenState = "populated"): ScreenData<SavedScreenData> {
  const scenario = getSavedScenario(state);

  return {
    state: scenario.state,
    data: {
      sections: scenario.sections.map((section) => ({
        id: section.id,
        title: section.title,
        description: section.description,
        items: section.items
      })),
      suggestionChips: scenario.suggestionChips.map(({ id, label }) => ({ id, label }))
    }
  };
}

export function getProfileScreenData(state: ScreenState = "partial"): ScreenData<ProfileScreenData> {
  const scenario = getProfileScenario(state);

  return {
    state: scenario.state,
    data: {
      userName: scenario.userName,
      homeBase: scenario.homeBase,
      preferences: scenario.preferences,
      connectedAccounts: scenario.connectedAccounts,
      partialConnection: scenario.partialConnection,
      trustNotes: scenario.trustNotes,
      supportActions: scenario.supportActions.map(({ id, label }) => ({ id, label })),
      exportPacks: scenario.exportPacks
    }
  };
}
