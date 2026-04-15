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
    <View style={{ gap: theme.spacing.xs }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.md }}>
        <View style={{ flex: 1, gap: theme.spacing.xs }}>
          {eyebrow ? (
            <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.bodyMedium, fontSize: 11, letterSpacing: 1.8 }}>
              {eyebrow.toUpperCase()}
            </Text>
          ) : null}
          <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 18, lineHeight: 24 }}>{title}</Text>
        </View>
        {actionLabel ? (
          <Text style={{ color: theme.colors.accentBuddy, fontFamily: theme.fonts.bodyMedium, fontSize: 12 }}>{actionLabel}</Text>
        ) : null}
      </View>
      {description ? (
        <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 14, lineHeight: 22 }}>{description}</Text>
      ) : null}
    </View>
  );
}
