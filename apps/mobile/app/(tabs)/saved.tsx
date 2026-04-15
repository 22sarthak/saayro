import { Text, View } from "react-native";
import { AppTabShell } from "@/components/layout/app-tab-shell";
import { TabPreviewCard } from "@/components/layout/tab-preview-card";
import { getSavedPreview } from "@/lib/mock-selectors";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

export default function SavedTab() {
  const theme = useMobileTheme();
  const items = getSavedPreview();

  return (
    <AppTabShell
      section="Saved"
      title="Discovery and keepsakes, not a dead-end wishlist."
      subtitle="Saved should feel warm and curatorial, even before the deeper feature work arrives."
    >
      <TabPreviewCard title="Saved moments" description="Meals, stays, and culture stops worth carrying forward." tone="discovery">
        <View style={{ gap: theme.spacing.md }}>
          {items.map((item) => (
            <View key={item.id} style={{ gap: 4 }}>
              <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 15 }}>{item.title}</Text>
              <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13 }}>{item.subtitle}</Text>
            </View>
          ))}
        </View>
      </TabPreviewCard>
      <TabPreviewCard title="Why this tab exists now" description="It establishes the navigation shape and discovery tone so later detail screens have a clean landing zone." />
    </AppTabShell>
  );
}

