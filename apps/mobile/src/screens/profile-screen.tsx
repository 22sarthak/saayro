import { Text, View } from "react-native";
import { AppTabShell } from "@/components/layout/app-tab-shell";
import { ConnectedAccountCard } from "@/components/layout/connected-account-card";
import { ConnectedTravelCard } from "@/components/layout/connected-travel-card";
import { ExportShareTile } from "@/components/layout/export-share-tile";
import { LoadingBlock } from "@/components/layout/loading-block";
import { SectionHeader } from "@/components/layout/section-header";
import { SurfaceCard } from "@/components/primitives/surface-card";
import { TagChip } from "@/components/primitives/tag-chip";
import { getProfileScreenData } from "@/lib/screen-data";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

export function ProfileScreen() {
  const screen = getProfileScreenData();

  if (screen.state === "loading") {
    return <ProfileLoadingScreen />;
  }

  return <ProfilePopulatedScreen />;
}

function ProfilePopulatedScreen() {
  const theme = useMobileTheme();
  const { data } = getProfileScreenData("populated");

  return (
    <AppTabShell
      section="Profile"
      title="Traveler preferences, trust, and connection state."
      subtitle="Profile should feel compact and deliberate, with settings and trust signals easy to scan in one thumb pass."
    >
      <SurfaceCard tone="raised">
        <View style={{ gap: theme.spacing.sm }}>
          <View style={{ gap: theme.spacing.xs }}>
            <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.display, fontSize: 22, lineHeight: 26 }}>{data.userName}</Text>
            <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13 }}>Home base: {data.homeBase}</Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
            {data.preferences.interests.map((interest) => (
              <TagChip key={interest} option={{ id: interest, label: interest }} />
            ))}
          </View>
        </View>
      </SurfaceCard>

      <SectionHeader eyebrow="Preferences" title="How this traveler likes to move" description="Preference surfaces should stay explicit so later planning and Buddy suggestions remain grounded." />

      <SurfaceCard tone="connected">
        <View style={{ gap: 6 }}>
          <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 13 }}>Preferred maps: {data.preferences.preferredMapsApp}</Text>
          <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 13 }}>Travel pace: {data.preferences.travelPace}</Text>
          <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 13 }}>
            Comfort priority: {data.preferences.comfortPriority}
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 13 }}>
            Notifications: {data.preferences.notificationsEnabled ? "enabled" : "off"}
          </Text>
        </View>
      </SurfaceCard>

      <SectionHeader
        eyebrow="Connections"
        title="Connected accounts and partial states"
        description="Partial connection states should look trustworthy, not broken."
      />

      <View style={{ gap: theme.spacing.md }}>
        {data.connectedAccounts.map((account) => (
          <ConnectedAccountCard key={account.id} account={account} />
        ))}
      </View>

      {data.partialConnection ? (
        <SurfaceCard tone="danger">
          <View style={{ gap: theme.spacing.sm }}>
            <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 16 }}>Needs review</Text>
            <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 19 }}>
              Connected Travel keeps low-confidence items calm and reviewable instead of treating them like failures.
            </Text>
            <ConnectedTravelCard item={data.partialConnection} />
          </View>
        </SurfaceCard>
      ) : null}

      <SectionHeader eyebrow="Trust" title="Clarity over cleverness" description="The product should explain what it knows, what it inferred, and what still needs review." />

      <SurfaceCard tone="buddy">
        <View style={{ gap: theme.spacing.sm }}>
          {data.trustNotes.map((note) => (
            <Text key={note} style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 19 }}>
              {note}
            </Text>
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard tone="raised">
        <View style={{ gap: theme.spacing.sm }}>
          <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 16 }}>Support surfaces</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
            {data.supportActions.map((action) => (
              <TagChip key={action.id} option={action} />
            ))}
          </View>
        </View>
      </SurfaceCard>

      <SectionHeader
        eyebrow="Portability"
        title="Export Packs stay visible here too"
        description="Sharing and handoff are part of the product system, not a hidden trip-only utility."
      />

      <View style={{ gap: theme.spacing.md }}>
        {data.exportPacks.map((pack) => (
          <ExportShareTile key={pack.id} pack={pack} />
        ))}
      </View>
    </AppTabShell>
  );
}

function ProfileLoadingScreen() {
  return (
    <AppTabShell
      section="Profile"
      title="Loading traveler context."
      subtitle="Loading should preserve the profile structure so trust and settings do not feel secondary."
    >
      <LoadingBlock lines={4} />
      <LoadingBlock lines={4} tone="connected" />
      <LoadingBlock lines={3} tone="buddy" />
    </AppTabShell>
  );
}
