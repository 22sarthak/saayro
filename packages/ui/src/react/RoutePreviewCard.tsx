import type { RoutePreviewProps } from "../contracts/components.js";
import { Button } from "./Button.js";
import { Card } from "./Card.js";

export function RoutePreviewCard({ route, ctaLabel = "Open route" }: RoutePreviewProps) {
  return (
    <Card variant="travel" surface="connected" className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">{route.originLabel}</p>
        <p className="text-sm text-slate-600">to {route.destinationLabel}</p>
      </div>
      <div className="flex items-center gap-3 text-sm text-slate-700">
        <span>{route.mode}</span>
        <span>{route.durationMinutes} min</span>
        <span>{route.distanceKilometers} km</span>
      </div>
      <Button variant="secondary">{ctaLabel}</Button>
    </Card>
  );
}

