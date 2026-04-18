import { buildDestinationLabel, isPersistedTripId } from "@saayro/types";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { AppTabShell } from "@/components/layout/app-tab-shell";
import { EmptyStateBlock } from "@/components/layout/empty-state-block";
import { ExportShareTile } from "@/components/layout/export-share-tile";
import { LoadingBlock } from "@/components/layout/loading-block";
import { SectionHeader } from "@/components/layout/section-header";
import { ActionButton } from "@/components/primitives/action-button";
import { SurfaceCard } from "@/components/primitives/surface-card";
import { TagChip } from "@/components/primitives/tag-chip";
import { useAuth } from "@/lib/auth";
import { getHomeScreenData } from "@/lib/screen-data";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

const fallbackPopulated = getHomeScreenData("populated");
const fallbackEmpty = getHomeScreenData("empty");

type LiveHomeState =
  | {
      kind: "no_trip";
    }
  | {
      kind: "has_trip";
      featuredTrip: Awaited<ReturnType<ReturnType<typeof useAuth>["getTrip"]>>;
      recentTrips: Awaited<ReturnType<ReturnType<typeof useAuth>["listTrips"]>>;
      connectedAccountsCount: number;
      attachedTripItemsCount: number;
    };

export function HomeScreen() {
  const { session, status, listTrips, getTrip, listConnections, listTripConnectedItems } = useAuth();
  const [viewState, setViewState] = useState<"loading" | "fallback" | "live">(
    status === "ready" ? "fallback" : "loading",
  );
  const [liveState, setLiveState] = useState<LiveHomeState | null>(null);

  useEffect(() => {
    if (status !== "ready") {
      setViewState("loading");
      return;
    }

    if (!session?.authenticated) {
      setLiveState(null);
      setViewState("fallback");
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
          setLiveState({ kind: "no_trip" });
          setViewState("live");
          return;
        }

        const primaryTrip = tripList[0]!;
        const [featuredTrip, connections, connectedItems] = await Promise.all([
          getTrip(primaryTrip.id),
          listConnections(),
          isPersistedTripId(primaryTrip.id) ? listTripConnectedItems(primaryTrip.id) : Promise.resolve([]),
        ]);

        if (!active) {
          return;
        }

        setLiveState({
          kind: "has_trip",
          featuredTrip,
          recentTrips: tripList,
          connectedAccountsCount: connections.length,
          attachedTripItemsCount: connectedItems.filter((item) => item.state === "attached").length,
        });
        setViewState("live");
      } catch {
        if (!active) {
          return;
        }
        setLiveState(null);
        setViewState("fallback");
      }
    })();

    return () => {
      active = false;
    };
  }, [getTrip, listConnections, listTripConnectedItems, listTrips, session?.authenticated, status]);

  if (viewState === "loading") {
    return <HomeLoadingScreen />;
  }

  if (viewState === "live" && liveState?.kind === "no_trip") {
    return <HomeNoTripScreen />;
  }

  if (viewState === "live" && liveState?.kind === "has_trip") {
    return <HomeLiveScreen liveState={liveState} />;
  }

  const screen = getHomeScreenData();
  if (screen.state === "empty") {
    return <HomeEmptyScreen />;
  }

  return <HomeFallbackScreen />;
}

function HomeLiveScreen({
  liveState,
}: {
  liveState: Extract<LiveHomeState, { kind: "has_trip" }>;
}) {
  const theme = useMobileTheme();
  const { data } = fallbackPopulated;
  const featuredTrip = liveState.featuredTrip;
  const recentTrips = liveState.recentTrips.slice(0, 4);

  return (
    <AppTabShell
      section="Discovery home"
      title="Trips that already feel composed."
      subtitle="Home now reads from the real planning spine first: active trip, next actions, and a calm planning pulse."
    >
      <SurfaceCard tone="connected">
        <View style={{ gap: theme.spacing.md }}>
          <View style={{ gap: theme.spacing.xs }}>
            <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.bodyMedium, fontSize: 10, letterSpacing: 1.5 }}>
              ACTIVE TRIP
            </Text>
            <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.display, fontSize: 24, lineHeight: 28 }}>{featuredTrip.title}</Text>
            <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 19 }}>
              {featuredTrip.destination_city}, {featuredTrip.destination_region} � {featuredTrip.start_date} to {featuredTrip.end_date}
            </Text>
          </View>
          <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 20 }}>
            {featuredTrip.overview}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
            {featuredTrip.highlights.map((highlight) => (
              <TagChip key={highlight} option={{ id: highlight, label: highlight }} />
            ))}
          </View>
          <View style={{ gap: theme.spacing.sm }}>
            <ActionButton
              label="Open active trip"
              onPress={() => router.push(`/(tabs)/trips?tripId=${encodeURIComponent(featuredTrip.id)}`)}
            />
            <ActionButton
              label="Ask Buddy"
              variant="secondary"
              onPress={() => router.push(`/(tabs)/buddy?tripId=${encodeURIComponent(featuredTrip.id)}`)}
            />
            <ActionButton
              label="Edit in Trip Hub"
              variant="secondary"
              onPress={() => router.push(`/trip-create?tripId=${encodeURIComponent(featuredTrip.id)}`)}
            />
          </View>
        </View>
      </SurfaceCard>

      <SectionHeader
        eyebrow="Quick scan"
        title="Start from what is already moving"
        description="A premium dashboard should surface useful movement first: the current trip, real recent plans, and a concise planning pulse."
      />

      <SurfaceCard tone="raised">
        <View style={{ gap: theme.spacing.md }}>
          <View style={{ gap: theme.spacing.xs }}>
            <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 16 }}>Recent trips</Text>
            <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 12, lineHeight: 18 }}>
              Drafts and planned travel stay visible instead of getting buried behind one active itinerary.
            </Text>
          </View>
          <View style={{ gap: theme.spacing.sm }}>
            {recentTrips.map((trip) => (
              <View
                key={trip.id}
                style={{
                  borderRadius: theme.radius.md,
                  padding: theme.spacing.md,
                  backgroundColor: theme.colors.canvas,
                  borderWidth: 1,
                  borderColor: theme.colors.borderSoft,
                  gap: theme.spacing.xs,
                }}
              >
                <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 15 }}>{trip.title}</Text>
                <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13 }}>
                  {buildDestinationLabel(trip.destination_city, trip.destination_region, trip.destination_country)}
                </Text>
                <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 11 }}>
                  {trip.status} � {trip.start_date} to {trip.end_date}
                </Text>
                <ActionButton
                  label="Open trip"
                  variant="secondary"
                  onPress={() => router.push(`/(tabs)/trips?tripId=${encodeURIComponent(trip.id)}`)}
                />
              </View>
            ))}
          </View>
        </View>
      </SurfaceCard>

      <SurfaceCard tone="buddy">
        <View style={{ gap: theme.spacing.md }}>
          <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 16 }}>Planning pulse</Text>
          <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 19 }}>
            {liveState.connectedAccountsCount} connected account{liveState.connectedAccountsCount === 1 ? "" : "s"} and {" "}
            {liveState.attachedTripItemsCount} attached travel item{liveState.attachedTripItemsCount === 1 ? "" : "s"} on the active trip.
          </Text>
          <ActionButton
            label="Open Buddy"
            variant="secondary"
            onPress={() => router.push(`/(tabs)/buddy?tripId=${encodeURIComponent(featuredTrip.id)}`)}
          />
        </View>
      </SurfaceCard>

      <SectionHeader
        eyebrow="Portability"
        title="Exports and handoff"
        description="These remain shell-level for now, but stay visible as secondary planning context rather than pretending to be fully live."
      />

      <View style={{ gap: theme.spacing.md }}>
        {data.exportHighlights.map((pack) => (
          <ExportShareTile key={pack.id} pack={pack} />
        ))}
      </View>

      <SurfaceCard tone="discovery">
        <View style={{ gap: theme.spacing.md }}>
          <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 16 }}>Today&apos;s curation</Text>
          <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 19 }}>
            Discovery prompts stay shell-level in this step, while the top of Home follows the real planning workspace.
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
            {data.discoveryPrompts.map((option) => (
              <TagChip key={option.id} option={option} />
            ))}
          </View>
        </View>
      </SurfaceCard>
    </AppTabShell>
  );
}

function HomeNoTripScreen() {
  const theme = useMobileTheme();

  return (
    <AppTabShell
      section="Discovery home"
      title="A calm planning start before the first trip exists."
      subtitle="Home now points straight into Trip Hub and Buddy instead of reading like a disconnected shell preview."
    >
      <EmptyStateBlock
        eyebrow="No trip yet"
        title="Start the planning workspace"
        description="Saayro becomes useful through one real trip shell or a pre-trip Buddy conversation. You do not need to land in a blank dashboard first."
        actionLabel="Create first trip"
        onAction={() => router.push("/trip-create?create=1")}
        tone="connected"
      >
        <View style={{ gap: theme.spacing.sm }}>
          <ActionButton label="Plan with Buddy first" variant="secondary" onPress={() => router.push("/(tabs)/buddy")} />
          <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 19 }}>
            Trip Hub is the bridge into planning. Buddy can also help shape the first destination and trip direction before anything is saved.
          </Text>
        </View>
      </EmptyStateBlock>
    </AppTabShell>
  );
}

function HomeFallbackScreen() {
  const theme = useMobileTheme();
  const { data } = fallbackPopulated;
  const featuredTrip = data.featuredTrip!;

  return (
    <AppTabShell
      section="Discovery home"
      title="Trips that already feel composed."
      subtitle="The home shell should stay one-thumb scannable: active trip first, then movement, then portability."
    >
      <SurfaceCard tone="connected">
        <View style={{ gap: theme.spacing.md }}>
          <View style={{ gap: theme.spacing.xs }}>
            <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.bodyMedium, fontSize: 10, letterSpacing: 1.5 }}>
              ACTIVE TRIP
            </Text>
            <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.display, fontSize: 24, lineHeight: 28 }}>{featuredTrip.title}</Text>
            <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 19 }}>
              {featuredTrip.destinationCity}, {featuredTrip.destinationRegion} � {featuredTrip.startDate} to {featuredTrip.endDate}
            </Text>
          </View>
          <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 20 }}>{featuredTrip.overview}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
            {data.quickActions.map((option) => (
              <TagChip key={option.id} option={option} />
            ))}
          </View>
        </View>
      </SurfaceCard>

      <SectionHeader
        eyebrow="Quick scan"
        title="Start from what is already moving"
        description="A premium dashboard should surface useful movement first: trip momentum, recent plans, and connected travel confidence."
      />

      <SurfaceCard tone="raised">
        <View style={{ gap: theme.spacing.md }}>
          <View style={{ gap: theme.spacing.xs }}>
            <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 16 }}>Recent trips</Text>
            <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 12, lineHeight: 18 }}>
              Drafts and planned travel stay visible instead of getting buried behind one active itinerary.
            </Text>
          </View>
          <View style={{ gap: theme.spacing.sm }}>
            {data.recentTrips.map((trip) => (
              <View
                key={trip.id}
                style={{
                  borderRadius: theme.radius.md,
                  padding: theme.spacing.md,
                  backgroundColor: theme.colors.canvas,
                  borderWidth: 1,
                  borderColor: theme.colors.borderSoft,
                  gap: theme.spacing.xs,
                }}
              >
                <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 15 }}>{trip.title}</Text>
                <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13 }}>{trip.destinationLabel}</Text>
                <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 11 }}>
                  {trip.status} � {trip.connectedItemCount} connected item{trip.connectedItemCount === 1 ? "" : "s"}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </SurfaceCard>

      <SurfaceCard tone="buddy">
        <View style={{ gap: theme.spacing.md }}>
          <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 16 }}>Connected Travel pulse</Text>
          <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 19 }}>
            {data.connectedSummary.attachedCount} item{data.connectedSummary.attachedCount === 1 ? "" : "s"} attached,{" "}
            {data.connectedSummary.candidateCount} awaiting review.
          </Text>
        </View>
      </SurfaceCard>

      <SectionHeader eyebrow="Portability" title="Exports and handoff" description="Share and route surfaces should feel one tap away, even in shell mode." />

      <View style={{ gap: theme.spacing.md }}>
        {data.exportHighlights.map((pack) => (
          <ExportShareTile key={pack.id} pack={pack} />
        ))}
      </View>

      <SurfaceCard tone="discovery">
        <View style={{ gap: theme.spacing.md }}>
          <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 16 }}>Today&apos;s curation</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
            {data.discoveryPrompts.map((option) => (
              <TagChip key={option.id} option={option} />
            ))}
          </View>
        </View>
      </SurfaceCard>
    </AppTabShell>
  );
}

function HomeEmptyScreen() {
  const theme = useMobileTheme();
  const { data } = fallbackEmpty;

  return (
    <AppTabShell
      section="Discovery home"
      title="A calm starting point before the first trip exists."
      subtitle="The mobile shell should still feel premium and useful even before a user has created a trip."
    >
      <EmptyStateBlock
        eyebrow="No trip yet"
        title="Start with one premium trip shell"
        description="Create a destination, save a few travel tastes, and let the app become useful before any backend or AI layer shows up."
        actionLabel="Create first trip"
        onAction={() => router.push("/trip-create?create=1")}
        tone="connected"
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
          {data.discoveryPrompts.map((option) => (
            <TagChip key={option.id} option={option} />
          ))}
        </View>
      </EmptyStateBlock>
    </AppTabShell>
  );
}

function HomeLoadingScreen() {
  return (
    <AppTabShell
      section="Discovery home"
      title="Loading the mobile discovery shell."
      subtitle="Loading states should mirror the editorial structure instead of collapsing into generic spinners."
    >
      <LoadingBlock lines={4} tone="connected" />
      <LoadingBlock lines={5} />
      <LoadingBlock lines={4} tone="buddy" />
      <LoadingBlock lines={3} tone="discovery" />
    </AppTabShell>
  );
}
