import { View } from "react-native";
import { SurfaceCard } from "@/components/primitives/surface-card";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

export function LoadingBlock({
  lines = 3,
  tone = "raised"
}: {
  lines?: number;
  tone?: "raised" | "buddy" | "connected" | "discovery" | "danger";
}) {
  const theme = useMobileTheme();

  return (
    <SurfaceCard tone={tone}>
      <View style={{ gap: theme.spacing.md }}>
        {Array.from({ length: lines }).map((_, index) => (
          <View
            key={index}
            style={{
              height: index === 0 ? 18 : 12,
              borderRadius: theme.radius.sm,
              backgroundColor: theme.colors.surfaceMuted,
              width: index === 0 ? "58%" : index === lines - 1 ? "72%" : "100%"
            }}
          />
        ))}
      </View>
    </SurfaceCard>
  );
}
