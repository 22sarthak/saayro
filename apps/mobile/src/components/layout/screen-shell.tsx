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
          paddingHorizontal: theme.spacing.xl,
          paddingTop: theme.spacing.xl,
          paddingBottom: theme.spacing.hero,
          gap: theme.spacing.xl
        }}
      >
        <View style={{ gap: theme.spacing.md }}>
          {eyebrow ? (
            <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.bodyMedium, fontSize: 11, letterSpacing: 2.2 }}>
              {eyebrow.toUpperCase()}
            </Text>
          ) : null}
          <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.display, fontSize: 36, lineHeight: 42 }}>{title}</Text>
          <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 15, lineHeight: 24 }}>{description}</Text>
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

