import type { ConnectedAccount, ConnectedTravelItem } from "@saayro/types";
import { useEffect, useState } from "react";
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
import { useAuth } from "@/lib/auth";
import { getTripsScreenData } from "@/lib/screen-data";
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
  const { session, status, listConnections, listTripConnectedItems } = useAuth();
  const { data } = getTripsScreenData("partial");
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>(data.connectedAccounts);
  const [connectedItems, setConnectedItems] = useState<ConnectedTravelItem[]>(data.connectedItems);
  const trip = data.trip!;
  const mappedRoutes = data.itineraryDays.flatMap((day) => day.stops).filter((stop) => stop.routePreview);

  useEffect(() => {
    if (status !== "ready" || !session?.authenticated) {
      setConnectedAccounts(data.connectedAccounts);
      setConnectedItems(data.connectedItems);
      return;
    }

    let active = true;
    void Promise.all([listConnections(), listTripConnectedItems(trip.id)])
      .then(([accounts, items]) => {
        if (!active) {
          return;
        }
        setConnectedAccounts(accounts);
        setConnectedItems(items.length > 0 ? items : data.connectedItems);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setConnectedAccounts(data.connectedAccounts);
        setConnectedItems(data.connectedItems);
      });

    return () => {
      active = false;
    };
  }, [listConnections, listTripConnectedItems, session?.authenticated, status, trip.id]);

  return (
    <AppTabShell
      section="Trips"
      title="The active trip hub, tuned for mobile."
      subtitle="Trips stays the strongest tab, but with tighter hierarchy, quicker scanning, and cleaner stacked sections."
    >
      <SurfaceCard tone="connected">
        <View style={{ gap: theme.spacing.md }}>
          <View style={{ gap: theme.spacing.xs }}>
            <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.display, fontSize: 23, lineHeight: 27 }}>{trip.title}</Text>
            <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 19 }}>
              {trip.destinationCity}, {trip.destinationRegion}, {trip.destinationCountry}
            </Text>
          </View>
          <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 20 }}>{trip.overview}</Text>
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

      <View style={{ gap: theme.spacing.sm }}>
        {data.itineraryDays.map((day) => (
          <SurfaceCard key={day.id} tone="raised">
            <View style={{ gap: theme.spacing.md }}>
              <View style={{ gap: theme.spacing.xs }}>
                <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.bodyMedium, fontSize: 10, letterSpacing: 1.5 }}>
                  DAY {day.dayNumber}
                </Text>
                <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 17 }}>{day.title}</Text>
                <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 19 }}>{day.summary}</Text>
              </View>
              <View style={{ gap: 8 }}>
                {day.stops.map((stop) => (
                  <ItineraryTimelineItem key={stop.id} stop={stop} />
                ))}
              </View>
            </View>
          </SurfaceCard>
        ))}
      </View>

      <SectionHeader eyebrow="Maps" title="Route handoff" description="Preferred maps choice should be visible at the moment route clarity matters." />

      <View style={{ gap: theme.spacing.sm }}>
        {mappedRoutes.map((stop) => (
          <RouteHandoffCard key={stop.id} route={stop.routePreview!} preferredMapsApp={data.mapsPreference} />
        ))}
      </View>

      <SectionHeader eyebrow="Portability" title="Exports and sharing" description="Trip sharing should read as part of planning, not as an afterthought." />

      <View style={{ gap: theme.spacing.sm }}>
        {data.exportPacks.map((pack) => (
          <ExportShareTile key={pack.id} pack={pack} />
        ))}
      </View>

      <SectionHeader
        eyebrow="Connected travel"
        title="Connected Travel, attached and review-ready"
        description="Partial sync and review-needed states should remain legible and calm."
      />

      <View style={{ gap: theme.spacing.sm }}>
        {connectedItems.map((item) => (
          <ConnectedTravelCard key={item.id} item={item} />
        ))}
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        {connectedAccounts.map((account) => (
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
