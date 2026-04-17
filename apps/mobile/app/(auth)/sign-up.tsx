import * as Google from "expo-auth-session/providers/google";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { AuthFrame } from "@/components/layout/auth-frame";
import { ActionButton } from "@/components/primitives/action-button";
import { TagChip } from "@/components/primitives/tag-chip";
import { useAuth } from "@/lib/auth";
import { authEntryOptions } from "@/lib/mock-selectors";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

export default function SignUpScreen() {
  const theme = useMobileTheme();
  const { session, status, exchangeGoogleAccessTokenWithIntent, signUpWithEmailPassword } = useAuth();
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    scopes: ["openid", "profile", "email"],
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [fullName, setFullName] = useState("");
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

    void exchangeGoogleAccessTokenWithIntent(accessToken, "sign_up")
      .then(() => {
        router.replace("/onboarding");
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "Could not complete Google sign-up.");
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
      eyebrow="Create account"
      title="Start from a shell that already feels composed."
      description="Google is the live primary path here. OTP remains present as a clean provider-ready seam for later rollout."
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
            A discovery home, a Buddy tab, a trip-list entry, and saved/profile shells behind a real Saayro session.
          </Text>
        </View>
        <ActionButton
          label={pending ? "Creating with Google..." : "Create account with Google"}
          onPress={() => {
            setPending(true);
            setError(null);
            void promptAsync();
          }}
          disabled={pending || !request}
        />
        <View style={{ gap: theme.spacing.sm }}>
          <TextInput value={fullName} onChangeText={setFullName} placeholder="Full name" style={inputStyle} />
          <TextInput value={email} onChangeText={setEmail} placeholder="Email" style={inputStyle} autoCapitalize="none" />
          <TextInput value={password} onChangeText={setPassword} placeholder="Password" style={inputStyle} secureTextEntry />
          <ActionButton
            label={pending ? "Creating..." : "Create Saayro account"}
            variant="secondary"
            onPress={() => {
              setPending(true);
              setError(null);
              void signUpWithEmailPassword({ fullName, email, password })
                .then((nextSession) => {
                  router.replace(nextSession.needsOnboarding ? "/onboarding" : "/(tabs)");
                })
                .catch((requestError) => {
                  setError(requestError instanceof Error ? requestError.message : "Could not complete email sign-up.");
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
          Mobile OTP stays available as a sign-in path in this step. It is provider-ready, not live sign-up delivery.
        </Text>
        <ActionButton label="Already have an account?" variant="ghost" onPress={() => router.replace("/sign-in")} />
      </View>
    </AuthFrame>
  );
}
