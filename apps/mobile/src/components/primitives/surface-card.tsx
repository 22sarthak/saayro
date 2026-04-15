import type { ReactNode } from "react";
import { View } from "react-native";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

export function SurfaceCard({
  children,
  tone = "raised"
}: {
  children: ReactNode;
  tone?: "raised" | "buddy" | "connected" | "discovery" | "danger";
}) {
  const theme = useMobileTheme();

  const backgroundColor =
    tone === "buddy"
      ? theme.colors.surfaceBuddy
      : tone === "connected"
        ? theme.colors.surfaceConnected
        : tone === "discovery"
          ? theme.colors.surfaceDiscovery
          : tone === "danger"
            ? theme.colors.surfaceDanger
            : theme.colors.surfaceRaised;

  return (
    <View
      style={{
        backgroundColor,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.borderSoft,
        ...theme.shadow.card
      }}
    >
      {children}
    </View>
  );
}
