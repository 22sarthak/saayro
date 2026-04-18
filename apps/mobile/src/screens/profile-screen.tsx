import type { BackendTripListItem, ConnectedAccount, ConnectedTravelItem } from "@saayro/types";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { AppTabShell } from "@/components/layout/app-tab-shell";
import { ConnectedAccountCard } from "@/components/layout/connected-account-card";
import { ConnectedTravelDetailCard } from "@/components/layout/connected-travel-detail-card";
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
  const {
    signOut,
    session,
    status,
    listConnections,
    listConnectedTravelItems,
    listTrips,
    reviewConnectedTravelItem,
  } = useAuth();
  const { data } = getProfileScreenData("populated");
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>(data.connectedAccounts);
  const [partialConnection, setPartialConnection] = useState<ConnectedTravelItem | undefined>(data.partialConnection);
  const [connectedTravelItems, setConnectedTravelItems] = useState<ConnectedTravelItem[]>([]);
  const [tripOptions, setTripOptions] = useState<BackendTripListItem[]>([]);
  const [selectedTripIds, setSelectedTripIds] = useState<Record<string, string>>({});
  const [pendingReviewKey, setPendingReviewKey] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const actor = status === "ready" && session?.authenticated ? session.actor : null;
  const profileName = actor?.fullName?.trim() || data.userName;
  const homeBase = actor?.homeBase?.trim() || data.homeBase;
  const preferences = actor?.preferences ?? data.preferences;

  useEffect(() => {
    if (status !== "ready" || !session?.authenticated) {
      setConnectedAccounts(data.connectedAccounts);
      setConnectedTravelItems([]);
      setTripOptions([]);
      setSelectedTripIds({});
      setPartialConnection(data.partialConnection);
      return;
    }

    let active = true;
    void Promise.all([listConnections(), listConnectedTravelItems(), listTrips()])
      .then(([accounts, items, trips]) => {
        if (!active) {
          return;
        }
        setConnectedAccounts(accounts);
        setConnectedTravelItems(items);
        setTripOptions(trips);
        setSelectedTripIds(
          Object.fromEntries(
            items
              .filter((item) => item.state === "candidate" && trips[0]?.id)
              .map((item) => [item.id, trips[0]!.id]),
          ),
        );
        setPartialConnection(undefined);
        setReviewError(null);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setConnectedAccounts(data.connectedAccounts);
        setConnectedTravelItems([]);
        setTripOptions([]);
        setPartialConnection(data.partialConnection);
      });

    return () => {
      active = false;
    };
  }, [listConnectedTravelItems, listConnections, listTrips, session?.authenticated, status]);

  const candidateItems = useMemo(() => connectedTravelItems.filter((item) => item.state === "candidate"), [connectedTravelItems]);
  const attachedItems = useMemo(() => connectedTravelItems.filter((item) => item.state === "attached"), [connectedTravelItems]);
  const ignoredItems = useMemo(() => connectedTravelItems.filter((item) => item.state === "ignored"), [connectedTravelItems]);

  const handleReview = async (itemId: string, action: "attach" | "ignore") => {
    setPendingReviewKey(`${itemId}:${action}`);
    setReviewError(null);
    try {
      if (action === "attach") {
        const tripId = selectedTripIds[itemId];
        if (!tripId) {
          setReviewError("Choose a trip before attaching this imported travel item.");
          return;
        }
        await reviewConnectedTravelItem(itemId, { action, tripId });
      } else {
        await reviewConnectedTravelItem(itemId, { action });
      }
      const [accounts, items] = await Promise.all([listConnections(), listConnectedTravelItems()]);
      setConnectedAccounts(accounts);
      setConnectedTravelItems(items);
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "Connected Travel review could not save this choice.");
    } finally {
      setPendingReviewKey(null);
    }
  };

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

      {status === "ready" && session?.authenticated ? (
        <>
          <SectionHeader
            eyebrow="Connected Travel review"
            title="Review imported travel before it shapes a trip"
            description="Attach the relevant items to a trip, or ignore them intentionally. Imported travel should stay reviewable before it becomes planning truth."
          />

          {candidateItems.length > 0 ? (
            <View style={{ gap: theme.spacing.md }}>
              {candidateItems.map((item) => {
                const attachDisabled = tripOptions.length === 0 || !selectedTripIds[item.id];
                return (
                  <SurfaceCard key={item.id} tone="connected">
                    <View style={{ gap: theme.spacing.sm }}>
                      <ConnectedTravelDetailCard item={item}>
                        {tripOptions.length > 0 ? (
                          <View style={{ gap: theme.spacing.sm }}>
                            <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 12 }}>
                              Attach to an existing trip
                            </Text>
                            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
                              {tripOptions.map((trip) => (
                                <TagChip
                                  key={`${item.id}:${trip.id}`}
                                  option={{
                                    id: trip.id,
                                    label: trip.title,
                                    active: selectedTripIds[item.id] === trip.id,
                                  }}
                                  onPress={() => setSelectedTripIds((current) => ({ ...current, [item.id]: trip.id }))}
                                />
                              ))}
                            </View>
                          </View>
                        ) : (
                          <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 12, lineHeight: 18 }}>
                            Create a trip in Trip Hub before attaching imported travel context.
                          </Text>
                        )}
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
                          {tripOptions.length > 0 ? (
                            <ActionButton
                              label={pendingReviewKey === `${item.id}:attach` ? "Attaching..." : "Attach to trip"}
                              variant="primary"
                              disabled={attachDisabled || pendingReviewKey === `${item.id}:attach`}
                              onPress={() => void handleReview(item.id, "attach")}
                            />
                          ) : (
                            <ActionButton
                              label="Create trip in Trip Hub"
                              variant="primary"
                              onPress={() => router.push("/trip-create?create=1")}
                            />
                          )}
                          <ActionButton
                            label={pendingReviewKey === `${item.id}:ignore` ? "Ignoring..." : "Ignore item"}
                            variant="secondary"
                            disabled={pendingReviewKey === `${item.id}:ignore`}
                            onPress={() => void handleReview(item.id, "ignore")}
                          />
                        </View>
                      </ConnectedTravelDetailCard>
                    </View>
                  </SurfaceCard>
                );
              })}
            </View>
          ) : (
            <SurfaceCard tone="connected">
              <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 19 }}>
                No review-needed imported travel items are waiting right now.
              </Text>
            </SurfaceCard>
          )}

          {attachedItems.length > 0 ? (
            <View style={{ gap: theme.spacing.md }}>
              <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.bodyMedium, fontSize: 11, letterSpacing: 1.2 }}>
                ATTACHED TO TRIPS
              </Text>
              {attachedItems.map((item) => (
                <ConnectedTravelDetailCard key={item.id} item={item} />
              ))}
            </View>
          ) : null}

          {ignoredItems.length > 0 ? (
            <View style={{ gap: theme.spacing.md }}>
              <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.bodyMedium, fontSize: 11, letterSpacing: 1.2 }}>
                REVIEWED AND IGNORED
              </Text>
              {ignoredItems.map((item) => (
                <ConnectedTravelDetailCard key={item.id} item={item} />
              ))}
            </View>
          ) : null}

          {reviewError ? (
            <Text style={{ color: theme.colors.statusDanger, fontFamily: theme.fonts.body, fontSize: 12 }}>{reviewError}</Text>
          ) : null}
        </>
      ) : partialConnection ? (
        <SurfaceCard tone="danger">
          <View style={{ gap: theme.spacing.sm }}>
            <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 16 }}>Needs review</Text>
            <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 19 }}>
              Connected Travel keeps low-confidence items calm and reviewable instead of treating them like failures.
            </Text>
            <ConnectedTravelDetailCard item={partialConnection} />
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
