import type { BuddyMessage, ConnectedTravelItem, ExportPack, Trip, TripSummary } from "@saayro/types";
import { buddyThread, connectedTravelItems, exportPacks, jaipurTrip, tripSummaries } from "./fixtures.js";

const primaryTripSummary = tripSummaries[0]!;

export function createTripSummary(overrides: Partial<TripSummary> = {}): TripSummary {
  return {
    ...primaryTripSummary,
    ...overrides
  };
}

export function createTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    ...jaipurTrip,
    ...overrides
  };
}

export function createBuddyThread(overrides: Partial<BuddyMessage>[] = []): BuddyMessage[] {
  return buddyThread.map((message, index) => ({
    ...message,
    ...(overrides[index] ?? {})
  }));
}

export function createConnectedItems(overrides: Partial<ConnectedTravelItem>[] = []): ConnectedTravelItem[] {
  return connectedTravelItems.map((item, index) => ({
    ...item,
    ...(overrides[index] ?? {})
  }));
}

export function createExportStates(overrides: Partial<ExportPack>[] = []): ExportPack[] {
  return exportPacks.map((pack, index) => ({
    ...pack,
    ...(overrides[index] ?? {})
  }));
}
