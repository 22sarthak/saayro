import type { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

export function ScreenShell({
  eyebrow,
  title,
  description,
  children
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const theme = useMobileTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.layout.pageGutter,
          paddingTop: theme.spacing.lg,
          paddingBottom: theme.spacing.hero,
          gap: theme.spacing.lg,
          width: "100%",
          maxWidth: theme.layout.contentMaxWidth,
          alignSelf: "center"
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: theme.spacing.sm }}>
          {eyebrow ? (
            <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.bodyMedium, fontSize: 10, letterSpacing: 1.8 }}>
              {eyebrow.toUpperCase()}
            </Text>
          ) : null}
          <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.display, fontSize: 31, lineHeight: 36 }}>{title}</Text>
          <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 14, lineHeight: 22 }}>{description}</Text>
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
