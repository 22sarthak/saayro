import type { CardProps } from "../contracts/components.js";
import { cn } from "../utils/cn.js";
import { surfaceClassMap } from "../utils/styles.js";

export function Card({ variant = "trip", surface = "raised", className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-slate-200/70 p-6 shadow-[0_18px_45px_rgba(17,28,40,0.08)]",
        surfaceClassMap[surface],
        variant === "trip" && "space-y-4",
        variant === "connected" && "space-y-3",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

