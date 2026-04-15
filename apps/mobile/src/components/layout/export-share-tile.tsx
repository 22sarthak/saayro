import type { ExportPack } from "@saayro/types";
import { Text, View } from "react-native";
import { ActionButton } from "@/components/primitives/action-button";
import { StatusBadge } from "@/components/primitives/status-badge";
import { SurfaceCard } from "@/components/primitives/surface-card";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

function toneForExport(pack: ExportPack) {
  if (pack.status === "failed") {
    return "danger" as const;
  }

  if (pack.status === "generating") {
    return "buddy" as const;
  }

  if (pack.status === "ready") {
    return "connected" as const;
  }

  return "raised" as const;
}

function actionLabel(pack: ExportPack) {
  if (pack.status === "ready") {
    return "Open";
  }

  if (pack.status === "generating") {
    return "Preparing";
  }

  if (pack.status === "failed") {
    return "Retry";
  }

  return "Create";
}

export function ExportShareTile({ pack }: { pack: ExportPack }) {
  const theme = useMobileTheme();

  return (
    <SurfaceCard tone={toneForExport(pack)}>
      <View style={{ gap: theme.spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.md }}>
          <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 15 }}>{pack.label}</Text>
          <StatusBadge
            label={pack.status === "ready" ? "Ready" : pack.status === "generating" ? "Generating" : pack.status === "failed" ? "Needs retry" : "Idle"}
            tone={pack.status === "ready" ? "connected" : pack.status === "generating" ? "buddy" : pack.status === "failed" ? "danger" : "neutral"}
          />
        </View>
        <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 14, lineHeight: 21 }}>{pack.description}</Text>
        <ActionButton label={actionLabel(pack)} variant={pack.status === "ready" ? "primary" : "secondary"} />
      </View>
    </SurfaceCard>
  );
}
