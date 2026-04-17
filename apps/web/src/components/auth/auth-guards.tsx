"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useSession } from "@/components/auth/session-provider";

function GateFallback({ copy }: { copy: string }) {
  return (
    <div className="rounded-[28px] border border-slate-200/70 bg-white/90 px-6 py-10 text-sm text-slate-600 shadow-soft">
      {copy}
    </div>
  );
}

export function AuthenticatedGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, state } = useSession();

  useEffect(() => {
    if (state === "ready" && !session?.authenticated) {
      router.replace("/sign-in");
      return;
    }
    if (state === "ready" && session?.authenticated && session.needsOnboarding && !pathname.startsWith("/app/onboarding")) {
      router.replace("/app/onboarding");
    }
  }, [pathname, router, session?.authenticated, session?.needsOnboarding, state]);

  if (state === "loading" || !session?.authenticated) {
    return <GateFallback copy="Checking your Saayro session before we reopen the workspace." />;
  }

  return <>{children}</>;
}

export function SignedOutGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { session, state } = useSession();

  useEffect(() => {
    if (state === "ready" && session?.authenticated) {
      router.replace(session.needsOnboarding ? "/app/onboarding" : "/app");
    }
  }, [router, session?.authenticated, session?.needsOnboarding, state]);

  if (state === "loading") {
    return <GateFallback copy="Restoring session context and deciding where to drop you back into the trip." />;
  }

  return <>{children}</>;
}
