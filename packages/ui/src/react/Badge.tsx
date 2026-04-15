import { semanticTokens } from "@saayro/tokens";
import type { BadgeProps } from "../contracts/components.js";
import { cn } from "../utils/cn.js";

const confidenceMap = {
  high: semanticTokens.surface.accentConnected,
  medium: semanticTokens.surface.accentSky,
  low: semanticTokens.surface.accentDiscovery,
  "needs-review": semanticTokens.surface.danger
} as const;

export function Badge({ variant = "status", confidence, className, style, children, ...props }: BadgeProps) {
  const backgroundColor =
    variant === "confidence" && confidence ? confidenceMap[confidence] : semanticTokens.surface.raised;

  return (
    <span
      className={cn("inline-flex items-center rounded-[999px] px-3 py-1 text-xs font-medium text-slate-800", className)}
      style={{ backgroundColor, ...style }}
      {...props}
    >
      {children}
    </span>
  );
}

