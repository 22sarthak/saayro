import * as Linking from "expo-linking";
import {
  createPlaceHandoffTarget,
  createRouteHandoffTarget,
  resolveMapHandoff,
  type MapsApp,
  type ResolvedMapHandoff,
  type RoutePreview,
} from "@saayro/types";

export function resolveRouteHandoff(route: RoutePreview, preferredMapsApp: MapsApp): ResolvedMapHandoff {
  return resolveMapHandoff(createRouteHandoffTarget(route), preferredMapsApp, route.mapsAppOptions);
}

export function resolvePlaceHandoff(
  place: { title: string; city?: string; subtitle?: string },
  preferredMapsApp: MapsApp,
): ResolvedMapHandoff {
  return resolveMapHandoff(
    createPlaceHandoffTarget(place),
    preferredMapsApp,
    ["google-maps", "apple-maps"],
  );
}

export async function openMapHandoff(handoff: ResolvedMapHandoff): Promise<boolean> {
  if (!handoff.externalUrl) {
    return false;
  }

  const canOpen = await Linking.canOpenURL(handoff.externalUrl);
  if (!canOpen) {
    await Linking.openURL(handoff.externalUrl);
    return true;
  }

  await Linking.openURL(handoff.externalUrl);
  return true;
}
