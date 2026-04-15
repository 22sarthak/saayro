import type { ConnectedTravelItem, ExportPack, TripSummary } from "@saayro/types";

export const emptyTripState: TripSummary[] = [];

export const loadingExportState: ExportPack = {
  id: "export-loading",
  format: "pdf",
  label: "Trip PDF",
  description: "A polished itinerary with day structure, highlights, and route notes.",
  status: "generating"
};

export const failedConnectedItem: ConnectedTravelItem = {
  id: "item-failed",
  provider: "outlook",
  title: "Hotel reservation needs review",
  itemType: "hotel",
  state: "candidate",
  confidence: "needs-review",
  startAt: "2026-11-12T14:00:00.000Z",
  metadata: {
    reason: "Check-in time parsed from a low-confidence source."
  }
};

