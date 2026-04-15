import type { ConnectedAccount } from "@saayro/types";
import { Text, View } from "react-native";
import { StatusBadge } from "@/components/primitives/status-badge";
import { SurfaceCard } from "@/components/primitives/surface-card";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

export function ConnectedAccountCard({ account }: { account: ConnectedAccount }) {
  const theme = useMobileTheme();

  return (
    <SurfaceCard tone={account.state === "connected" ? "connected" : account.state === "partial" ? "discovery" : "raised"}>
      <View style={{ gap: theme.spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.md }}>
          <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 15 }}>{account.label}</Text>
          <StatusBadge connectionState={account.state} />
        </View>
        <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 20 }}>
          Scopes: {account.grantedScopes.join(", ")}
        </Text>
        {account.lastSyncedAt ? (
          <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 12 }}>Last sync: {account.lastSyncedAt}</Text>
        ) : null}
      </View>
    </SurfaceCard>
  );
}
