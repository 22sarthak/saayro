import { semanticTokens } from "@saayro/tokens";
import { Platform } from "react-native";

function remToNumber(value: string): number {
  return Math.round(Number.parseFloat(value.replace("rem", "")) * 16);
}

function pxToNumber(value: string): number {
  return Number.parseFloat(value.replace("px", ""));
}

export const mobileTheme = {
  colors: {
    background: semanticTokens.surface.base,
    canvas: semanticTokens.surface.canvas,
    surfaceRaised: semanticTokens.surface.raised,
    surfaceMuted: semanticTokens.surface.muted,
    surfaceSky: semanticTokens.surface.accentSky,
    surfaceBuddy: semanticTokens.surface.accentBuddy,
    surfaceConnected: semanticTokens.surface.accentConnected,
    surfaceDiscovery: semanticTokens.surface.accentDiscovery,
    surfaceDanger: semanticTokens.surface.danger,
    textPrimary: semanticTokens.text.primary,
    textSecondary: semanticTokens.text.secondary,
    textMuted: semanticTokens.text.muted,
    textSubtle: semanticTokens.text.subtle,
    textInverted: semanticTokens.text.inverted,
    accentMaps: semanticTokens.accent.maps,
    accentBuddy: semanticTokens.accent.buddy,
    accentConnected: semanticTokens.accent.connected,
    accentDiscovery: semanticTokens.accent.discovery,
    statusInfo: semanticTokens.status.info,
    statusSuccess: semanticTokens.status.success,
    statusWarning: semanticTokens.status.warning,
    statusDanger: semanticTokens.status.danger,
    borderSoft: "#DCE3EB",
    borderStrong: "#B6C3D1"
  },
  spacing: {
    xs: remToNumber(semanticTokens.spacing[1]),
    sm: remToNumber(semanticTokens.spacing[2]),
    md: remToNumber(semanticTokens.spacing[3]),
    lg: remToNumber(semanticTokens.spacing[4]),
    xl: remToNumber(semanticTokens.spacing[6]),
    xxl: remToNumber(semanticTokens.spacing[8]),
    hero: remToNumber(semanticTokens.spacing[12])
  },
  radius: {
    sm: pxToNumber(semanticTokens.radius.sm),
    md: pxToNumber(semanticTokens.radius.md),
    lg: pxToNumber(semanticTokens.radius.lg),
    pill: 999
  },
  fonts: {
    display: Platform.select({
      ios: "Georgia",
      android: "serif",
      default: "serif"
    }) as string,
    body: Platform.select({
      ios: "System",
      android: "sans-serif",
      default: "System"
    }) as string,
    bodyMedium: Platform.select({
      ios: "System",
      android: "sans-serif-medium",
      default: "System"
    }) as string
  },
  shadow: {
    card: {
      shadowColor: "#152231",
      shadowOpacity: 0.08,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4
    }
  }
} as const;

export type MobileTheme = typeof mobileTheme;

