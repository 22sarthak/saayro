import type { MapsApp, RoutePreview, TransportMode } from "./domain.js";

export type ExternalMapsApp = Exclude<MapsApp, "in-app-preview">;

export interface MapPlaceHandoffTarget {
  kind: "place";
  title: string;
  city?: string;
  subtitle?: string;
}

export interface MapRouteHandoffTarget {
  kind: "route";
  route: RoutePreview;
}

export type MapHandoffTarget = MapPlaceHandoffTarget | MapRouteHandoffTarget;

export interface ResolvedMapHandoff {
  provider: MapsApp;
  providerLabel: string;
  externalUrl: string | null;
  fallbackState: "external" | "in-app-preview";
  fallbackLabel: string;
  destinationLabel: string;
  copyableQuery: string;
}

function providerLabel(app: MapsApp): string {
  if (app === "google-maps") {
    return "Google Maps";
  }

  if (app === "apple-maps") {
    return "Apple Maps";
  }

  return "In-app Preview";
}

function encodeQuery(value: string): string {
  return encodeURIComponent(value.trim());
}

function toGoogleTravelMode(mode: TransportMode): string | null {
  if (mode === "walk") {
    return "walking";
  }

  if (mode === "drive" || mode === "ride-share") {
    return "driving";
  }

  if (mode === "metro" || mode === "rail" || mode === "flight") {
    return "transit";
  }

  return null;
}

function toAppleDirFlag(mode: TransportMode): string | null {
  if (mode === "walk") {
    return "w";
  }

  if (mode === "drive" || mode === "ride-share") {
    return "d";
  }

  if (mode === "metro" || mode === "rail" || mode === "flight") {
    return "r";
  }

  return null;
}

function buildPlaceQuery(target: MapPlaceHandoffTarget): string {
  return [target.title, target.city].filter(Boolean).join(", ");
}

function buildGoogleMapsUrl(target: MapHandoffTarget): string {
  if (target.kind === "route") {
    const travelMode = toGoogleTravelMode(target.route.mode);
    const params = new URLSearchParams({
      api: "1",
      origin: target.route.originLabel,
      destination: target.route.destinationLabel,
    });
    if (travelMode) {
      params.set("travelmode", travelMode);
    }
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeQuery(buildPlaceQuery(target))}`;
}

function buildAppleMapsUrl(target: MapHandoffTarget): string {
  if (target.kind === "route") {
    const params = new URLSearchParams({
      saddr: target.route.originLabel,
      daddr: target.route.destinationLabel,
    });
    const dirFlag = toAppleDirFlag(target.route.mode);
    if (dirFlag) {
      params.set("dirflg", dirFlag);
    }
    return `https://maps.apple.com/?${params.toString()}`;
  }

  return `https://maps.apple.com/?q=${encodeQuery(buildPlaceQuery(target))}`;
}

function resolveProvider(preferredApp: MapsApp, availableApps: MapsApp[]): MapsApp {
  if (availableApps.includes(preferredApp)) {
    return preferredApp;
  }

  const firstExternal = availableApps.find((app) => app !== "in-app-preview");
  return firstExternal ?? "in-app-preview";
}

export function createPlaceHandoffTarget(place: {
  title: string;
  city?: string;
  subtitle?: string;
}): MapPlaceHandoffTarget {
  const target: MapPlaceHandoffTarget = {
    kind: "place",
    title: place.title,
  };
  if (place.city) {
    target.city = place.city;
  }
  if (place.subtitle) {
    target.subtitle = place.subtitle;
  }
  return target;
}

export function createRouteHandoffTarget(route: RoutePreview): MapRouteHandoffTarget {
  return {
    kind: "route",
    route,
  };
}

export function resolveMapHandoff(
  target: MapHandoffTarget,
  preferredApp: MapsApp,
  availableApps: MapsApp[],
): ResolvedMapHandoff {
  const provider = resolveProvider(preferredApp, availableApps);
  const destinationLabel = target.kind === "route" ? target.route.destinationLabel : buildPlaceQuery(target);
  const copyableQuery = target.kind === "route"
    ? `${target.route.originLabel} to ${target.route.destinationLabel}`
    : buildPlaceQuery(target);

  if (provider === "in-app-preview") {
    return {
      provider,
      providerLabel: providerLabel(provider),
      externalUrl: null,
      fallbackState: "in-app-preview",
      fallbackLabel: "Preview route details",
      destinationLabel,
      copyableQuery,
    };
  }

  return {
    provider,
    providerLabel: providerLabel(provider),
    externalUrl: provider === "google-maps" ? buildGoogleMapsUrl(target) : buildAppleMapsUrl(target),
    fallbackState: "external",
    fallbackLabel: `Open in ${providerLabel(provider)}`,
    destinationLabel,
    copyableQuery,
  };
}
