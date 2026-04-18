import type { ChipOption } from "@saayro/ui";
import { Pressable, Text, View } from "react-native";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

export function TagChip({
  option,
  onPress,
  disabled = false,
}: {
  option: ChipOption;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const theme = useMobileTheme();
  const content = (
    <View
      style={{
        backgroundColor: option.active ? theme.colors.surfaceConnected : theme.colors.surfaceMuted,
        borderRadius: theme.radius.pill,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs + 2,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Text
        style={{
          color: option.active ? theme.colors.textPrimary : theme.colors.textSecondary,
          fontFamily: theme.fonts.bodyMedium,
          fontSize: 11,
        }}
      >
        {option.label}
      </Text>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable onPress={disabled ? undefined : onPress}>
      {content}
    </Pressable>
  );
}
