import { Text, View } from "react-native";
import { AppTabShell } from "@/components/layout/app-tab-shell";
import { TabPreviewCard } from "@/components/layout/tab-preview-card";
import { TagChip } from "@/components/primitives/tag-chip";
import { buddyPromptOptions, getBuddyPreview } from "@/lib/mock-selectors";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

export default function BuddyTab() {
  const theme = useMobileTheme();
  const preview = getBuddyPreview();

  return (
    <AppTabShell
      section="Buddy"
      title="Trip-aware guidance without the feature depth yet."
      subtitle="This tab proves the shell, the tone, and the placement of contextual suggestions."
    >
      <TabPreviewCard title={preview.tripTitle} description="Buddy stays anchored to the active trip rather than floating as a generic assistant." tone="buddy">
        <View style={{ gap: theme.spacing.md }}>
          {preview.messages.map((message) => (
            <View
              key={message.id}
              style={{
                alignSelf: message.role === "buddy" ? "flex-start" : "flex-end",
                maxWidth: "92%",
                borderRadius: theme.radius.md,
                backgroundColor: message.role === "buddy" ? theme.colors.surfaceBuddy : theme.colors.surfaceRaised,
                padding: theme.spacing.lg
              }}
            >
              <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.bodyMedium, fontSize: 11 }}>
                {message.role === "buddy" ? "Buddy" : "You"}
              </Text>
              <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 14, lineHeight: 22, marginTop: 6 }}>
                {message.content}
              </Text>
            </View>
          ))}
        </View>
      </TabPreviewCard>
      <TabPreviewCard title="Prompt ideas" description="A compact mobile suggestion strip works better than a crowded feature wall.">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
          {buddyPromptOptions.map((option) => (
            <TagChip key={option.id} option={option} />
          ))}
        </View>
      </TabPreviewCard>
    </AppTabShell>
  );
}

