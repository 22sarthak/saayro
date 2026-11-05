/** Small, presentational trip objects reused across the landing page. */
import { Plane } from "lucide-react";

const avatarTones = [
  "bg-rose-100 text-rose-700",
  "bg-sky-200 text-sky-700",
  "bg-amber-200 text-amber-700",
  "bg-violet-200 text-violet-700",
  "bg-mint-200 text-mint-700"
];

export function AvatarStack({ names, size = "md" }: { names: string[]; size?: "sm" | "md" }) {
  const dimension = size === "sm" ? "h-7 w-7 text-[11px]" : "h-9 w-9 text-xs";
  return (
    <div className="flex -space-x-2">
      {names.map((name, index) => (
        <span
          key={name}
          title={name}
          className={`${dimension} ${avatarTones[index % avatarTones.length]} flex items-center justify-center rounded-full font-semibold ring-2 ring-white`}
        >
          {name.slice(0, 1)}
        </span>
      ))}
    </div>
  );
}

export function BoardingPass({ variant = "glass" }: { variant?: "glass" | "paper" }) {
  const surface = variant === "glass" ? "glass-strong" : "bg-white shadow-elevated";
  return (
    <div className={`${surface} relative w-full overflow-hidden rounded-[24px]`}>
      <div className="flex items-center justify-between px-5 pt-4">
        <span className="eyebrow text-slate-500">Boarding pass</span>
        <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-700">Web check-in open</span>
      </div>
      <div className="flex items-end justify-between px-5 pb-4 pt-3">
        <div>
          <p className="display text-4xl text-slate-950">BLR</p>
          <p className="text-xs text-slate-500">Bengaluru · T1</p>
        </div>
        <div className="mb-3 flex flex-1 items-center gap-2 px-4">
          <span className="h-px flex-1 border-t border-dashed border-slate-300" />
          <Plane className="h-4 w-4 text-sky-600" strokeWidth={2.2} />
          <span className="h-px flex-1 border-t border-dashed border-slate-300" />
        </div>
        <div className="text-right">
          <p className="display text-4xl text-slate-950">GOI</p>
          <p className="text-xs text-slate-500">Goa · Dabolim</p>
        </div>
      </div>
      <div className="relative border-t border-dashed border-slate-200 px-5 py-3">
        <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-porcelain-100" />
        <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-porcelain-100" />
        <div className="grid grid-cols-4 gap-2 font-mono text-[11px] text-slate-600">
          <div>
            <p className="text-slate-400">Flight</p>
            <p className="font-semibold text-slate-900">6E 2134</p>
          </div>
          <div>
            <p className="text-slate-400">Date</p>
            <p className="font-semibold text-slate-900">27 Dec</p>
          </div>
          <div>
            <p className="text-slate-400">Departs</p>
            <p className="font-semibold text-slate-900">06:10</p>
          </div>
          <div>
            <p className="text-slate-400">PNR</p>
            <p className="font-semibold text-slate-900">X7KQ2M</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BudgetMeter({ spent, total }: { spent: number; total: number }) {
  const percent = Math.min(100, Math.round((spent / total) * 100));
  const format = (value: number) => `₹${(value / 1000).toFixed(1)}k`;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-slate-500">Group budget</span>
        <span className="text-xs text-slate-500">
          <span className="font-semibold text-slate-900">{format(spent)}</span> of {format(total)}
        </span>
      </div>
      <div className="mt-2 flex h-2 gap-0.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-sky-400" style={{ width: `${percent * 0.45}%` }} />
        <div className="h-full bg-amber-400" style={{ width: `${percent * 0.35}%` }} />
        <div className="h-full bg-sky-400" style={{ width: `${percent * 0.2}%` }} />
      </div>
    </div>
  );
}
