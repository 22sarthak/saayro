import type { ExportTileProps } from "../contracts/components.js";
import { Badge } from "./Badge.js";
import { Card } from "./Card.js";

export function ExportTile({ pack }: ExportTileProps) {
  return (
    <Card variant="export" surface="raised" className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{pack.label}</p>
          <p className="text-sm text-slate-600">{pack.description}</p>
        </div>
        <Badge>{pack.status}</Badge>
      </div>
    </Card>
  );
}

