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
  children,
  footerCopy = "Google sign-in is live in this step. OTP is provider-ready and can be activated later without rebuilding the flow."
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footerCopy?: string;
}) {
  const theme = useMobileTheme();

  return (
    <ScreenShell eyebrow={eyebrow} title={title} description={description}>
      <SurfaceCard tone="raised">
        <View style={{ gap: theme.spacing.md }}>
          <SaayroMark compact />
          {children}
        </View>
      </SurfaceCard>
      <View
        style={{
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.surfaceBuddy,
          padding: theme.spacing.lg,
          gap: theme.spacing.xs
        }}
      >
        <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.bodyMedium, fontSize: 10, letterSpacing: 1.7 }}>
          AUTH STATUS
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 20 }}>
          {footerCopy}
        </Text>
      </View>
    </ScreenShell>
  );
}
