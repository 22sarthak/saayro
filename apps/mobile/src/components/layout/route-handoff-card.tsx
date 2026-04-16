import type { MapsApp, RoutePreview } from "@saayro/types";
import { Text, View } from "react-native";
import { openMapHandoff, resolveRouteHandoff } from "@/lib/map-handoff";
import { ActionButton } from "@/components/primitives/action-button";
import { StatusBadge } from "@/components/primitives/status-badge";
import { SurfaceCard } from "@/components/primitives/surface-card";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

export function RouteHandoffCard({
  route,
  preferredMapsApp
}: {
  route: RoutePreview;
  preferredMapsApp: MapsApp;
}) {
  const theme = useMobileTheme();
  const handoff = resolveRouteHandoff(route, preferredMapsApp);

  return (
    <SurfaceCard tone="connected">
      <View style={{ gap: theme.spacing.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.md }}>
          <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 15 }}>Route handoff</Text>
          <StatusBadge tone="maps" label={handoff.providerLabel} />
        </View>
        <View style={{ gap: theme.spacing.xs }}>
          <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.bodyMedium, fontSize: 14 }}>{route.originLabel}</Text>
          <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13 }}>to {route.destinationLabel}</Text>
        </View>
        <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 19 }}>
          {route.durationMinutes} min · {route.distanceKilometers} km · {route.mode}
        </Text>
        {!handoff.externalUrl ? (
          <Text selectable style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 19 }}>
            Destination summary: {handoff.copyableQuery}
          </Text>
        ) : null}
        <View style={{ gap: theme.spacing.sm }}>
          <ActionButton
            label={handoff.fallbackLabel}
            onPress={() => {
              void openMapHandoff(handoff);
            }}
            disabled={!handoff.externalUrl}
          />
          <ActionButton label={handoff.externalUrl ? "Preview route details" : "External handoff unavailable"} variant="secondary" disabled />
        </View>
      </View>
    </SurfaceCard>
  );
}
