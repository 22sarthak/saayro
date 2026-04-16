import {
  getBuddyScenario,
  getDashboardScenario,
  getProfileScenario,
  getSavedScenario,
  getTripHubScenario,
  type SavedScenarioItem,
  type ScenarioAction
} from "@saayro/mock-data";
import type { Trip, TripSummary } from "@saayro/types";

export interface QuickAction extends ScenarioAction {}
export interface SavedCollectionItem extends SavedScenarioItem {}

export const quickActions: QuickAction[] = getDashboardScenario("populated").quickActions;

export function getFeaturedTrip(): Trip {
  return getDashboardScenario("populated").featuredTrip!;
}

export function getRecentTrips(): TripSummary[] {
  return getDashboardScenario("populated").recentTrips;
}

export function getNoTripState(): TripSummary[] {
  return getDashboardScenario("empty").recentTrips;
}

export function getDashboardLoadingCard() {
  return getDashboardScenario("loading").exportHighlights[0]!;
}

export function getBuddyThread() {
  return getBuddyScenario("populated").messages;
}

export function getTripById(tripId: string): Trip | undefined {
  const trip = getTripHubScenario("partial").trip;
  return tripId === trip?.id ? trip : undefined;
}

export function getSavedCollection(): SavedCollectionItem[] {
  return getSavedScenario("populated").sections.flatMap((section) => section.items);
}

export function getSavedEmptyCollection(): SavedCollectionItem[] {
  return getSavedScenario("empty").sections.flatMap((section) => section.items);
}

export function getProfileData() {
  return getProfileScenario("partial");
}
