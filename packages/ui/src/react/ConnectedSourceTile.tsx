import type { ConnectedSourceTileProps } from "../contracts/components.js";
import { Badge } from "./Badge.js";
import { Card } from "./Card.js";

export function ConnectedSourceTile({ account, itemCount = 0 }: ConnectedSourceTileProps) {
  const surfacedCount = account.importedItemCount ?? itemCount;
  const reviewNeededCount = account.reviewNeededItemCount ?? 0;

  return (
    <Card variant="connected" surface="connected">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{account.label}</p>
          <p className="text-sm text-slate-600">
            {surfacedCount} travel items surfaced
            {reviewNeededCount > 0 ? `, ${reviewNeededCount} review-ready` : ""}
          </p>
          {account.statusMessage ? <p className="mt-1 text-xs text-slate-500">{account.statusMessage}</p> : null}
        </div>
        <Badge variant="connected">{account.state}</Badge>
      </div>
    </Card>
  );
}
