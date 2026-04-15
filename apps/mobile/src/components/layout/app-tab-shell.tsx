import type { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

export function AppTabShell({
  section,
  title,
  subtitle,
  children
}: {
  section: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const theme = useMobileTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.xl,
          paddingTop: theme.spacing.lg,
          paddingBottom: theme.spacing.hero,
          gap: theme.spacing.xl
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: theme.spacing.sm }}>
          <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.bodyMedium, fontSize: 11, letterSpacing: 2.2 }}>
            {section.toUpperCase()}
          </Text>
          <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.display, fontSize: 34, lineHeight: 40 }}>{title}</Text>
          <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 15, lineHeight: 24 }}>{subtitle}</Text>
        </View>
        <View style={{ gap: theme.spacing.lg, flex: 1 }}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}
