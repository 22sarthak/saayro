import { Text, View } from "react-native";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

export function SectionHeader({
  eyebrow,
  title,
  description,
  actionLabel
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actionLabel?: string;
}) {
  const theme = useMobileTheme();

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.md }}>
        <View style={{ flex: 1, gap: theme.spacing.xs }}>
          {eyebrow ? (
            <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.bodyMedium, fontSize: 10, letterSpacing: 1.5 }}>
              {eyebrow.toUpperCase()}
            </Text>
          ) : null}
          <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 16, lineHeight: 21 }}>{title}</Text>
        </View>
        {actionLabel ? (
          <Text style={{ color: theme.colors.accentBuddy, fontFamily: theme.fonts.bodyMedium, fontSize: 12 }}>{actionLabel}</Text>
        ) : null}
      </View>
      {description ? (
        <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 20 }}>{description}</Text>
      ) : null}
    </View>
  );
}
