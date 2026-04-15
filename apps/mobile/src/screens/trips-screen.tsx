import { Text, View } from "react-native";
import { AppTabShell } from "@/components/layout/app-tab-shell";
import { ConnectedAccountCard } from "@/components/layout/connected-account-card";
import { ConnectedTravelCard } from "@/components/layout/connected-travel-card";
import { EmptyStateBlock } from "@/components/layout/empty-state-block";
import { ExportShareTile } from "@/components/layout/export-share-tile";
import { ItineraryTimelineItem } from "@/components/layout/itinerary-timeline-item";
import { LoadingBlock } from "@/components/layout/loading-block";
import { RouteHandoffCard } from "@/components/layout/route-handoff-card";
import { SectionHeader } from "@/components/layout/section-header";
import { SurfaceCard } from "@/components/primitives/surface-card";
import { TagChip } from "@/components/primitives/tag-chip";
import { getTripsScreenData } from "@/lib/mock-selectors";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

export function TripsScreen() {
  const screen = getTripsScreenData();

  if (screen.state === "loading") {
    return <TripsLoadingScreen />;
  }

  if (screen.state === "empty") {
    return <TripsEmptyScreen />;
  }

  return <TripsPopulatedScreen />;
}

function TripsPopulatedScreen() {
  const theme = useMobileTheme();
  const { data } = getTripsScreenData("populated");
  const trip = data.trip!;
  const mappedRoutes = data.itineraryDays.flatMap((day) => day.stops).filter((stop) => stop.routePreview);

  return (
    <AppTabShell
      section="Trips"
      title="The active trip hub, tuned for mobile scanning."
      subtitle="Trips should hold itinerary flow, connected travel, exports, and route handoff in one calm stacked surface."
    >
      <SurfaceCard tone="connected">
        <View style={{ gap: theme.spacing.md }}>
          <View style={{ gap: theme.spacing.xs }}>
            <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.display, fontSize: 26, lineHeight: 30 }}>{trip.title}</Text>
            <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 14, lineHeight: 21 }}>
              {trip.destinationCity}, {trip.destinationRegion}, {trip.destinationCountry}
            </Text>
          </View>
          <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 14, lineHeight: 22 }}>{trip.overview}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
            {trip.highlights.map((highlight) => (
              <TagChip key={highlight} option={{ id: highlight, label: highlight }} />
            ))}
          </View>
        </View>
      </SurfaceCard>

      <SectionHeader
        eyebrow="Itinerary"
        title="Day-by-day flow"
        description="Each day should read like an editorial plan, not a wall of stops."
      />

      <View style={{ gap: theme.spacing.md }}>
        {data.itineraryDays.map((day) => (
          <SurfaceCard key={day.id} tone="raised">
            <View style={{ gap: theme.spacing.lg }}>
              <View style={{ gap: theme.spacing.xs }}>
                <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.bodyMedium, fontSize: 11, letterSpacing: 1.8 }}>
                  DAY {day.dayNumber}
                </Text>
                <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 18 }}>{day.title}</Text>
                <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 14, lineHeight: 21 }}>{day.summary}</Text>
              </View>
              <View style={{ gap: theme.spacing.sm }}>
                {day.stops.map((stop) => (
                  <ItineraryTimelineItem key={stop.id} stop={stop} />
                ))}
              </View>
            </View>
          </SurfaceCard>
        ))}
      </View>

      <SectionHeader eyebrow="Maps" title="Route handoff" description="Preferred maps choice should be visible at the moment route clarity matters." />

      <View style={{ gap: theme.spacing.md }}>
        {mappedRoutes.map((stop) => (
          <RouteHandoffCard key={stop.id} route={stop.routePreview!} preferredMapsApp={data.mapsPreference} />
        ))}
      </View>

      <SectionHeader eyebrow="Portability" title="Exports and sharing" description="Trip sharing should read as part of planning, not as an afterthought." />

      <View style={{ gap: theme.spacing.md }}>
        {data.exportPacks.map((pack) => (
          <ExportShareTile key={pack.id} pack={pack} />
        ))}
      </View>

      <SectionHeader
        eyebrow="Connected travel"
        title="Attached items and partial confidence"
        description="Partial sync and review-needed states should remain legible and calm."
      />

      <View style={{ gap: theme.spacing.md }}>
        {data.connectedItems.map((item) => (
          <ConnectedTravelCard key={item.id} item={item} />
        ))}
      </View>

      <View style={{ gap: theme.spacing.md }}>
        {data.connectedAccounts.map((account) => (
          <ConnectedAccountCard key={account.id} account={account} />
        ))}
      </View>
    </AppTabShell>
  );
}

function TripsEmptyScreen() {
  return (
    <AppTabShell
      section="Trips"
      title="No trip hub yet, but the structure is ready."
      subtitle="This empty state should preserve the feeling of a premium planner rather than collapsing into a blank shell."
    >
      <EmptyStateBlock
        eyebrow="No active trip"
        title="Create a destination-led trip shell"
        description="Once a trip exists, this tab becomes the home for itinerary flow, exports, route handoff, and connected travel review."
        actionLabel="Create trip"
        tone="connected"
      />
    </AppTabShell>
  );
}

function TripsLoadingScreen() {
  return (
    <AppTabShell
      section="Trips"
      title="Loading the itinerary shell."
      subtitle="The loading state should keep the trip rhythm visible: summary first, then itinerary, then handoff and exports."
    >
      <LoadingBlock lines={4} tone="connected" />
      <LoadingBlock lines={6} />
      <LoadingBlock lines={3} tone="connected" />
      <LoadingBlock lines={3} />
    </AppTabShell>
  );
}
