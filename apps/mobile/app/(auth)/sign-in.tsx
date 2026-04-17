import * as Google from "expo-auth-session/providers/google";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { ActionButton } from "@/components/primitives/action-button";
import { TagChip } from "@/components/primitives/tag-chip";
import { AuthFrame } from "@/components/layout/auth-frame";
import { useAuth } from "@/lib/auth";
import { authEntryOptions } from "@/lib/mock-selectors";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

export default function SignInScreen() {
  const theme = useMobileTheme();
  const { session, status, exchangeGoogleAccessTokenWithIntent, signInWithEmailPassword } = useAuth();
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    scopes: ["openid", "profile", "email"],
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (status === "ready" && session?.authenticated) {
      router.replace(session.needsOnboarding ? "/onboarding" : "/(tabs)");
    }
  }, [session?.authenticated, session?.needsOnboarding, status]);

  useEffect(() => {
    if (response?.type !== "success") {
      return;
    }

    const accessToken = response.authentication?.accessToken;
    if (!accessToken) {
      setError("Google did not return an access token.");
      setPending(false);
      return;
    }

    void exchangeGoogleAccessTokenWithIntent(accessToken, "sign_in")
      .then((nextSession) => {
        router.replace(nextSession.needsOnboarding ? "/onboarding" : "/(tabs)");
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "Could not complete Google sign-in.");
      })
      .finally(() => {
        setPending(false);
      });
  }, [exchangeGoogleAccessTokenWithIntent, response]);

  const inputStyle = {
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
      eyebrow="Sign in"
      title="Re-enter the trip with context intact."
      description="Google now opens a real Saayro session. OTP stays ready for later activation without pretending delivery is live today."
    >
      <View style={{ gap: theme.spacing.md }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
          {authEntryOptions.map((option) => (
            <TagChip key={option.id} option={option} />
          ))}
        </View>
        <View style={{ gap: theme.spacing.sm }}>
          <ActionButton
            label={pending ? "Connecting Google..." : "Continue with Google"}
            onPress={() => {
              setPending(true);
              setError(null);
              void promptAsync();
            }}
            disabled={pending || !request}
          />
          <ActionButton label="Continue with mobile OTP" variant="secondary" onPress={() => router.push("/otp")} />
        </View>
        <View style={{ gap: theme.spacing.sm }}>
          <TextInput value={email} onChangeText={setEmail} placeholder="Email" style={inputStyle} autoCapitalize="none" />
          <TextInput value={password} onChangeText={setPassword} placeholder="Password" style={inputStyle} secureTextEntry />
          <ActionButton
            label={pending ? "Signing in..." : "Continue with Saayro account"}
            variant="secondary"
            onPress={() => {
              setPending(true);
              setError(null);
              void signInWithEmailPassword({ email, password })
                .then((nextSession) => {
                  router.replace(nextSession.needsOnboarding ? "/onboarding" : "/(tabs)");
                })
                .catch((requestError) => {
                  setError(requestError instanceof Error ? requestError.message : "Could not complete email sign-in.");
                })
                .finally(() => {
                  setPending(false);
                });
            }}
            disabled={pending}
          />
        </View>
        {error ? (
          <Text style={{ color: "#9C3D34", fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 20 }}>
            {error}
          </Text>
        ) : null}
        <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 20 }}>
          New here? Switch to sign up to open the calmer account-creation path.
        </Text>
        <ActionButton label="Open sign-up" variant="ghost" onPress={() => router.push("/sign-up")} />
      </View>
    </AuthFrame>
  );
}
