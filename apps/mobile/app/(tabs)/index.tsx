import { Text, View } from "react-native";
import { ActionButton } from "@/components/primitives/action-button";
import { TagChip } from "@/components/primitives/tag-chip";
import { AppTabShell } from "@/components/layout/app-tab-shell";
import { TabPreviewCard } from "@/components/layout/tab-preview-card";
import { getHomePreview, homeQuickActions } from "@/lib/mock-selectors";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

export default function HomeTab() {
  const theme = useMobileTheme();
  const { featuredTrip, recentTrips } = getHomePreview();

  return (
    <AppTabShell
      section="Discovery home"
      title="Move from intent to a trip that already feels usable."
      subtitle="Home is a mobile-first preview of quick actions, recent trips, and a calmer starting point."
    >
      <TabPreviewCard
        title={featuredTrip.title}
        description={`${featuredTrip.destinationCity}, ${featuredTrip.destinationRegion} · ${featuredTrip.startDate} to ${featuredTrip.endDate}`}
        tone="connected"
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
          {homeQuickActions.map((option) => (
            <TagChip key={option.id} option={option} />
          ))}
        </View>
      </TabPreviewCard>
      <TabPreviewCard
        title="Recent trips"
        description="A stacked mobile summary of active and draft travel plans."
      >
        <View style={{ gap: theme.spacing.md }}>
          {recentTrips.map((trip) => (
            <View key={trip.id} style={{ gap: 4 }}>
              <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 15 }}>{trip.title}</Text>
              <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13 }}>{trip.destinationLabel}</Text>
            </View>
          ))}
        </View>
      </TabPreviewCard>
      <ActionButton label="Create trip shell" variant="secondary" />
    </AppTabShell>
  );
}

