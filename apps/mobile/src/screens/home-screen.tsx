import { Text, View } from "react-native";
import { router } from "expo-router";
import { AppTabShell } from "@/components/layout/app-tab-shell";
import { ConnectedTravelCard } from "@/components/layout/connected-travel-card";
import { EmptyStateBlock } from "@/components/layout/empty-state-block";
import { ExportShareTile } from "@/components/layout/export-share-tile";
import { LoadingBlock } from "@/components/layout/loading-block";
import { SectionHeader } from "@/components/layout/section-header";
import { SurfaceCard } from "@/components/primitives/surface-card";
import { TagChip } from "@/components/primitives/tag-chip";
import { getHomeScreenData } from "@/lib/screen-data";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

export function HomeScreen() {
  const screen = getHomeScreenData();

  if (screen.state === "loading") {
    return <HomeLoadingScreen />;
  }

  if (screen.state === "empty") {
    return <HomeEmptyScreen />;
  }

  return <HomePopulatedScreen />;
}

function HomePopulatedScreen() {
  const theme = useMobileTheme();
  const { data } = getHomeScreenData("populated");
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
              {featuredTrip.destinationCity}, {featuredTrip.destinationRegion} · {featuredTrip.startDate} to {featuredTrip.endDate}
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
                  gap: theme.spacing.xs
                }}
              >
                <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 15 }}>{trip.title}</Text>
                <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13 }}>{trip.destinationLabel}</Text>
                <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 11 }}>
                  {trip.status} · {trip.connectedItemCount} connected item{trip.connectedItemCount === 1 ? "" : "s"}
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
          <ConnectedTravelCard
            item={{
              id: "home-connected-pulse",
              provider: "gmail",
              title: "Travel scan confidence",
              itemType: "reservation",
              state: data.connectedSummary.candidateCount > 0 ? "candidate" : "attached",
              confidence: data.connectedSummary.confidenceLabel,
              startAt: featuredTrip.startDate,
              metadata: {
                attached: String(data.connectedSummary.attachedCount),
                candidate: String(data.connectedSummary.candidateCount)
              }
            }}
          />
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
  const { data } = getHomeScreenData("empty");

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
        onAction={() => router.push("/trip-create")}
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
