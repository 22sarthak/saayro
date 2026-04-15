import type { ConfidenceLabel, ConnectionState } from "@saayro/types";
import { Text, View } from "react-native";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

type BadgeTone = "neutral" | "maps" | "buddy" | "connected" | "discovery" | "danger";

function toneToColors(tone: BadgeTone, theme: ReturnType<typeof useMobileTheme>) {
  if (tone === "maps") {
    return { backgroundColor: theme.colors.surfaceSky, color: theme.colors.textSecondary };
  }

  if (tone === "buddy") {
    return { backgroundColor: theme.colors.surfaceBuddy, color: theme.colors.textSecondary };
  }

  if (tone === "connected") {
    return { backgroundColor: theme.colors.surfaceConnected, color: theme.colors.textSecondary };
  }

  if (tone === "discovery") {
    return { backgroundColor: theme.colors.surfaceDiscovery, color: theme.colors.textSecondary };
  }

  if (tone === "danger") {
    return { backgroundColor: theme.colors.surfaceDanger, color: theme.colors.statusDanger };
  }

  return { backgroundColor: theme.colors.surfaceMuted, color: theme.colors.textSecondary };
}

function labelFromConfidence(confidence: ConfidenceLabel) {
  if (confidence === "needs-review") {
    return "Needs review";
  }

  return confidence.charAt(0).toUpperCase() + confidence.slice(1);
}

function toneFromConfidence(confidence: ConfidenceLabel): BadgeTone {
  if (confidence === "high") {
    return "connected";
  }

  if (confidence === "medium") {
    return "discovery";
  }

  return "danger";
}

function labelFromConnection(state: ConnectionState) {
  if (state === "not-connected") {
    return "Not connected";
  }

  return state.charAt(0).toUpperCase() + state.slice(1);
}

function toneFromConnection(state: ConnectionState): BadgeTone {
  if (state === "connected") {
    return "connected";
  }

  if (state === "partial" || state === "connecting") {
    return "discovery";
  }

  if (state === "revoked") {
    return "danger";
  }

  return "neutral";
}

export function StatusBadge({
  label,
  tone = "neutral",
  confidence,
  connectionState
}: {
  label?: string;
  tone?: BadgeTone;
  confidence?: ConfidenceLabel;
  connectionState?: ConnectionState;
}) {
  const theme = useMobileTheme();

  const resolvedLabel = confidence
    ? labelFromConfidence(confidence)
    : connectionState
      ? labelFromConnection(connectionState)
      : label ?? "Status";

  const resolvedTone = confidence ? toneFromConfidence(confidence) : connectionState ? toneFromConnection(connectionState) : tone;
  const colors = toneToColors(resolvedTone, theme);

  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderRadius: theme.radius.pill,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        backgroundColor: colors.backgroundColor
      }}
    >
      <Text style={{ color: colors.color, fontFamily: theme.fonts.bodyMedium, fontSize: 11 }}>{resolvedLabel}</Text>
    </View>
  );
}
