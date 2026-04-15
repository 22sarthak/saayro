import { router } from "expo-router";
import { Text, View } from "react-native";
import { ActionButton } from "@/components/primitives/action-button";
import { TagChip } from "@/components/primitives/tag-chip";
import { AuthFrame } from "@/components/layout/auth-frame";
import { authEntryOptions } from "@/lib/mock-selectors";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

export default function SignInScreen() {
  const theme = useMobileTheme();

  return (
    <AuthFrame
      eyebrow="Sign in"
      title="Re-enter the trip with context intact."
      description="Choose your path back into the shell. The flow is mock-only, but the pacing and tone should already feel real."
    >
      <View style={{ gap: theme.spacing.lg }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
          {authEntryOptions.map((option) => (
            <TagChip key={option.id} option={option} />
          ))}
        </View>
        <View style={{ gap: theme.spacing.md }}>
          <ActionButton label="Continue with Google" onPress={() => router.replace("/(tabs)")} />
          <ActionButton label="Continue with mobile OTP" variant="secondary" onPress={() => router.push("/otp")} />
        </View>
        <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 14, lineHeight: 22 }}>
          New here? Switch to sign up to preview the calmer account-creation shell.
        </Text>
        <ActionButton label="Open sign-up shell" variant="ghost" onPress={() => router.push("/sign-up")} />
      </View>
    </AuthFrame>
  );
}

