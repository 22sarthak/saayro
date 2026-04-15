import { semanticTokens } from "@saayro/tokens";
import { cn } from "@saayro/ui";
import Link from "next/link";
import type { ReactNode } from "react";

const variantClassMap = {
  primary: "text-white shadow-[0_18px_45px_rgba(17,28,40,0.12)]",
  secondary: "border border-slate-300 bg-white text-slate-900",
  ghost: "bg-transparent text-slate-800",
  "destructive-light": "text-red-900"
} as const;

const variantStyleMap = {
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
} as const;

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className
}: {
  href: string;
  children: ReactNode;
  variant?: keyof typeof variantClassMap;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[16px] px-4 py-2.5 text-sm font-medium transition-all duration-200 ease-out",
        variantClassMap[variant],
        className
      )}
      style={variantStyleMap[variant]}
    >
      {children}
    </Link>
  );
}

