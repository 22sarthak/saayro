import { createRouteHandoffTarget, resolveMapHandoff } from "@saayro/types";
import { Badge, ExportTile, RoutePreviewCard, SectionHeader, TimelineItem } from "@saayro/ui";
import { notFound, redirect } from "next/navigation";
import { TripConnectedReviewRail } from "@/components/connections/trip-connected-review-rail";
import { ButtonLink } from "@/components/ui/button-link";
import { StatePanel } from "@/components/ui/state-panel";
import { fetchServerSession } from "@/lib/auth-server";
import { getTripById } from "@/lib/mock-selectors";
import { fetchServerTripBundle, fetchServerTripSummaries } from "@/lib/trip-server";

export default async function TripPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const session = await fetchServerSession();
  const liveTripBundle = session?.authenticated ? await fetchServerTripBundle(tripId) : null;
  const trip = liveTripBundle?.trip ?? getTripById(tripId);

  if (!trip) {
    if (session?.authenticated) {
      const liveTrips = await fetchServerTripSummaries();
      const firstTrip = liveTrips?.[0];
      if (firstTrip) {
        redirect(`/app/trips/${firstTrip.id}`);
      }
    }
    notFound();
  }

  const firstRoute = trip.itinerary.flatMap((day) => day.stops).find((stop) => stop.routePreview)?.routePreview;
  const routeHandoff = firstRoute
    ? resolveMapHandoff(createRouteHandoffTarget(firstRoute), trip.preferences.preferredMapsApp, firstRoute.mapsAppOptions)
    : null;

  return (
    <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-5">
        <section className="section-shell space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Trip hub</p>
              <h1 className="editorial-title text-5xl text-slate-950">{trip.title}</h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-600">{trip.overview}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {trip.highlights.map((highlight) => (
                <Badge key={highlight}>{highlight}</Badge>
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] bg-sky-100 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Destination</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {trip.destinationCity}, {trip.destinationRegion}
              </p>
            </div>
            <div className="rounded-[24px] bg-violet-100 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Party and pace</p>
              <p className="mt-2 text-sm font-semibold capitalize text-slate-900">
                {trip.party} · {trip.preferences.travelPace}
              </p>
            </div>
            <div className="rounded-[24px] bg-mint-100 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Connected items</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{trip.connectedItems.length} linked to this trip</p>
            </div>
          </div>
        </section>

        <section className="section-shell space-y-5">
          <SectionHeader
            title="Itinerary"
            description="A route-aware planner shell with visible day structure, timing assumptions, and room for refinement."
            actionSlot={<ButtonLink href="/app/buddy" variant="secondary">Ask Buddy</ButtonLink>}
          />
          <div className="grid gap-5">
            {trip.itinerary.map((day) => (
              <div key={day.id} className="space-y-4 rounded-[28px] border border-slate-200/70 bg-white p-5">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Day {day.dayNumber} · {day.date}</p>
                  <h2 className="editorial-title text-3xl text-slate-950">{day.title}</h2>
                  <p className="text-sm leading-7 text-slate-600">{day.summary}</p>
                </div>
                <div className="grid gap-3">
                  {day.stops.map((stop) => (
                    <TimelineItem key={stop.id} stop={stop} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="space-y-5">
        <StatePanel
          eyebrow="Planner rail"
          title="Keep the next travel move nearby."
          description="Buddy, exports, and route handoffs should stay close to the itinerary without swallowing the workspace."
          tone="buddy"
          actions={
            <>
              <ButtonLink href="/app/buddy" variant="primary">Ask Buddy</ButtonLink>
              <ButtonLink href="/app/saved" variant="secondary">Review Saved Places</ButtonLink>
            </>
          }
        />
        {firstRoute && routeHandoff ? (
          <RoutePreviewCard
            route={firstRoute}
            ctaLabel={routeHandoff.fallbackLabel}
            ctaHref={routeHandoff.externalUrl}
            fallbackLabel={`Copy destination: ${routeHandoff.destinationLabel}`}
          />
        ) : null}
        <div className="section-shell space-y-4">
          <SectionHeader title="Exports" description="Portable outputs stay attached to the trip hub." />
          <div className="grid gap-3">
            {trip.exports.map((pack) => (
              <ExportTile key={pack.id} pack={pack} />
            ))}
          </div>
        </div>
        <div className="section-shell space-y-4">
          <SectionHeader title="Connected travel" description="Partial and connected states sit in the same rail for quick review." />
          <TripConnectedReviewRail tripId={trip.id} fallbackAccounts={trip.connectedAccounts} fallbackItems={trip.connectedItems} />
        </div>
      </div>
    </div>
  );
}
