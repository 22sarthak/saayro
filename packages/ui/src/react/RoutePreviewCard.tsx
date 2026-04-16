import type { RoutePreviewProps } from "../contracts/components.js";
import { Button } from "./Button.js";
import { Card } from "./Card.js";

export function RoutePreviewCard({
  route,
  ctaLabel = "Open route",
  ctaHref,
  ctaTarget = "_blank",
  fallbackLabel,
}: RoutePreviewProps) {
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
      {ctaHref ? (
        <a
          href={ctaHref}
          target={ctaTarget}
          rel={ctaTarget === "_blank" ? "noreferrer noopener" : undefined}
          className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition-all duration-200 ease-out"
        >
          <span>{ctaLabel}</span>
        </a>
      ) : (
        <Button variant="secondary">{fallbackLabel ?? ctaLabel}</Button>
      )}
    </Card>
  );
}
