"use client";

import { Button, cn } from "@saayro/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { appNavItems } from "@/lib/navigation";

export function MobileAppNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <div className="flex items-center justify-between rounded-[20px] border border-slate-200/70 bg-white/90 px-4 py-3 shadow-soft">
        <p className="text-sm font-medium text-slate-800">Preview shell</p>
        <Button variant="secondary" onClick={() => setOpen((value) => !value)}>
          {open ? "Close" : "Menu"}
        </Button>
      </div>
      {open ? (
        <div className="mt-3 rounded-[24px] border border-slate-200/70 bg-white px-4 py-4 shadow-soft">
          <nav className="grid gap-2">
            {appNavItems.map((item) => {
              const active = item.href === "/app" ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-2xl px-4 py-3 text-sm transition-colors",
                    active ? "bg-slate-950 text-white" : "bg-ivory-50 text-slate-700"
                  )}
                  onClick={() => setOpen(false)}
                >
                  <span className="block font-medium">{item.shortLabel}</span>
                  <span className={cn("text-xs", active ? "text-white/70" : "text-slate-500")}>{item.description}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
