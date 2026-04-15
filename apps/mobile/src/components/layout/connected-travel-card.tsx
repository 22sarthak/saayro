import type { ConnectedTravelItem } from "@saayro/types";
import { Text, View } from "react-native";
import { StatusBadge } from "@/components/primitives/status-badge";
import { SurfaceCard } from "@/components/primitives/surface-card";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

export function ConnectedTravelCard({ item }: { item: ConnectedTravelItem }) {
  const theme = useMobileTheme();
  const tone = item.confidence === "needs-review" ? "danger" : item.state === "attached" ? "connected" : "raised";

  return (
    <SurfaceCard tone={tone}>
      <View style={{ gap: theme.spacing.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.md }}>
          <View style={{ flex: 1, gap: theme.spacing.xs }}>
            <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 15 }}>{item.title}</Text>
            <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 12 }}>{item.provider.toUpperCase()}</Text>
          </View>
          <StatusBadge confidence={item.confidence} />
        </View>
        <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 12, lineHeight: 18 }}>
          {item.itemType} · {item.state}
        </Text>
        <View style={{ gap: 4 }}>
          {Object.entries(item.metadata).map(([key, value]) => (
            <Text key={key} style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 11 }}>
              {key}: {value}
            </Text>
          ))}
        </View>
      </View>
    </SurfaceCard>
  );
}
