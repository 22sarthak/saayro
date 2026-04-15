import type { ItineraryStop } from "@saayro/types";
import { Text, View } from "react-native";
import { StatusBadge } from "@/components/primitives/status-badge";
import { TagChip } from "@/components/primitives/tag-chip";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

export function ItineraryTimelineItem({ stop }: { stop: ItineraryStop }) {
  const theme = useMobileTheme();
  const timeLabel = stop.endTime ? `${stop.startTime} - ${stop.endTime}` : stop.startTime;

  return (
    <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
      <View style={{ alignItems: "center", gap: 6, paddingTop: 4 }}>
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: stop.routePreview ? theme.colors.accentMaps : theme.colors.accentDiscovery
          }}
        />
        <View style={{ width: 1, flex: 1, backgroundColor: theme.colors.borderSoft, minHeight: 56 }} />
      </View>
      <View style={{ flex: 1, gap: theme.spacing.sm, paddingBottom: theme.spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.md }}>
          <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.bodyMedium, fontSize: 12 }}>{timeLabel}</Text>
          <StatusBadge confidence={stop.confidence} />
        </View>
        <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 15, lineHeight: 22 }}>{stop.title}</Text>
        <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 14, lineHeight: 21 }}>{stop.subtitle}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
          {stop.tags.map((tag) => (
            <TagChip key={tag} option={{ id: `${stop.id}-${tag}`, label: tag }} />
          ))}
        </View>
        {stop.note ? (
          <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 20 }}>{stop.note}</Text>
        ) : null}
      </View>
    </View>
  );
}
