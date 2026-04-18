import type { ConnectedTravelItem } from "@saayro/types";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { StatusBadge } from "@/components/primitives/status-badge";
import { SurfaceCard } from "@/components/primitives/surface-card";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

export function ConnectedTravelDetailCard({
  item,
  children,
}: {
  item: ConnectedTravelItem;
  children?: ReactNode;
}) {
  const theme = useMobileTheme();
  const tone = item.confidence === "needs-review" ? "danger" : item.state === "attached" ? "connected" : "raised";
  const summary =
    item.metadata.extraction_reason || item.metadata.summary || item.metadata.location || "Imported travel context ready for review.";
  const supportingMetadata = Object.entries(item.metadata)
    .filter(([key]) => !["extraction_reason", "summary"].includes(key))
    .slice(0, 3);
  const stateLabel =
    item.state === "candidate" ? "Needs review" : item.state === "attached" ? `Attached${item.tripTitle ? ` · ${item.tripTitle}` : ""}` : "Ignored";

  return (
    <SurfaceCard tone={tone}>
      <View style={{ gap: theme.spacing.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.md }}>
          <View style={{ flex: 1, gap: theme.spacing.xs }}>
            <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 15 }}>{item.title}</Text>
            <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 12 }}>
              {item.accountLabel ?? item.provider.toUpperCase()}
            </Text>
          </View>
          <StatusBadge confidence={item.confidence} />
        </View>
        <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 12, lineHeight: 18 }}>
          {item.itemType} · {stateLabel}
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 12, lineHeight: 18 }}>{summary}</Text>
        <View style={{ gap: 4 }}>
          {supportingMetadata.map(([key, value]) => (
            <Text key={key} style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 11 }}>
              {key}: {value}
            </Text>
          ))}
        </View>
        {children}
      </View>
    </SurfaceCard>
  );
}
