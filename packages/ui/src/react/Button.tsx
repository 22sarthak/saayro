import type { CSSProperties } from "react";
import { semanticTokens } from "@saayro/tokens";
import type { ButtonProps } from "../contracts/components.js";
import { cn } from "../utils/cn.js";

const variantClassMap: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "text-white shadow-[0_18px_45px_rgba(17,28,40,0.12)]",
  secondary: "border border-slate-300 bg-white text-slate-900",
  ghost: "bg-transparent text-slate-800",
  "destructive-light": "text-red-900"
};

const variantStyleMap: Record<NonNullable<ButtonProps["variant"]>, CSSProperties> = {
  primary: {
    background: `linear-gradient(135deg, ${semanticTokens.accent.maps}, ${semanticTokens.accent.buddy})`
  },
  secondary: {
    backgroundColor: semanticTokens.surface.raised
  },
  ghost: {},
  "destructive-light": {
    backgroundColor: semanticTokens.surface.danger
  }
};

export function Button({
  variant = "primary",
  leadingIcon,
  trailingIcon,
  className,
  children,
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[16px] px-4 py-2.5 text-sm font-medium transition-all duration-200 ease-out",
        variantClassMap[variant],
        className
      )}
      style={{ ...variantStyleMap[variant], ...style }}
      {...props}
    >
      {leadingIcon}
      <span>{children}</span>
      {trailingIcon}
    </button>
  );
}

