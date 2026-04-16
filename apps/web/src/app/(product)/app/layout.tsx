import type { ReactNode } from "react";
import { AuthenticatedGate } from "@/components/auth/auth-guards";
import { AppShell } from "@/components/shell/app-shell";

export default function ProductAppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthenticatedGate>
      <AppShell>{children}</AppShell>
    </AuthenticatedGate>
  );
}
