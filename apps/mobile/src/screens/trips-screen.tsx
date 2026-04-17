import { buildTripViewModel, isPersistedTripId, type Trip } from "@saayro/types";
import { router } from "expo-router";
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
import { getTripsScreenData, type TripsScreenData } from "@/lib/screen-data";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

const fallbackTripsScreen = getTripsScreenData("partial");

export function TripsScreen() {
  const {
    session,
    status,
    listConnections,
    listTripConnectedItems,
    listTrips,
    getTrip,
    getTripItinerary,
    listTripExports,
  } = useAuth();
  const [viewState, setViewState] = useState<"loading" | "empty" | "ready">(status === "ready" ? "ready" : "loading");
  const [screenData, setScreenData] = useState<TripsScreenData>(fallbackTripsScreen.data);

  useEffect(() => {
    if (status !== "ready") {
      setViewState("loading");
      return;
    }

    if (!session?.authenticated) {
      setScreenData(fallbackTripsScreen.data);
      setViewState(fallbackTripsScreen.state === "empty" ? "empty" : "ready");
      return;
    }

    let active = true;
    void (async () => {
      setViewState("loading");
      try {
        const tripList = await listTrips();
        if (!active) {
          return;
        }

        if (tripList.length === 0) {
          setViewState("empty");
          return;
        }

        const primaryTrip = tripList[0]!;
        const [trip, itinerary, exportPacks, connectedAccounts, connectedItems] = await Promise.all([
          getTrip(primaryTrip.id),
          getTripItinerary(primaryTrip.id),
          listTripExports(primaryTrip.id),
          listConnections(),
          isPersistedTripId(primaryTrip.id) ? listTripConnectedItems(primaryTrip.id) : Promise.resolve([]),
        ]);

        if (!active) {
          return;
        }

        const liveTrip = buildTripViewModel({
          trip,
          itinerary,
          exports: exportPacks,
          connectedAccounts,
          connectedItems,
        });

        setScreenData({
          trip: liveTrip,
          itineraryDays: liveTrip.itinerary,
          exportPacks: liveTrip.exports,
          connectedAccounts: liveTrip.connectedAccounts,
          connectedItems: liveTrip.connectedItems,
          mapsPreference: liveTrip.preferences.preferredMapsApp,
        });
        setViewState("ready");
      } catch {
        if (!active) {
          return;
        }
        setScreenData(fallbackTripsScreen.data);
        setViewState("ready");
      }
    })();

    return () => {
      active = false;
    };
  }, [
    getTrip,
    getTripItinerary,
    listConnections,
    listTripConnectedItems,
    listTripExports,
    listTrips,
    session?.authenticated,
    status,
  ]);

  if (viewState === "loading") {
    return <TripsLoadingScreen />;
  }

  if (viewState === "empty" || !screenData.trip) {
    return <TripsEmptyScreen />;
  }

  return <TripsPopulatedScreen trip={screenData.trip} data={screenData} source={session?.authenticated ? "live" : "mock"} />;
}

function TripsPopulatedScreen({ trip, data, source }: { trip: Trip; data: TripsScreenData; source: "live" | "mock" }) {
  const theme = useMobileTheme();
  const mappedRoutes = data.itineraryDays.flatMap((day) => day.stops).filter((stop) => stop.routePreview);

  return (
    <AppTabShell
      section="Trips"
      title="The active trip hub, tuned for mobile."
      subtitle={
        source === "live"
          ? "Trips now follows the real backend trip spine while keeping the same tighter hierarchy and quicker stacked sections."
          : "Trips stays the strongest tab, but with tighter hierarchy, quicker scanning, and cleaner stacked sections."
      }
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
        {data.connectedItems.map((item) => (
          <ConnectedTravelCard key={item.id} item={item} />
        ))}
      </View>

      <View style={{ gap: theme.spacing.sm }}>
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
        onAction={() => router.push("/trip-create")}
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
