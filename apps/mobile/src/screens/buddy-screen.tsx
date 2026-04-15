import { Text, View } from "react-native";
import { AppTabShell } from "@/components/layout/app-tab-shell";
import { EmptyStateBlock } from "@/components/layout/empty-state-block";
import { LoadingBlock } from "@/components/layout/loading-block";
import { SectionHeader } from "@/components/layout/section-header";
import { SurfaceCard } from "@/components/primitives/surface-card";
import { StatusBadge } from "@/components/primitives/status-badge";
import { TagChip } from "@/components/primitives/tag-chip";
import { getBuddyScreenData } from "@/lib/mock-selectors";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

export function BuddyScreen() {
  const screen = getBuddyScreenData();

  if (screen.state === "loading") {
    return <BuddyLoadingScreen />;
  }

  if (screen.state === "empty") {
    return <BuddyEmptyScreen />;
  }

  return <BuddyPopulatedScreen />;
}

function BuddyPopulatedScreen() {
  const theme = useMobileTheme();
  const { data } = getBuddyScreenData("populated");
  const tripContext = data.tripContext.replaceAll("Â·", "·");

  return (
    <AppTabShell
      section="Buddy"
      title="Trip-aware guidance that stays grounded in the itinerary."
      subtitle="Buddy on mobile should feel like a calm planning companion, not a floating chatbot detached from the trip."
    >
      <SurfaceCard tone="buddy">
        <View style={{ gap: theme.spacing.md }}>
          <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.display, fontSize: 24, lineHeight: 28 }}>{data.tripTitle}</Text>
          <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 14, lineHeight: 21 }}>{tripContext}</Text>
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

      <View style={{ gap: theme.spacing.md }}>
        {data.messages.map((message) => (
          <View
            key={message.id}
            style={{
              alignSelf: message.role === "buddy" ? "flex-start" : "flex-end",
              maxWidth: "94%",
              borderRadius: theme.radius.lg,
              backgroundColor: message.role === "buddy" ? theme.colors.surfaceBuddy : theme.colors.surfaceRaised,
              padding: theme.spacing.lg,
              borderWidth: 1,
              borderColor: theme.colors.borderSoft,
              gap: theme.spacing.sm
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.md }}>
              <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.bodyMedium, fontSize: 12 }}>
                {message.role === "buddy" ? "Buddy" : "You"}
              </Text>
              {message.confidence ? <StatusBadge confidence={message.confidence} /> : null}
            </View>
            <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 14, lineHeight: 22 }}>{message.content}</Text>
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

      <SurfaceCard tone="raised">
        <View style={{ gap: theme.spacing.md }}>
          <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 16 }}>Prompt ideas</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
            {data.promptOptions.map((option) => (
              <TagChip key={option.id} option={option} />
            ))}
          </View>
        </View>
      </SurfaceCard>

      <SurfaceCard tone="raised">
        <View style={{ gap: theme.spacing.sm }}>
          <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.bodyMedium, fontSize: 11, letterSpacing: 1.6 }}>COMPOSER</Text>
          <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 14, lineHeight: 22 }}>{data.composerHint}</Text>
        </View>
      </SurfaceCard>
    </AppTabShell>
  );
}

function BuddyEmptyScreen() {
  const theme = useMobileTheme();
  const { data } = getBuddyScreenData("empty");

  return (
    <AppTabShell
      section="Buddy"
      title="The trip context is ready. The conversation can start softly."
      subtitle="An empty Buddy thread should still feel inviting and useful instead of blank."
    >
      <EmptyStateBlock
        eyebrow="No messages yet"
        title="Ask about pacing, exports, or route handoff"
        description={data.composerHint}
        actionLabel="Open first prompt"
        tone="buddy"
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
          {data.promptOptions.map((option) => (
            <TagChip key={option.id} option={option} />
          ))}
        </View>
      </EmptyStateBlock>
    </AppTabShell>
  );
}

function BuddyLoadingScreen() {
  return (
    <AppTabShell
      section="Buddy"
      title="Loading the active Buddy shell."
      subtitle="This loading state keeps the thread structure legible while mock content settles into place."
    >
      <LoadingBlock lines={4} tone="buddy" />
      <LoadingBlock lines={5} />
      <LoadingBlock lines={3} />
    </AppTabShell>
  );
}
