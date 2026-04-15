import { Text, View } from "react-native";
import { AppTabShell } from "@/components/layout/app-tab-shell";
import { TabPreviewCard } from "@/components/layout/tab-preview-card";
import { getTripsPreview } from "@/lib/mock-selectors";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

export default function TripsTab() {
  const theme = useMobileTheme();
  const trips = getTripsPreview();

  return (
    <AppTabShell
      section="Trips"
      title="Trip list first, detailed hub later."
      subtitle="This tab stays intentionally lightweight in Step 4A: it sets up the mobile trip entry point without building the full planner yet."
    >
      <TabPreviewCard title="Your trip shells" description="Recent and draft trips should be scannable at a glance.">
        <View style={{ gap: theme.spacing.lg }}>
          {trips.map((trip) => (
            <View
              key={trip.id}
              style={{
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.surfaceMuted,
                padding: theme.spacing.lg
              }}
            >
              <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 15 }}>{trip.title}</Text>
              <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13, marginTop: 4 }}>
                {trip.destinationLabel}
              </Text>
            </View>
          ))}
        </View>
      </TabPreviewCard>
      <TabPreviewCard title="Next expansion" description="The next prompt can turn this entry point into the full mobile trip hub and itinerary stack." tone="connected" />
    </AppTabShell>
  );
}

