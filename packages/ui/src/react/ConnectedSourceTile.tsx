import type { ConnectedSourceTileProps } from "../contracts/components.js";
import { Badge } from "./Badge.js";
import { Card } from "./Card.js";

export function ConnectedSourceTile({ account, itemCount = 0 }: ConnectedSourceTileProps) {
  return (
    <Card variant="connected" surface="connected">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{account.label}</p>
          <p className="text-sm text-slate-600">{itemCount} travel items surfaced</p>
        </div>
        <Badge variant="connected">{account.state}</Badge>
      </div>
    </Card>
  );
}

