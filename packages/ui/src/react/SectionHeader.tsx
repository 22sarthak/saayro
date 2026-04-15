import type { SectionHeaderProps } from "../contracts/components.js";

export function SectionHeader({ title, description, actionLabel, actionSlot }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
        {description ? <p className="max-w-2xl text-sm text-slate-600">{description}</p> : null}
      </div>
      {actionSlot ?? (actionLabel ? <span className="text-sm font-medium text-slate-700">{actionLabel}</span> : null)}
    </div>
  );
}

