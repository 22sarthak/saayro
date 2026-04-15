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
          paddingHorizontal: theme.layout.pageGutter,
          paddingTop: theme.spacing.md,
          paddingBottom: theme.spacing.xxl + 72,
          gap: theme.spacing.lg,
          width: "100%",
          maxWidth: theme.layout.contentMaxWidth,
          alignSelf: "center"
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: theme.spacing.xs }}>
          <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.bodyMedium, fontSize: 10, letterSpacing: 1.8 }}>
            {section.toUpperCase()}
          </Text>
          <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.display, fontSize: 30, lineHeight: 34 }}>{title}</Text>
          <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 14, lineHeight: 22 }}>{subtitle}</Text>
        </View>
        <View style={{ gap: theme.spacing.md, flex: 1 }}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}
