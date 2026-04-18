import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { AppTabShell } from "@/components/layout/app-tab-shell";
import { EmptyStateBlock } from "@/components/layout/empty-state-block";
import { LoadingBlock } from "@/components/layout/loading-block";
import { SectionHeader } from "@/components/layout/section-header";
import { ActionButton } from "@/components/primitives/action-button";
import { SurfaceCard } from "@/components/primitives/surface-card";
import { StatusBadge } from "@/components/primitives/status-badge";
import { TagChip } from "@/components/primitives/tag-chip";
import { type BuddyMessageView, useAuth } from "@/lib/auth";
import { getBuddyScreenData } from "@/lib/screen-data";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

const fallbackPopulated = getBuddyScreenData("populated");
const fallbackEmpty = getBuddyScreenData("empty");

type LiveBuddyTarget = { kind: "trip"; tripId: string; title: string; context: string; highlights: string[] } | { kind: "pretrip" };

export function BuddyScreen() {
  const {
    session,
    status,
    listTrips,
    getTrip,
    fetchBuddyMessages,
    postBuddyMessage,
    fetchPreTripBuddyMessages,
    postPreTripBuddyMessage,
  } = useAuth();
  const params = useLocalSearchParams<{ tripId?: string | string[] }>();
  const requestedTripId = useMemo(() => {
    if (Array.isArray(params.tripId)) {
      return params.tripId[0] ?? null;
    }
    return params.tripId ?? null;
  }, [params.tripId]);
  const [viewState, setViewState] = useState<"loading" | "fallback" | "live">(status === "ready" ? "fallback" : "loading");
  const [liveTarget, setLiveTarget] = useState<LiveBuddyTarget | null>(null);
  const [messages, setMessages] = useState<BuddyMessageView[]>([]);

  useEffect(() => {
    if (status !== "ready") {
      setViewState("loading");
      return;
    }

    if (!session?.authenticated) {
      setLiveTarget(null);
      setMessages([]);
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
          const nextMessages = await fetchPreTripBuddyMessages();
          if (!active) {
            return;
          }
          setLiveTarget({ kind: "pretrip" });
          setMessages(nextMessages);
          setViewState("live");
          return;
        }

        const selectedSummary = tripList.find((trip) => trip.id === requestedTripId) ?? tripList[0]!;
        const [trip, nextMessages] = await Promise.all([
          getTrip(selectedSummary.id),
          fetchBuddyMessages(selectedSummary.id),
        ]);

        if (!active) {
          return;
        }

        setLiveTarget({
          kind: "trip",
          tripId: selectedSummary.id,
          title: trip.title,
          context: `${trip.destination_city}, ${trip.destination_region} � ${trip.start_date} to ${trip.end_date}`,
          highlights: trip.highlights,
        });
        setMessages(nextMessages);
        setViewState("live");
      } catch {
        if (!active) {
          return;
        }
        setLiveTarget(null);
        setMessages([]);
        setViewState("fallback");
      }
    })();

    return () => {
      active = false;
    };
  }, [
    fetchBuddyMessages,
    fetchPreTripBuddyMessages,
    getTrip,
    listTrips,
    requestedTripId,
    session?.authenticated,
    status,
  ]);

  if (viewState === "loading") {
    return <BuddyLoadingScreen />;
  }

  if (viewState === "live" && liveTarget) {
    return (
      <BuddyLiveScreen
        liveTarget={liveTarget}
        messages={messages}
        onMessagesChange={setMessages}
        postBuddyMessage={postBuddyMessage}
        postPreTripBuddyMessage={postPreTripBuddyMessage}
      />
    );
  }

  return <BuddyFallbackScreen />;
}

function BuddyLiveScreen({
  liveTarget,
  messages,
  onMessagesChange,
  postBuddyMessage,
  postPreTripBuddyMessage,
}: {
  liveTarget: LiveBuddyTarget;
  messages: BuddyMessageView[];
  onMessagesChange: (messages: BuddyMessageView[]) => void;
  postBuddyMessage: (tripId: string, content: string) => Promise<BuddyMessageView[]>;
  postPreTripBuddyMessage: (content: string) => Promise<BuddyMessageView[]>;
}) {
  const theme = useMobileTheme();
  const [composerValue, setComposerValue] = useState("");
  const [pending, setPending] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const promptOptions = fallbackEmpty.data.promptOptions;
  const title = liveTarget.kind === "trip" ? liveTarget.title : "Pre-trip planning";
  const context =
    liveTarget.kind === "trip"
      ? liveTarget.context
      : "Buddy can help narrow a destination, shape the first draft, and carry that planning into Trip Hub when the trip is ready.";

  const submitMessage = (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || pending) {
      return;
    }

    setPending(true);
    setMessageError(null);
    void (liveTarget.kind === "trip" ? postBuddyMessage(liveTarget.tripId, trimmed) : postPreTripBuddyMessage(trimmed))
      .then((nextMessages) => {
        onMessagesChange(nextMessages);
        setComposerValue("");
      })
      .catch((error) => {
        setMessageError(error instanceof Error ? error.message : "Buddy could not respond right now.");
      })
      .finally(() => {
        setPending(false);
      });
  };

  return (
    <AppTabShell
      section="Buddy"
      title={liveTarget.kind === "trip" ? "Trip-aware guidance that stays grounded." : "Buddy can start planning before the trip exists."}
      subtitle={
        liveTarget.kind === "trip"
          ? "Buddy should read like a calm planning companion, with denser chat rhythm and clearer next actions."
          : "Pre-trip mode stays travel-first: destination, timing, and a clean path into Trip Hub when the plan is ready."
      }
    >
      <SurfaceCard tone="buddy">
        <View style={{ gap: theme.spacing.sm }}>
          <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.display, fontSize: 22, lineHeight: 26 }}>{title}</Text>
          <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 19 }}>{context}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
            {liveTarget.kind === "trip"
              ? liveTarget.highlights.map((highlight) => <TagChip key={highlight} option={{ id: highlight, label: highlight }} />)
              : promptOptions.slice(0, 3).map((option) => <TagChip key={option.id} option={option} />)}
          </View>
        </View>
      </SurfaceCard>

      <SectionHeader
        eyebrow="Conversation"
        title="Ask, review, then act"
        description="Structured action surfaces keep Buddy useful without drifting into generic chat."
      />

      <View style={{ gap: theme.spacing.sm }}>
        {messages.map((message) => (
          <View
            key={message.id}
            style={{
              alignSelf: message.role === "buddy" ? "flex-start" : "flex-end",
              maxWidth: "88%",
              borderRadius: theme.radius.md,
              backgroundColor: message.role === "buddy" ? theme.colors.surfaceBuddy : theme.colors.surfaceRaised,
              padding: theme.spacing.md,
              borderWidth: 1,
              borderColor: theme.colors.borderSoft,
              gap: 6,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.sm }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, flexWrap: "wrap", flex: 1 }}>
                <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.bodyMedium, fontSize: 11 }}>
                  {message.role === "buddy" ? "Buddy" : "You"}
                </Text>
                {process.env.NODE_ENV === "development" && message.response?.devMetadata ? (
                  <StatusBadge label={`${message.response.devMetadata.provider} / ${message.response.devMetadata.model}`} tone="buddy" />
                ) : null}
              </View>
              {message.confidence ? <StatusBadge confidence={message.confidence} /> : null}
            </View>
            <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 19 }}>{message.content}</Text>
            {message.response?.guidance ? (
              <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 19 }}>
                {message.response.guidance}
              </Text>
            ) : null}
            {(message.response?.actions.length ? message.response.actions : message.actions ?? []).length ? (
              <View style={{ gap: theme.spacing.sm }}>
                {(message.response?.actions.length ? message.response.actions : message.actions ?? []).map((action) =>
                  action.type === "open_trip_hub" && liveTarget.kind === "pretrip" ? (
                    <ActionButton
                      key={action.id}
                      label={action.label}
                      variant="secondary"
                      onPress={() => router.push("/trip-create?create=1&source=buddy")}
                    />
                  ) : (
                    <ActionButton key={action.id} label={action.label} variant="secondary" disabled />
                  ),
                )}
              </View>
            ) : null}
          </View>
        ))}
      </View>

      {messages.length === 0 ? (
        <SurfaceCard tone="raised">
          <View style={{ gap: theme.spacing.sm }}>
            <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 16 }}>Start with a trip-aware prompt</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
              {promptOptions.map((option) => (
                <TagChip key={option.id} option={option} onPress={() => submitMessage(option.label)} disabled={pending} />
              ))}
            </View>
          </View>
        </SurfaceCard>
      ) : null}

      <SurfaceCard tone="raised">
        <View style={{ gap: theme.spacing.sm }}>
          <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 16 }}>Suggested next moves</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
            {promptOptions.map((option) => (
              <TagChip key={option.id} option={option} onPress={() => submitMessage(option.label)} disabled={pending} />
            ))}
          </View>
        </View>
      </SurfaceCard>

      <SurfaceCard tone="raised">
        <View style={{ gap: 6 }}>
          <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.bodyMedium, fontSize: 10, letterSpacing: 1.4 }}>COMPOSER</Text>
          <TextInput
            value={composerValue}
            onChangeText={setComposerValue}
            placeholder={
              liveTarget.kind === "trip"
                ? "Ask about pacing, route handoff, connected review, or the best next planning move."
                : "Ask Buddy to shape the destination, pace, or first version of the trip before anything is saved yet."
            }
            editable={!pending}
            multiline
            style={{
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.surfaceMuted,
              borderWidth: 1,
              borderColor: theme.colors.borderSoft,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.md,
              color: theme.colors.textPrimary,
              fontFamily: theme.fonts.body,
              fontSize: 14,
              minHeight: 108,
              textAlignVertical: "top",
            }}
          />
          {messageError ? (
            <Text style={{ color: "#9C3D34", fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 19 }}>{messageError}</Text>
          ) : null}
          <ActionButton
            label={pending ? "Sending..." : "Ask Buddy"}
            onPress={() => submitMessage(composerValue)}
            disabled={pending || composerValue.trim().length === 0}
          />
        </View>
      </SurfaceCard>
    </AppTabShell>
  );
}

function BuddyFallbackScreen() {
  const theme = useMobileTheme();
  const { data } = fallbackPopulated;
  const tripContext = data.tripContext.replaceAll("Â·", "·").replaceAll("·", "�");

  return (
    <AppTabShell
      section="Buddy"
      title="Trip-aware guidance that stays grounded."
      subtitle="Buddy should read like a calm planning companion, with denser chat rhythm and clearer next actions."
    >
      <SurfaceCard tone="buddy">
        <View style={{ gap: theme.spacing.sm }}>
          <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.display, fontSize: 22, lineHeight: 26 }}>{data.tripTitle}</Text>
          <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 19 }}>{tripContext}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
            {data.actionChips.map((option) => (
              <TagChip key={option.id} option={option} />
            ))}
          </View>
        </View>
      </SurfaceCard>

      <SectionHeader
        eyebrow="Conversation"
        title="Ask, review, then act"
        description="Structured action surfaces keep Buddy useful without crossing into live AI behavior."
      />

      <View style={{ gap: theme.spacing.sm }}>
        {data.messages.map((message) => (
          <View
            key={message.id}
            style={{
              alignSelf: message.role === "buddy" ? "flex-start" : "flex-end",
              maxWidth: "88%",
              borderRadius: theme.radius.md,
              backgroundColor: message.role === "buddy" ? theme.colors.surfaceBuddy : theme.colors.surfaceRaised,
              padding: theme.spacing.md,
              borderWidth: 1,
              borderColor: theme.colors.borderSoft,
              gap: 6,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.sm }}>
              <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.bodyMedium, fontSize: 11 }}>
                {message.role === "buddy" ? "Buddy" : "You"}
              </Text>
              {message.confidence ? <StatusBadge confidence={message.confidence} /> : null}
            </View>
            <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 19 }}>{message.content}</Text>
            {message.actions?.length ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
                {message.actions.map((action) => (
                  <TagChip key={action.id} option={{ id: action.id, label: action.label }} />
                ))}
              </View>
            ) : null}
          </View>
        ))}
      </View>

      <EmptyStateBlock
        eyebrow="Preview mode"
        title="Live Buddy appears after sign-in"
        description="The mobile shell stays calm in preview mode. Sign in to load the real trip or pre-trip Buddy thread."
        actionLabel="Create trip"
        onAction={() => router.push("/trip-create?create=1")}
        tone="buddy"
      />
    </AppTabShell>
  );
}

function BuddyLoadingScreen() {
  return (
    <AppTabShell
      section="Buddy"
      title="Loading the active Buddy shell."
      subtitle="This loading state keeps the thread structure legible while live planning context settles into place."
    >
      <LoadingBlock lines={4} tone="buddy" />
      <LoadingBlock lines={5} />
      <LoadingBlock lines={3} />
    </AppTabShell>
  );
}
