import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { SurfaceCard } from "@/components/primitives/surface-card";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

export function TabPreviewCard({
  title,
  description,
  children,
  tone = "raised"
}: {
  title: string;
  description: string;
  children?: ReactNode;
  tone?: "raised" | "buddy" | "connected" | "discovery" | "danger";
}) {
  const theme = useMobileTheme();

  return (
    <SurfaceCard tone={tone}>
      <View style={{ gap: theme.spacing.md }}>
        <View style={{ gap: theme.spacing.sm }}>
          <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 17 }}>{title}</Text>
          <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 14, lineHeight: 22 }}>{description}</Text>
        </View>
        {children}
      </View>
    </SurfaceCard>
  );
}

