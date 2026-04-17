import type { ConnectedAccount, ConnectedTravelItem } from "@saayro/types";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { AppTabShell } from "@/components/layout/app-tab-shell";
import { ConnectedAccountCard } from "@/components/layout/connected-account-card";
import { ConnectedTravelCard } from "@/components/layout/connected-travel-card";
import { ExportShareTile } from "@/components/layout/export-share-tile";
import { LoadingBlock } from "@/components/layout/loading-block";
import { SectionHeader } from "@/components/layout/section-header";
import { ActionButton } from "@/components/primitives/action-button";
import { SurfaceCard } from "@/components/primitives/surface-card";
import { TagChip } from "@/components/primitives/tag-chip";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth";
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
  const { signOut, session, status, listConnections } = useAuth();
  const { data } = getProfileScreenData("populated");
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>(data.connectedAccounts);
  const [partialConnection, setPartialConnection] = useState<ConnectedTravelItem | undefined>(data.partialConnection);
  const actor = status === "ready" && session?.authenticated ? session.actor : null;
  const profileName = actor?.fullName?.trim() || data.userName;
  const homeBase = actor?.homeBase?.trim() || data.homeBase;
  const preferences = actor?.preferences ?? data.preferences;

  useEffect(() => {
    if (status !== "ready" || !session?.authenticated) {
      setConnectedAccounts(data.connectedAccounts);
      setPartialConnection(data.partialConnection);
      return;
    }

    let active = true;
    void listConnections()
      .then((accounts) => {
        if (!active) {
          return;
        }
        setConnectedAccounts(accounts);
        if (accounts.some((account) => (account.reviewNeededItemCount ?? 0) > 0)) {
          setPartialConnection(
            data.partialConnection
              ? {
                  ...data.partialConnection,
                  title: "Connected Travel review queue",
                  metadata: {
                    ...data.partialConnection.metadata,
                    reason: "Imported travel context needs a quick review before it attaches more confidently.",
                  },
                }
              : data.partialConnection,
          );
        } else {
          setPartialConnection(undefined);
        }
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setConnectedAccounts(data.connectedAccounts);
        setPartialConnection(data.partialConnection);
      });

    return () => {
      active = false;
    };
  }, [listConnections, session?.authenticated, status]);

  return (
    <AppTabShell
      section="Profile"
      title="Traveler preferences, trust, and connection state."
      subtitle="Profile should feel compact and deliberate, with settings and trust signals easy to scan in one thumb pass."
    >
      <SurfaceCard tone="raised">
        <View style={{ gap: theme.spacing.sm }}>
          <View style={{ gap: theme.spacing.xs }}>
            <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.display, fontSize: 22, lineHeight: 26 }}>{profileName}</Text>
            <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13 }}>Home base: {homeBase}</Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
            {preferences.interests.map((interest) => (
              <TagChip key={interest} option={{ id: interest, label: interest }} />
            ))}
          </View>
          <ActionButton label="Edit traveler details" variant="ghost" onPress={() => router.push("/onboarding")} />
          <ActionButton label="Sign out" variant="secondary" onPress={() => void signOut()} />
        </View>
      </SurfaceCard>

      <SectionHeader eyebrow="Preferences" title="How this traveler likes to move" description="Preference surfaces should stay explicit so later planning and Buddy suggestions remain grounded." />

      <SurfaceCard tone="connected">
        <View style={{ gap: 6 }}>
          <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 13 }}>Preferred maps: {preferences.preferredMapsApp}</Text>
          <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 13 }}>Travel pace: {preferences.travelPace}</Text>
          <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 13 }}>
            Comfort priority: {preferences.comfortPriority}
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 13 }}>
            Notifications: {preferences.notificationsEnabled ? "enabled" : "off"}
          </Text>
        </View>
      </SurfaceCard>

      <SectionHeader
        eyebrow="Connections"
        title="Connected accounts and partial states"
        description="Partial connection states should look trustworthy, not broken."
      />

      <View style={{ gap: theme.spacing.md }}>
        {connectedAccounts.map((account) => (
          <ConnectedAccountCard key={account.id} account={account} />
        ))}
      </View>

      {partialConnection ? (
        <SurfaceCard tone="danger">
          <View style={{ gap: theme.spacing.sm }}>
            <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 16 }}>Needs review</Text>
            <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 19 }}>
              Connected Travel keeps low-confidence items calm and reviewable instead of treating them like failures.
            </Text>
            <ConnectedTravelCard item={partialConnection} />
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
