import { Badge } from "./Badge.js";
import type { TimelineItemProps } from "../contracts/components.js";

export function TimelineItem({ stop }: TimelineItemProps) {
  return (
    <div className="grid gap-2 rounded-[16px] border border-slate-200/80 bg-white/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{stop.title}</p>
          <p className="text-sm text-slate-600">{stop.subtitle}</p>
        </div>
        <Badge variant="confidence" confidence={stop.confidence}>
          {stop.confidence}
        </Badge>
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span>{stop.startTime}</span>
        {stop.endTime ? <span>{stop.endTime}</span> : null}
        <span>{stop.city}</span>
      </div>
    </div>
  );
}

