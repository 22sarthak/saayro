import type { ButtonVariant } from "@saayro/ui";
import { Pressable, Text } from "react-native";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

const toneMap: Record<ButtonVariant, { backgroundColor: string; textColor: string; borderColor?: string }> = {
  primary: {
    backgroundColor: "#3F91DC",
    textColor: "#FFFFFF"
  },
  secondary: {
    backgroundColor: "#FFFFFF",
    textColor: "#172230",
    borderColor: "#DCE3EB"
  },
  ghost: {
    backgroundColor: "transparent",
    textColor: "#172230"
  },
  "destructive-light": {
    backgroundColor: "#FFF1EF",
    textColor: "#9C3D34"
  }
};

export function ActionButton({
  label,
  variant = "primary",
  onPress,
  disabled = false
}: {
  label: string;
  variant?: ButtonVariant;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const theme = useMobileTheme();
  const tone = toneMap[variant];

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={{
        minHeight: 46,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm + 1,
        borderRadius: theme.radius.md,
        backgroundColor: tone.backgroundColor,
        borderWidth: tone.borderColor ? 1 : 0,
        borderColor: tone.borderColor,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.55 : 1
      }}
    >
      <Text style={{ color: tone.textColor, fontFamily: theme.fonts.bodyMedium, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}
