import { router } from "expo-router";
import { Text, View } from "react-native";
import { AuthFrame } from "@/components/layout/auth-frame";
import { ActionButton } from "@/components/primitives/action-button";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

const otpStates = [
  {
    label: "Normal",
    body: "A clean verification step with one obvious next action.",
    tone: "raised"
  },
  {
    label: "Resend pending",
    body: "Time should feel visible and steady rather than vague.",
    tone: "connected"
  },
  {
    label: "Invalid code",
    body: "Recovery language stays calm and practical.",
    tone: "danger"
  }
] as const;

export default function OtpScreen() {
  const theme = useMobileTheme();

  return (
    <AuthFrame
      eyebrow="OTP"
      title="A verification moment that stays calm under pressure."
      description="No live OTP is sent here. This screen exists to prove pacing, hierarchy, and fallback behavior in the shell."
    >
      <View style={{ gap: theme.spacing.lg }}>
        <View style={{ gap: theme.spacing.md }}>
          <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 15 }}>Enter the 6-digit code</Text>
          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            {Array.from({ length: 6 }).map((_, index) => (
              <View
                key={index}
                style={{
                  flex: 1,
                  height: 52,
                  borderRadius: theme.radius.md,
                  backgroundColor: theme.colors.surfaceMuted,
                  borderWidth: 1,
                  borderColor: theme.colors.borderSoft
                }}
              />
            ))}
          </View>
        </View>
        <View style={{ gap: theme.spacing.md }}>
          {otpStates.map((state) => (
            <View
              key={state.label}
              style={{
                borderRadius: theme.radius.md,
                padding: theme.spacing.lg,
                backgroundColor:
                  state.tone === "connected"
                    ? theme.colors.surfaceConnected
                    : state.tone === "danger"
                      ? theme.colors.surfaceDanger
                      : theme.colors.surfaceRaised
              }}
            >
              <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 14 }}>{state.label}</Text>
              <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 20, marginTop: 6 }}>
                {state.body}
              </Text>
            </View>
          ))}
        </View>
        <ActionButton label="Enter dashboard preview" onPress={() => router.replace("/(tabs)")} />
        <ActionButton label="Back to sign in" variant="secondary" onPress={() => router.replace("/sign-in")} />
      </View>
    </AuthFrame>
  );
}

