import { semanticTokens } from "@saayro/tokens";

export const surfaceClassMap = {
  base: "bg-[var(--saayro-surface-base)] text-[var(--saayro-text-primary)]",
  raised: "bg-[var(--saayro-surface-raised)] text-[var(--saayro-text-primary)]",
  buddy: "bg-[var(--saayro-surface-accent-buddy)] text-[var(--saayro-text-secondary)]",
  discovery: "bg-[var(--saayro-surface-accent-discovery)] text-[var(--saayro-text-secondary)]",
  connected: "bg-[var(--saayro-surface-accent-connected)] text-[var(--saayro-text-secondary)]",
  danger: "bg-[var(--saayro-surface-danger)] text-[var(--saayro-text-secondary)]"
} as const;

export const statusToneMap = {
  info: semanticTokens.status.info,
  success: semanticTokens.status.success,
  warning: semanticTokens.status.warning,
  danger: semanticTokens.status.danger
} as const;

export type SurfaceTone = keyof typeof surfaceClassMap;
export type StatusTone = keyof typeof statusToneMap;

