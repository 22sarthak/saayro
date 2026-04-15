import type { ItineraryStop } from "@saayro/types";
import { Text, View } from "react-native";
import { StatusBadge } from "@/components/primitives/status-badge";
import { TagChip } from "@/components/primitives/tag-chip";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

export function ItineraryTimelineItem({ stop }: { stop: ItineraryStop }) {
  const theme = useMobileTheme();
  const timeLabel = stop.endTime ? `${stop.startTime} - ${stop.endTime}` : stop.startTime;

  return (
    <View style={{ flexDirection: "row", gap: theme.spacing.sm + 2 }}>
      <View style={{ alignItems: "center", gap: 4, paddingTop: 3 }}>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: stop.routePreview ? theme.colors.accentMaps : theme.colors.accentDiscovery
          }}
        />
        <View style={{ width: 1, flex: 1, backgroundColor: theme.colors.borderSoft, minHeight: 44 }} />
      </View>
      <View style={{ flex: 1, gap: 6, paddingBottom: theme.spacing.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.md }}>
          <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.bodyMedium, fontSize: 12 }}>{timeLabel}</Text>
          <StatusBadge confidence={stop.confidence} />
        </View>
        <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 14, lineHeight: 20 }}>{stop.title}</Text>
        <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 19 }}>{stop.subtitle}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
          {stop.tags.map((tag) => (
            <TagChip key={tag} option={{ id: `${stop.id}-${tag}`, label: tag }} />
          ))}
        </View>
        {stop.note ? (
          <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 12, lineHeight: 18 }}>{stop.note}</Text>
        ) : null}
      </View>
    </View>
  );
}
