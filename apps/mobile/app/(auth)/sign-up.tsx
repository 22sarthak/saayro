import { router } from "expo-router";
import { Text, View } from "react-native";
import { AuthFrame } from "@/components/layout/auth-frame";
import { ActionButton } from "@/components/primitives/action-button";
import { TagChip } from "@/components/primitives/tag-chip";
import { authEntryOptions } from "@/lib/mock-selectors";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

export default function SignUpScreen() {
  const theme = useMobileTheme();

  return (
    <AuthFrame
      eyebrow="Create account"
      title="Start from a shell that already feels composed."
      description="The sign-up screen should sell Saayro immediately: practical planning, trip-aware guidance, and premium clarity instead of noisy onboarding."
    >
      <View style={{ gap: theme.spacing.lg }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
          {authEntryOptions.map((option) => (
            <TagChip key={option.id} option={option} />
          ))}
        </View>
        <View
          style={{
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.surfaceDiscovery,
            padding: theme.spacing.lg,
            gap: theme.spacing.sm
          }}
        >
          <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 15 }}>What opens next</Text>
          <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 14, lineHeight: 22 }}>
            A discovery home, a Buddy tab, a trip-list entry, and saved/profile shells built entirely from typed mock data.
          </Text>
        </View>
        <ActionButton label="Preview the signed-in tabs" onPress={() => router.replace("/(tabs)")} />
        <ActionButton label="Already have a shell?" variant="secondary" onPress={() => router.replace("/sign-in")} />
      </View>
    </AuthFrame>
  );
}

