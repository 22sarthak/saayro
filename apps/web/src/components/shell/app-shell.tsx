"use client";

import { Button, cn } from "@saayro/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SaayroLogo } from "@/components/brand/saayro-logo";
import { MobileAppNav } from "@/components/shell/mobile-app-nav";
import { ButtonLink } from "@/components/ui/button-link";
import { appNavItems, getSectionLabel } from "@/lib/navigation";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const sectionLabel = getSectionLabel(pathname);

  return (
    <div className="min-h-screen bg-[var(--saayro-surface-base)]">
      <div className="mx-auto grid min-h-screen w-full max-w-[1480px] gap-6 px-4 py-4 lg:grid-cols-shell lg:px-6">
        <aside className="hidden rounded-[30px] border border-slate-200/70 bg-white/90 p-6 shadow-soft lg:flex lg:flex-col">
          <div className="border-b border-slate-200/70 pb-6">
            <SaayroLogo />
          </div>
          <nav className="mt-6 grid gap-2">
            {appNavItems.map((item) => {
              const active = item.href === "/app" ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-[22px] px-4 py-4 transition-colors",
                    active ? "bg-slate-950 text-white shadow-soft" : "bg-transparent text-slate-700 hover:bg-ivory-100"
                  )}
                >
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className={cn("mt-1 block text-xs", active ? "text-white/70" : "text-slate-500")}>
                    {item.description}
                  </span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto rounded-[24px] bg-[var(--saayro-surface-accent-buddy)] p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Preview mode</p>
            <p className="mt-2 text-sm text-slate-700">
              Signed-in routes are live as shell previews. No backend, auth, or sync is connected yet.
            </p>
          </div>
        </aside>
        <div className="flex min-h-[80vh] flex-col gap-4">
          <MobileAppNav />
          <header className="rounded-[28px] border border-slate-200/70 bg-white/90 px-5 py-4 shadow-soft">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Saayro web shell</p>
                <h1 className="font-['Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif] text-3xl text-slate-950">
                  {sectionLabel}
                </h1>
              </div>
              <div className="flex flex-wrap gap-3">
                <ButtonLink href="/app" variant="secondary">
                  Create trip
                </ButtonLink>
                <ButtonLink href="/app/buddy" variant="primary">
                  Ask Buddy
                </ButtonLink>
                <ButtonLink href="/app/trips/trip-jaipur-november" variant="ghost">
                  Open trip
                </ButtonLink>
              </div>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
