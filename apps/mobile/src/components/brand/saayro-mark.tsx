import { Text, View } from "react-native";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

export function SaayroMark({ compact = false }: { compact?: boolean }) {
  const theme = useMobileTheme();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
      <View
        style={{
          width: compact ? 36 : 42,
          height: compact ? 36 : 42,
          borderRadius: compact ? 14 : 16,
          backgroundColor: theme.colors.textPrimary,
          alignItems: "center",
          justifyContent: "center",
          ...theme.shadow.card
        }}
      >
        <Text style={{ color: theme.colors.textInverted, fontFamily: theme.fonts.bodyMedium, fontSize: 15 }}>S</Text>
      </View>
      <View>
        <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.display, fontSize: compact ? 24 : 28 }}>Saayro</Text>
        {!compact ? (
          <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 12 }}>Your trip&apos;s smarter half</Text>
        ) : null}
      </View>
    </View>
  );
}

