import { router } from "expo-router";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { AuthFrame } from "@/components/layout/auth-frame";
import { ActionButton } from "@/components/primitives/action-button";
import { useAuth } from "@/lib/auth";
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
  const { requestOtp, verifyOtp } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState("+91 ");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const baseInputStyle = {
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.body,
    fontSize: 14,
  } as const;

  return (
    <AuthFrame
      eyebrow="OTP"
      title="A verification moment that stays calm under pressure."
      description="This screen now talks to the backend and creates a real OTP challenge object. Delivery remains provider-ready unless a live provider is enabled."
    >
      <View style={{ gap: theme.spacing.lg }}>
        <View style={{ gap: theme.spacing.md }}>
          <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 15 }}>Enter your mobile number</Text>
          <TextInput value={phoneNumber} onChangeText={setPhoneNumber} placeholder="+91 98765 43210" style={baseInputStyle} />
          <ActionButton
            label={pending ? "Starting..." : "Request OTP"}
            onPress={() => {
              setPending(true);
              setMessage(null);
              void requestOtp(phoneNumber)
                .then((result) => {
                  setChallengeId(result.challengeId);
                  setMessage(result.message);
                })
                .catch((error) => {
                  setMessage(error instanceof Error ? error.message : "Could not start OTP.");
                })
                .finally(() => {
                  setPending(false);
                });
            }}
            disabled={pending}
          />
        </View>
        <View style={{ gap: theme.spacing.md }}>
          <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 15 }}>Enter the 6-digit code</Text>
          <TextInput value={code} onChangeText={setCode} placeholder="123456" style={baseInputStyle} />
          <ActionButton
            label={pending ? "Checking..." : challengeId ? "Verify OTP" : "Awaiting OTP request"}
            variant="secondary"
            onPress={() => {
              if (!challengeId) {
                setMessage("Request OTP first so Saayro can create a challenge.");
                return;
              }
              setPending(true);
              setMessage(null);
              void verifyOtp(challengeId, code)
                .then((result) => {
                  setMessage(result.message);
                })
                .catch((error) => {
                  setMessage(error instanceof Error ? error.message : "Could not verify OTP.");
                })
                .finally(() => {
                  setPending(false);
                });
            }}
            disabled={pending}
          />
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
        {message ? (
          <View
            style={{
              borderRadius: theme.radius.md,
              padding: theme.spacing.lg,
              backgroundColor: theme.colors.surfaceRaised,
            }}
          >
            <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 20 }}>{message}</Text>
          </View>
        ) : null}
        <ActionButton label="Back to sign in" variant="secondary" onPress={() => router.replace("/sign-in")} />
      </View>
    </AuthFrame>
  );
}
