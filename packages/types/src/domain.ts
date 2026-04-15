export type EntityId = string;
export type ISODateString = string;
export type ISODateTimeString = string;

export type TripStatus = "draft" | "planned" | "active" | "completed" | "archived";
export type StopType = "flight" | "stay" | "activity" | "meal" | "transfer" | "checkpoint";
export type ExportFormat = "pdf" | "notes" | "share-link" | "whatsapp";
export type MapsApp = "google-maps" | "apple-maps" | "in-app-preview";
export type ConnectionProvider = "google" | "gmail" | "outlook" | "calendar";
export type ConnectionState = "not-connected" | "connecting" | "connected" | "partial" | "revoked";
export type ConfidenceLabel = "high" | "medium" | "low" | "needs-review";
export type TransportMode = "walk" | "drive" | "flight" | "metro" | "rail" | "ride-share";
export type TravelerParty = "solo" | "couple" | "family" | "friends" | "business";
export type TravelPace = "slow" | "balanced" | "full";
export type SuggestionActionType =
  | "add-stop"
  | "optimize-day"
  | "compare-options"
  | "open-map"
  | "draft-export";

export interface UserPreferences {
  preferredMapsApp: MapsApp;
  travelPace: TravelPace;
  interests: string[];
  budgetSensitivity: "low" | "medium" | "high";
  comfortPriority: "essential" | "balanced" | "premium";
  notificationsEnabled: boolean;
}

export interface TripSummary {
  id: EntityId;
  title: string;
  destinationLabel: string;
  coverImage: string;
  startDate: ISODateString;
  endDate: ISODateString;
  status: TripStatus;
  party: TravelerParty;
  highlights: string[];
  connectedItemCount: number;
}

export interface RoutePreview {
  id: EntityId;
  originLabel: string;
  destinationLabel: string;
  mode: TransportMode;
  durationMinutes: number;
  distanceKilometers: number;
  mapsAppOptions: MapsApp[];
}

export interface ItineraryStop {
  id: EntityId;
  title: string;
  type: StopType;
  city: string;
  subtitle: string;
  startTime: string;
  endTime?: string;
  confidence: ConfidenceLabel;
  tags: string[];
  note?: string;
  routePreview?: RoutePreview;
}

export interface ItineraryDay {
  id: EntityId;
  dayNumber: number;
  date: ISODateString;
  title: string;
  summary: string;
  stops: ItineraryStop[];
}

export interface ExportPack {
  id: EntityId;
  format: ExportFormat;
  label: string;
  description: string;
  status: "idle" | "generating" | "ready" | "failed";
  lastGeneratedAt?: ISODateTimeString;
}

export interface ConnectedAccount {
  id: EntityId;
  provider: ConnectionProvider;
  label: string;
  state: ConnectionState;
  grantedScopes: string[];
  lastSyncedAt?: ISODateTimeString;
}

export interface ConnectedTravelItem {
  id: EntityId;
  provider: ConnectionProvider;
  title: string;
  itemType: "flight" | "hotel" | "event" | "reservation";
  state: "candidate" | "attached" | "ignored";
  confidence: ConfidenceLabel;
  startAt: ISODateTimeString;
  endAt?: ISODateTimeString;
  metadata: Record<string, string>;
}

export interface BuddySuggestionAction {
  id: EntityId;
  type: SuggestionActionType;
  label: string;
  payload: Record<string, string>;
}

export interface BuddyMessage {
  id: EntityId;
  role: "user" | "buddy";
  content: string;
  createdAt: ISODateTimeString;
  confidence?: ConfidenceLabel;
  actions?: BuddySuggestionAction[];
}

export interface Trip {
  id: EntityId;
  title: string;
  destinationCity: string;
  destinationRegion: string;
  destinationCountry: string;
  startDate: ISODateString;
  endDate: ISODateString;
  status: TripStatus;
  party: TravelerParty;
  preferences: UserPreferences;
  overview: string;
  highlights: string[];
  itinerary: ItineraryDay[];
  exports: ExportPack[];
  connectedAccounts: ConnectedAccount[];
  connectedItems: ConnectedTravelItem[];
  buddyThread: BuddyMessage[];
}

