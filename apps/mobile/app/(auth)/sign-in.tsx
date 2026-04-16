import * as Google from "expo-auth-session/providers/google";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { ActionButton } from "@/components/primitives/action-button";
import { TagChip } from "@/components/primitives/tag-chip";
import { AuthFrame } from "@/components/layout/auth-frame";
import { useAuth } from "@/lib/auth";
import { authEntryOptions } from "@/lib/mock-selectors";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

export default function SignInScreen() {
  const theme = useMobileTheme();
  const { session, status, exchangeGoogleAccessToken } = useAuth();
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    scopes: ["openid", "profile", "email"],
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (status === "ready" && session?.authenticated) {
      router.replace("/(tabs)");
    }
  }, [session?.authenticated, status]);

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

    void exchangeGoogleAccessToken(accessToken)
      .then(() => {
        router.replace("/(tabs)");
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "Could not complete Google sign-in.");
      })
      .finally(() => {
        setPending(false);
      });
  }, [exchangeGoogleAccessToken, response]);

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
