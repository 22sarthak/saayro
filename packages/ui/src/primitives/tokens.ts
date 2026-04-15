import { semanticTokens } from "@saayro/tokens";

export function createCssVariables(): Record<string, string> {
  return {
    "--saayro-surface-base": semanticTokens.surface.base,
    "--saayro-surface-raised": semanticTokens.surface.raised,
    "--saayro-surface-accent-buddy": semanticTokens.surface.accentBuddy,
    "--saayro-surface-accent-connected": semanticTokens.surface.accentConnected,
    "--saayro-surface-accent-discovery": semanticTokens.surface.accentDiscovery,
    "--saayro-surface-danger": semanticTokens.surface.danger,
    "--saayro-text-primary": semanticTokens.text.primary,
    "--saayro-text-secondary": semanticTokens.text.secondary,
    "--saayro-text-muted": semanticTokens.text.muted,
    "--saayro-border-subtle": semanticTokens.border.subtle
  };
}

