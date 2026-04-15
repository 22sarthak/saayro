import { Card, cn } from "@saayro/ui";
import type { ReactNode } from "react";

export function StatePanel({
  eyebrow,
  title,
  description,
  actions,
  tone = "raised",
  children,
  className
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  tone?: "raised" | "buddy" | "discovery" | "connected" | "danger";
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Card surface={tone} className={cn("space-y-4", className)}>
      <div className="space-y-2">
        {eyebrow ? <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{eyebrow}</p> : null}
        <h3 className="font-['Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif] text-2xl text-slate-950">
          {title}
        </h3>
        <p className="max-w-xl text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {children}
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </Card>
  );
}

