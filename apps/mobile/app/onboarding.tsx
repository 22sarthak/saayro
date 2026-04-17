import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { AppTabShell } from "@/components/layout/app-tab-shell";
import { ActionButton } from "@/components/primitives/action-button";
import { SurfaceCard } from "@/components/primitives/surface-card";
import { useAuth } from "@/lib/auth";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

export default function OnboardingScreen() {
  const theme = useMobileTheme();
  const { session, status, getProfile, updateProfile, bootstrapSession } = useAuth();
  const [fullName, setFullName] = useState(session?.actor?.fullName ?? "");
  const [homeBase, setHomeBase] = useState(session?.actor?.homeBase ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (status !== "ready") {
      return;
    }
    if (!session?.authenticated) {
      router.replace("/sign-in");
      return;
    }

    void getProfile()
      .then((profile) => {
        setFullName(profile.fullName || "");
        setHomeBase(profile.homeBase ?? "");
      })
      .catch(() => {
        // Keep session fallback values.
      });
  }, [getProfile, session?.authenticated, session?.needsOnboarding, status]);

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
    <AppTabShell
      section="Onboarding"
      title={session?.needsOnboarding ? "Confirm the traveler behind this workspace." : "Edit traveler details."}
      subtitle="Full name is required in this step. Everything else can stay light and editable later."
    >
      <SurfaceCard tone="connected">
        <View style={{ gap: theme.spacing.md }}>
          <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 20 }}>
            Google can prefill safe details, but Saayro still asks the traveler to confirm them before the workspace moves forward.
          </Text>
          <TextInput value={fullName} onChangeText={setFullName} placeholder="Full name" style={inputStyle} />
          <TextInput value={homeBase} onChangeText={setHomeBase} placeholder="Home base (optional)" style={inputStyle} />
          <View style={{ gap: theme.spacing.sm }}>
            <ActionButton
              label={pending ? "Saving..." : "Complete setup"}
              onPress={() => {
                setPending(true);
                setMessage(null);
                void updateProfile({
                  fullName,
                  homeBase,
                  confirmFullName: true,
                  completeOnboarding: true,
                })
                  .then(async () => {
                    await bootstrapSession();
                    router.replace(session?.needsOnboarding ? "/trip-create" : "/(tabs)/profile");
                  })
                  .catch((error) => {
                    setMessage(error instanceof Error ? error.message : "Could not complete setup.");
                  })
                  .finally(() => {
                    setPending(false);
                  });
              }}
              disabled={pending}
            />
            <ActionButton
              label={session?.needsOnboarding ? "Save and continue" : "Save changes"}
              variant="secondary"
              onPress={() => {
                setPending(true);
                setMessage(null);
                void updateProfile({
                  fullName,
                  homeBase,
                  confirmFullName: true,
                  completeOnboarding: true,
                })
                  .then(async () => {
                    await bootstrapSession();
                    router.replace(session?.needsOnboarding ? "/trip-create" : "/(tabs)/profile");
                  })
                  .catch((error) => {
                    setMessage(error instanceof Error ? error.message : "Could not continue yet.");
                  })
                  .finally(() => {
                    setPending(false);
                  });
              }}
              disabled={pending}
            />
          </View>
          {message ? (
            <Text style={{ color: "#9C3D34", fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 20 }}>{message}</Text>
          ) : null}
        </View>
      </SurfaceCard>
    </AppTabShell>
  );
}
