import type { ChipOption } from "@saayro/ui";
import { Text, View } from "react-native";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

export function TagChip({ option }: { option: ChipOption }) {
  const theme = useMobileTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.surfaceMuted,
        borderRadius: theme.radius.pill,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm
      }}
    >
      <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.bodyMedium, fontSize: 12 }}>{option.label}</Text>
    </View>
  );
}

