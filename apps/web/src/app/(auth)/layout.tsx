import type { ReactNode } from "react";
import { SaayroLogo } from "@/components/brand/saayro-logo";
import { SignedOutGate } from "@/components/auth/auth-guards";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <SignedOutGate>
      <div className="min-h-screen bg-[var(--saayro-surface-base)] px-4 py-6 lg:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <SaayroLogo />
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">{children}</div>
        </div>
      </div>
    </SignedOutGate>
  );
}
