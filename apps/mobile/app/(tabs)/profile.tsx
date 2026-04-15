import { Text, View } from "react-native";
import { AppTabShell } from "@/components/layout/app-tab-shell";
import { TabPreviewCard } from "@/components/layout/tab-preview-card";
import { getProfilePreview } from "@/lib/mock-selectors";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

export default function ProfileTab() {
  const theme = useMobileTheme();
  const profile = getProfilePreview();

  return (
    <AppTabShell
      section="Profile"
      title="Preferences and connected-state intent."
      subtitle="Profile shows where maps choice, travel taste, and connection trust signals will live on mobile."
    >
      <TabPreviewCard title={profile.userName} description={`Home base: ${profile.homeBase}`}>
        <View style={{ gap: theme.spacing.md }}>
          <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 14 }}>
            Preferred maps: {profile.preferences.preferredMapsApp}
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 14 }}>
            Travel pace: {profile.preferences.travelPace}
          </Text>
        </View>
      </TabPreviewCard>
      <TabPreviewCard title="Connected accounts" description="Partial and connected states should stay legible and calm." tone="connected">
        <View style={{ gap: theme.spacing.md }}>
          {profile.connectedAccounts.map((account) => (
            <View key={account.id} style={{ gap: 4 }}>
              <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 14 }}>{account.label}</Text>
              <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13 }}>{account.state}</Text>
            </View>
          ))}
        </View>
      </TabPreviewCard>
    </AppTabShell>
  );
}
