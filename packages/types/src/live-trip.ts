import type {
  BuddyMessage,
  ConnectedAccount,
  ConnectedTravelItem,
  ExportPack,
  ItineraryDay,
  ItineraryStop,
  MapsApp,
  RoutePreview,
  StopType,
  TransportMode,
  Trip,
  TripSummary,
  UserPreferences,
} from "./domain.js";

export interface BackendTripListItem {
  id: string;
  title: string;
  destination_city: string;
  destination_region: string;
  destination_country: string;
  start_date: string;
  end_date: string;
  status: Trip["status"];
  party: Trip["party"];
  highlights: string[];
}

export interface BackendTripRead extends BackendTripListItem {
  preferences: Record<string, unknown> | null;
  overview: string;
  created_at: string;
  updated_at: string;
}

export interface BackendItineraryStopRead {
  id: string;
  title: string;
  stop_type: string;
  city: string;
  subtitle: string;
  start_time: string;
  end_time: string | null;
  confidence: ItineraryStop["confidence"];
  tags: string[];
  note: string | null;
  route_metadata: Record<string, unknown> | null;
}

export interface BackendItineraryDayRead {
  id: string;
  day_number: number;
  date: string;
  title: string;
  summary: string;
  stops: BackendItineraryStopRead[];
}

export interface BackendItineraryRead {
  trip_id: string;
  days: BackendItineraryDayRead[];
}

export interface BackendExportJobRead {
  id: string;
  trip_id: string;
  format: ExportPack["format"];
  label: string;
  description: string;
  status: ExportPack["status"];
  artifact_location: string | null;
  created_at: string;
}

export interface BackendConnectedAccountRead {
  id: string;
  provider: ConnectedAccount["provider"];
  label: string;
  state: ConnectedAccount["state"];
  granted_scopes: string[];
  capabilities?: string[];
  provider_account_email?: string | null;
  provider_account_name?: string | null;
  last_synced_at?: string | null;
  last_imported_at?: string | null;
  attached_item_count?: number;
  review_needed_item_count?: number;
  imported_item_count?: number;
  status_message?: string | null;
}

export interface BackendConnectedTravelItemRead {
  id: string;
  provider?: ConnectedTravelItem["provider"];
  title: string;
  item_type: ConnectedTravelItem["itemType"];
  state: ConnectedTravelItem["state"];
  confidence: ConnectedTravelItem["confidence"];
  start_at: string;
  end_at?: string | null;
  metadata_json: Record<string, object>;
}

const defaultPreferences: UserPreferences = {
  preferredMapsApp: "google-maps",
  travelPace: "balanced",
  interests: [],
  budgetSensitivity: "medium",
  comfortPriority: "premium",
  notificationsEnabled: true,
};

function isMapsApp(value: unknown): value is MapsApp {
  return value === "google-maps" || value === "apple-maps" || value === "in-app-preview";
}

function isTravelPace(value: unknown): value is UserPreferences["travelPace"] {
  return value === "slow" || value === "balanced" || value === "full";
}

function isBudgetSensitivity(value: unknown): value is UserPreferences["budgetSensitivity"] {
  return value === "low" || value === "medium" || value === "high";
}

function isComfortPriority(value: unknown): value is UserPreferences["comfortPriority"] {
  return value === "essential" || value === "balanced" || value === "premium";
}

function isTransportMode(value: unknown): value is TransportMode {
  return value === "walk" || value === "drive" || value === "flight" || value === "metro" || value === "rail" || value === "ride-share";
}

function isStopType(value: unknown): value is StopType {
  return value === "flight" || value === "stay" || value === "activity" || value === "meal" || value === "transfer" || value === "checkpoint";
}

function normalizeMetadata(metadata: Record<string, object>): Record<string, string> {
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key, String(value)]));
}

export function isPersistedTripId(tripId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tripId);
}

export function buildDestinationLabel(city: string, region: string, country?: string): string {
  return [city, region, country].filter((value) => value && value.trim().length > 0).join(", ");
}

export function normalizeUserPreferences(raw: Record<string, unknown> | null | undefined): UserPreferences {
  if (!raw) {
    return defaultPreferences;
  }

  const preferredMapsApp = isMapsApp(raw.preferred_maps_app) ? raw.preferred_maps_app : defaultPreferences.preferredMapsApp;
  const travelPace = isTravelPace(raw.travel_pace) ? raw.travel_pace : defaultPreferences.travelPace;
  const interests =
    Array.isArray(raw.interests) && raw.interests.every((item) => typeof item === "string")
      ? raw.interests
      : defaultPreferences.interests;
  const budgetSensitivity = isBudgetSensitivity(raw.budget_sensitivity)
    ? raw.budget_sensitivity
    : defaultPreferences.budgetSensitivity;
  const comfortPriority = isComfortPriority(raw.comfort_priority)
    ? raw.comfort_priority
    : defaultPreferences.comfortPriority;
  const notificationsEnabled =
    typeof raw.notifications_enabled === "boolean" ? raw.notifications_enabled : defaultPreferences.notificationsEnabled;

  return {
    preferredMapsApp,
    travelPace,
    interests,
    budgetSensitivity,
    comfortPriority,
    notificationsEnabled,
  };
}

export function normalizeBackendTripSummary(
  raw: BackendTripListItem,
  options?: { connectedItemCount?: number; coverImage?: string },
): TripSummary {
  return {
    id: raw.id,
    title: raw.title,
    destinationLabel: buildDestinationLabel(raw.destination_city, raw.destination_region, raw.destination_country),
    coverImage: options?.coverImage ?? "",
    startDate: raw.start_date,
    endDate: raw.end_date,
    status: raw.status,
    party: raw.party,
    highlights: raw.highlights,
    connectedItemCount: options?.connectedItemCount ?? 0,
  };
}

export function normalizeBackendConnectedAccount(raw: BackendConnectedAccountRead): ConnectedAccount {
  const account: ConnectedAccount = {
    id: raw.id,
    provider: raw.provider,
    label: raw.label,
    state: raw.state,
    grantedScopes: raw.granted_scopes,
  };

  if (raw.capabilities?.length) {
    account.capabilities = raw.capabilities;
  }
  if (raw.provider_account_email) {
    account.providerAccountEmail = raw.provider_account_email;
  }
  if (raw.provider_account_name) {
    account.providerAccountName = raw.provider_account_name;
  }
  if (raw.last_synced_at) {
    account.lastSyncedAt = raw.last_synced_at;
  }
  if (raw.last_imported_at) {
    account.lastImportedAt = raw.last_imported_at;
  }
  if (typeof raw.attached_item_count === "number") {
    account.attachedItemCount = raw.attached_item_count;
  }
  if (typeof raw.review_needed_item_count === "number") {
    account.reviewNeededItemCount = raw.review_needed_item_count;
  }
  if (typeof raw.imported_item_count === "number") {
    account.importedItemCount = raw.imported_item_count;
  }
  if (raw.status_message) {
    account.statusMessage = raw.status_message;
  }

  return account;
}

export function normalizeBackendConnectedTravelItem(raw: BackendConnectedTravelItemRead): ConnectedTravelItem {
  const item: ConnectedTravelItem = {
    id: raw.id,
    provider: raw.provider ?? "gmail",
    title: raw.title,
    itemType: raw.item_type,
    state: raw.state,
    confidence: raw.confidence,
    startAt: raw.start_at,
    metadata: normalizeMetadata(raw.metadata_json),
  };

  if (raw.end_at) {
    item.endAt = raw.end_at;
  }

  return item;
}

function normalizeRoutePreview(raw: Record<string, unknown> | null): RoutePreview | undefined {
  if (!raw) {
    return undefined;
  }

  const fallbackMapsAppOptions: MapsApp[] = ["google-maps", "apple-maps"];
  const mode = isTransportMode(raw.mode) ? raw.mode : "drive";
  const mapsAppOptions =
    Array.isArray(raw.maps_app_options) && raw.maps_app_options.every(isMapsApp)
      ? raw.maps_app_options
      : fallbackMapsAppOptions;

  if (typeof raw.id !== "string" || typeof raw.origin_label !== "string" || typeof raw.destination_label !== "string") {
    return undefined;
  }

  return {
    id: raw.id,
    originLabel: raw.origin_label,
    destinationLabel: raw.destination_label,
    mode,
    durationMinutes: typeof raw.duration_minutes === "number" ? raw.duration_minutes : 0,
    distanceKilometers: typeof raw.distance_kilometers === "number" ? raw.distance_kilometers : 0,
    mapsAppOptions,
  };
}

function normalizeItineraryStop(raw: BackendItineraryStopRead): ItineraryStop {
  const stop: ItineraryStop = {
    id: raw.id,
    title: raw.title,
    type: isStopType(raw.stop_type) ? raw.stop_type : "activity",
    city: raw.city,
    subtitle: raw.subtitle,
    startTime: raw.start_time,
    confidence: raw.confidence,
    tags: raw.tags,
  };

  if (raw.end_time) {
    stop.endTime = raw.end_time;
  }
  if (raw.note) {
    stop.note = raw.note;
  }
  const routePreview = normalizeRoutePreview(raw.route_metadata);
  if (routePreview) {
    stop.routePreview = routePreview;
  }

  return stop;
}

export function normalizeBackendItineraryDays(days: BackendItineraryDayRead[]): ItineraryDay[] {
  return days.map((day) => ({
    id: day.id,
    dayNumber: day.day_number,
    date: day.date,
    title: day.title,
    summary: day.summary,
    stops: day.stops.map(normalizeItineraryStop),
  }));
}

export function normalizeBackendExportPacks(raw: BackendExportJobRead[]): ExportPack[] {
  return raw.map((job) => ({
    id: job.id,
    format: job.format,
    label: job.label,
    description: job.description,
    status: job.status,
    lastGeneratedAt: job.created_at,
  }));
}

export function buildTripViewModel(input: {
  trip: BackendTripRead;
  itinerary?: BackendItineraryRead | null;
  exports?: BackendExportJobRead[];
  connectedAccounts?: ConnectedAccount[];
  connectedItems?: ConnectedTravelItem[];
  buddyThread?: BuddyMessage[];
}): Trip {
  return {
    id: input.trip.id,
    title: input.trip.title,
    destinationCity: input.trip.destination_city,
    destinationRegion: input.trip.destination_region,
    destinationCountry: input.trip.destination_country,
    startDate: input.trip.start_date,
    endDate: input.trip.end_date,
    status: input.trip.status,
    party: input.trip.party,
    preferences: normalizeUserPreferences(input.trip.preferences),
    overview: input.trip.overview,
    highlights: input.trip.highlights,
    itinerary: normalizeBackendItineraryDays(input.itinerary?.days ?? []),
    exports: normalizeBackendExportPacks(input.exports ?? []),
    connectedAccounts: input.connectedAccounts ?? [],
    connectedItems: input.connectedItems ?? [],
    buddyThread: input.buddyThread ?? [],
  };
}
