import type {
  BuddyMessage,
  ConnectedAccount,
  ConnectedTravelItem,
  ExportPack,
  ItineraryDay,
  RoutePreview,
  Trip,
  TripSummary,
  UserPreferences
} from "@saayro/types";

export const defaultPreferences: UserPreferences = {
  preferredMapsApp: "google-maps",
  travelPace: "balanced",
  interests: ["boutique stays", "regional food", "sunrise viewpoints"],
  budgetSensitivity: "medium",
  comfortPriority: "premium",
  notificationsEnabled: true
};

export const tripRoutePreview: RoutePreview = {
  id: "route-jaipur-amber",
  originLabel: "Narain Niwas Palace",
  destinationLabel: "Amber Fort",
  mode: "drive",
  durationMinutes: 28,
  distanceKilometers: 12.4,
  mapsAppOptions: ["google-maps", "in-app-preview"]
};

export const jaipurItinerary: ItineraryDay[] = [
  {
    id: "day-1",
    dayNumber: 1,
    date: "2026-11-12",
    title: "Arrive softly, settle beautifully",
    summary: "A gentle arrival day with one heritage walk, one sunset moment, and space to breathe.",
    stops: [
      {
        id: "stop-1",
        title: "Check in at Narain Niwas Palace",
        type: "stay",
        city: "Jaipur",
        subtitle: "A slow-luxury base close to the old city edge.",
        startTime: "14:00",
        confidence: "high",
        tags: ["stay", "check-in", "rest"]
      },
      {
        id: "stop-2",
        title: "Patrika Gate and Jawahar Circle stroll",
        type: "activity",
        city: "Jaipur",
        subtitle: "Light golden-hour walk before dinner.",
        startTime: "17:00",
        endTime: "18:00",
        confidence: "medium",
        tags: ["sunset", "walk", "easy"]
      },
      {
        id: "stop-3",
        title: "Dinner at Bar Palladio",
        type: "meal",
        city: "Jaipur",
        subtitle: "Editorial, intimate, and a good first-night mood.",
        startTime: "20:00",
        endTime: "21:30",
        confidence: "high",
        tags: ["dinner", "premium", "reservation"],
        note: "Request an outdoor table if the weather stays clear."
      }
    ]
  },
  {
    id: "day-2",
    dayNumber: 2,
    date: "2026-11-13",
    title: "Amber, craft, and old-city rhythm",
    summary: "A route-clustered day built around lower-traffic timing and richer local texture.",
    stops: [
      {
        id: "stop-4",
        title: "Amber Fort",
        type: "activity",
        city: "Jaipur",
        subtitle: "Early slot for softer light and easier movement.",
        startTime: "08:00",
        endTime: "10:30",
        confidence: "high",
        tags: ["heritage", "must-see", "early-start"],
        routePreview: tripRoutePreview
      },
      {
        id: "stop-5",
        title: "Lunch at Samode Haveli courtyard",
        type: "meal",
        city: "Jaipur",
        subtitle: "Cool courtyard stop before the old city picks up heat.",
        startTime: "13:00",
        endTime: "14:15",
        confidence: "medium",
        tags: ["lunch", "courtyard", "rest"]
      },
      {
        id: "stop-6",
        title: "Johari Bazaar craft pass",
        type: "activity",
        city: "Jaipur",
        subtitle: "A focused browse instead of an all-day market sprawl.",
        startTime: "16:00",
        endTime: "18:00",
        confidence: "medium",
        tags: ["shopping", "craft", "culture"]
      }
    ]
  }
];

export const buddyThread: BuddyMessage[] = [
  {
    id: "msg-1",
    role: "user",
    content: "Can we make day two feel less rushed but still keep Amber Fort?",
    createdAt: "2026-10-10T09:15:00.000Z"
  },
  {
    id: "msg-2",
    role: "buddy",
    content:
      "Yes. Keep Amber early, trim one market segment, and make lunch your recovery anchor. That preserves the signature stop without turning the day into a checklist.",
    createdAt: "2026-10-10T09:15:10.000Z",
    confidence: "high",
    actions: [
      {
        id: "action-1",
        type: "optimize-day",
        label: "Soften day two pacing",
        payload: { dayId: "day-2", goal: "pacing" }
      },
      {
        id: "action-2",
        type: "open-map",
        label: "Review Amber route",
        payload: { routeId: "route-jaipur-amber" }
      }
    ]
  }
];

export const exportPacks: ExportPack[] = [
  {
    id: "export-1",
    format: "pdf",
    label: "Trip PDF",
    description: "A polished itinerary with day structure, highlights, and route notes.",
    status: "ready",
    lastGeneratedAt: "2026-10-10T09:16:00.000Z"
  },
  {
    id: "export-2",
    format: "whatsapp",
    label: "WhatsApp share",
    description: "Compact day-by-day copy designed for fast sharing.",
    status: "idle"
  },
  {
    id: "export-3",
    format: "share-link",
    label: "Shareable link",
    description: "A simple read-only trip view for travel companions.",
    status: "generating"
  }
];

export const connectedAccounts: ConnectedAccount[] = [
  {
    id: "conn-1",
    provider: "google",
    label: "Google account",
    state: "connected",
    grantedScopes: ["profile", "email"],
    lastSyncedAt: "2026-10-10T08:50:00.000Z"
  },
  {
    id: "conn-2",
    provider: "gmail",
    label: "Inbox travel scan",
    state: "partial",
    grantedScopes: ["gmail.readonly"],
    lastSyncedAt: "2026-10-10T08:55:00.000Z"
  }
];

export const connectedTravelItems: ConnectedTravelItem[] = [
  {
    id: "item-1",
    provider: "gmail",
    title: "Vistara UK561 Delhi to Jaipur",
    itemType: "flight",
    state: "attached",
    confidence: "high",
    startAt: "2026-11-12T07:30:00.000Z",
    endAt: "2026-11-12T08:35:00.000Z",
    metadata: {
      pnr: "Q8L2MV",
      terminal: "T3",
      seat: "3A"
    }
  },
  {
    id: "item-2",
    provider: "gmail",
    title: "Narain Niwas Palace reservation",
    itemType: "hotel",
    state: "candidate",
    confidence: "medium",
    startAt: "2026-11-12T14:00:00.000Z",
    endAt: "2026-11-14T11:00:00.000Z",
    metadata: {
      bookingSource: "Direct",
      roomType: "Heritage Suite"
    }
  }
];

export const jaipurTrip: Trip = {
  id: "trip-jaipur-november",
  title: "Jaipur Long Weekend",
  destinationCity: "Jaipur",
  destinationRegion: "Rajasthan",
  destinationCountry: "India",
  startDate: "2026-11-12",
  endDate: "2026-11-14",
  status: "planned",
  party: "couple",
  preferences: defaultPreferences,
  overview:
    "A premium, pace-aware Jaipur escape with one signature heritage arc, one strong dining spine, and room for spontaneous discovery.",
  highlights: ["Amber Fort", "Bar Palladio", "Johari Bazaar"],
  itinerary: jaipurItinerary,
  exports: exportPacks,
  connectedAccounts,
  connectedItems: connectedTravelItems,
  buddyThread
};

export const tripSummaries: TripSummary[] = [
  {
    id: jaipurTrip.id,
    title: jaipurTrip.title,
    destinationLabel: "Jaipur, Rajasthan",
    coverImage: "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1200&q=80",
    startDate: jaipurTrip.startDate,
    endDate: jaipurTrip.endDate,
    status: jaipurTrip.status,
    party: jaipurTrip.party,
    highlights: jaipurTrip.highlights,
    connectedItemCount: jaipurTrip.connectedItems.length
  },
  {
    id: "trip-kochi-january",
    title: "Kochi Design Escape",
    destinationLabel: "Kochi, Kerala",
    coverImage: "https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=1200&q=80",
    startDate: "2027-01-18",
    endDate: "2027-01-21",
    status: "draft",
    party: "friends",
    highlights: ["Fort Kochi", "Waterside stay"],
    connectedItemCount: 0
  }
];

