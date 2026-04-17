import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { ActionButton } from "@/components/primitives/action-button";
import { SurfaceCard } from "@/components/primitives/surface-card";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

export function EmptyStateBlock({
  eyebrow,
  title,
  description,
  actionLabel,
  onAction,
  actionDisabledReason,
  tone = "raised",
  children
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabledReason?: string;
  tone?: "raised" | "buddy" | "connected" | "discovery" | "danger";
  children?: ReactNode;
}) {
  const theme = useMobileTheme();

  return (
    <SurfaceCard tone={tone}>
      <View style={{ gap: theme.spacing.sm }}>
        {eyebrow ? (
          <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.bodyMedium, fontSize: 10, letterSpacing: 1.5 }}>
            {eyebrow.toUpperCase()}
          </Text>
        ) : null}
        <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 17, lineHeight: 23 }}>{title}</Text>
        <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 20 }}>{description}</Text>
        {children}
        {actionLabel && onAction ? <ActionButton label={actionLabel} variant="secondary" onPress={onAction} /> : null}
        {actionLabel && !onAction && actionDisabledReason ? (
          <View style={{ gap: theme.spacing.xs }}>
            <ActionButton label={actionLabel} variant="secondary" disabled />
            <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 12, lineHeight: 18 }}>
              {actionDisabledReason}
            </Text>
          </View>
        ) : null}
      </View>
    </SurfaceCard>
  );
}
