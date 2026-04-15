import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { SaayroMark } from "@/components/brand/saayro-mark";
import { ScreenShell } from "@/components/layout/screen-shell";
import { SurfaceCard } from "@/components/primitives/surface-card";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

export function AuthFrame({
  eyebrow,
  title,
  description,
  children
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const theme = useMobileTheme();

  return (
    <ScreenShell eyebrow={eyebrow} title={title} description={description}>
      <SurfaceCard tone="raised">
        <View style={{ gap: theme.spacing.lg }}>
          <SaayroMark compact />
          {children}
        </View>
      </SurfaceCard>
      <View
        style={{
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.surfaceBuddy,
          padding: theme.spacing.xl,
          gap: theme.spacing.sm
        }}
      >
        <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.bodyMedium, fontSize: 11, letterSpacing: 2.2 }}>
          PREVIEW MODE
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 14, lineHeight: 22 }}>
          These flows are visual shells only. No live authentication, backend, or sync is connected in this step.
        </Text>
      </View>
    </ScreenShell>
  );
}

