import { Text, View } from "react-native";
import { AppTabShell } from "@/components/layout/app-tab-shell";
import { EmptyStateBlock } from "@/components/layout/empty-state-block";
import { LoadingBlock } from "@/components/layout/loading-block";
import { RouteHandoffCard } from "@/components/layout/route-handoff-card";
import { SectionHeader } from "@/components/layout/section-header";
import { SurfaceCard } from "@/components/primitives/surface-card";
import { TagChip } from "@/components/primitives/tag-chip";
import { getSavedScreenData, getTripsScreenData } from "@/lib/mock-selectors";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

export function SavedScreen() {
  const screen = getSavedScreenData();

  if (screen.state === "loading") {
    return <SavedLoadingScreen />;
  }

  if (screen.state === "empty") {
    return <SavedEmptyScreen />;
  }

  return <SavedPopulatedScreen />;
}

function SavedPopulatedScreen() {
  const theme = useMobileTheme();
  const { data } = getSavedScreenData("populated");
  const routes = getTripsScreenData("populated").data.itineraryDays.flatMap((day) => day.stops).filter((stop) => stop.routePreview).slice(0, 1);

  return (
    <AppTabShell
      section="Saved"
      title="Saved items should feel warm and curated."
      subtitle="Saved should feel tighter and more deliberate, like a personal shortlist rather than a broad shelf."
    >
      <SurfaceCard tone="discovery">
        <View style={{ gap: theme.spacing.sm }}>
          <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 16 }}>What this trip keeps close</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
            {data.suggestionChips.map((option) => (
              <TagChip key={option.id} option={option} />
            ))}
          </View>
        </View>
      </SurfaceCard>

      {data.sections.map((section) => (
        <View key={section.id} style={{ gap: theme.spacing.sm }}>
          <SectionHeader eyebrow="Collection" title={section.title} description={section.description} />
          {section.items.map((item) => (
            <SurfaceCard key={item.id} tone={section.id === "discovery" ? "discovery" : "raised"}>
              <View style={{ gap: theme.spacing.sm }}>
                <View style={{ gap: theme.spacing.xs }}>
                  <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 16 }}>{item.title}</Text>
                  <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 19 }}>{item.subtitle}</Text>
                </View>
                <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 13 }}>
                  {item.city} · {item.category}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
                  {item.tags.map((tag) => (
                    <TagChip key={`${item.id}-${tag}`} option={{ id: `${item.id}-${tag}`, label: tag }} />
                  ))}
                </View>
              </View>
            </SurfaceCard>
          ))}
        </View>
      ))}

      {routes.map((stop) => (
        <RouteHandoffCard
          key={stop.id}
          route={stop.routePreview!}
          preferredMapsApp={getTripsScreenData("populated").data.mapsPreference}
        />
      ))}
    </AppTabShell>
  );
}

function SavedEmptyScreen() {
  const theme = useMobileTheme();
  const { data } = getSavedScreenData("empty");

  return (
    <AppTabShell
      section="Saved"
      title="Nothing saved yet, but discovery should still feel alive."
      subtitle="An empty saved screen should invite taste and curation, not just announce the absence of data."
    >
      <EmptyStateBlock
        eyebrow="No saved items"
        title="Hold onto the places that shape the trip"
        description="Later this screen can collect meals, stays, and cultural stops. For now it should still express Saayro&apos;s discovery tone."
        actionLabel="Browse ideas"
        tone="discovery"
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
          {data.suggestionChips.map((option) => (
            <TagChip key={option.id} option={option} />
          ))}
        </View>
      </EmptyStateBlock>
    </AppTabShell>
  );
}

function SavedLoadingScreen() {
  return (
    <AppTabShell
      section="Saved"
      title="Loading saved collections."
      subtitle="The loading version should keep the same curatorial rhythm as the final screen."
    >
      <LoadingBlock lines={3} tone="discovery" />
      <LoadingBlock lines={4} />
      <LoadingBlock lines={4} tone="discovery" />
    </AppTabShell>
  );
}
