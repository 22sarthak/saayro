import type { MapsApp, RoutePreview } from "@saayro/types";
import { Text, View } from "react-native";
import { ActionButton } from "@/components/primitives/action-button";
import { StatusBadge } from "@/components/primitives/status-badge";
import { SurfaceCard } from "@/components/primitives/surface-card";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

function mapsLabel(app: MapsApp) {
  if (app === "google-maps") {
    return "Google Maps";
  }

  if (app === "apple-maps") {
    return "Apple Maps";
  }

  return "In-app preview";
}

export function RouteHandoffCard({
  route,
  preferredMapsApp
}: {
  route: RoutePreview;
  preferredMapsApp: MapsApp;
}) {
  const theme = useMobileTheme();

  return (
    <SurfaceCard tone="connected">
      <View style={{ gap: theme.spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.md }}>
          <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 16 }}>Route handoff</Text>
          <StatusBadge tone="maps" label={mapsLabel(preferredMapsApp)} />
        </View>
        <View style={{ gap: theme.spacing.xs }}>
          <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.bodyMedium, fontSize: 14 }}>{route.originLabel}</Text>
          <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13 }}>to {route.destinationLabel}</Text>
        </View>
        <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 14, lineHeight: 21 }}>
          {route.durationMinutes} min · {route.distanceKilometers} km · {route.mode}
        </Text>
        <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
          <View style={{ flex: 1 }}>
            <ActionButton label={`Open in ${mapsLabel(preferredMapsApp)}`} />
          </View>
          <View style={{ flex: 1 }}>
            <ActionButton label="Preview route" variant="secondary" />
          </View>
        </View>
      </View>
    </SurfaceCard>
  );
}
