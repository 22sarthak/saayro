import type {
  BuddyMessage,
  ConnectedTravelItem,
  ExportFormat,
  ExportPack,
  ItineraryDay,
  MapsApp,
  RoutePreview,
  Trip,
  TripSummary,
  UserPreferences
} from "./domain.js";

export interface CreateTripRequest {
  title: string;
  destinationCity: string;
  destinationRegion: string;
  startDate: string;
  endDate: string;
  party: Trip["party"];
  preferences: UserPreferences;
}

export interface ListTripsResponse {
  trips: TripSummary[];
}

export interface GetTripResponse {
  trip: Trip;
}

export interface UpdateTripRequest {
  title?: string;
  status?: Trip["status"];
  highlights?: string[];
  preferences?: UserPreferences;
}

export interface GenerateItineraryRequest {
  tripId: string;
  optimizationGoal?: "distance" | "pacing" | "priority";
}

export interface ItineraryResponse {
  itinerary: ItineraryDay[];
}

export interface BuddyMessageRequest {
  tripId: string;
  content: string;
  mediaIds?: string[];
}

export interface BuddyMessageResponse {
  message: BuddyMessage;
}

export interface CreateExportRequest {
  tripId: string;
  format: ExportFormat;
}

export interface ExportResponse {
  exportPack: ExportPack;
}

export interface MapHandoffRequest {
  tripId: string;
  stopId: string;
  app: MapsApp;
}

export interface MapHandoffResponse {
  routePreview: RoutePreview;
  deepLink: string;
}

export interface ConnectedTravelResponse {
  items: ConnectedTravelItem[];
}

