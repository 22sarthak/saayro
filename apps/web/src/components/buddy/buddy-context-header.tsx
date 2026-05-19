import Link from "next/link";
import type { TripSummary } from "@saayro/types";

type Mode = "new" | "trip" | "fallback";

export function BuddyContextHeader({
  mode,
  activeTripTitle,
  activeTripId,
  tripSummaries,
}: {
  mode: Mode;
  activeTripTitle: string | null;
  activeTripId: string | null;
  tripSummaries: TripSummary[];
}) {
  const chipLabel =
    mode === "new"
      ? "Buddy mode: New trip planning"
      : mode === "trip" && activeTripTitle
        ? `Buddy mode: Planning with ${activeTripTitle}`
        : "Buddy mode: Fallback preview";

  const otherTrips = tripSummaries.filter((trip) => trip.id !== activeTripId);

  return (
    <div className="rounded-[22px] border border-violet-200/70 bg-violet-50/60 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-violet-700">
          {chipLabel}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {mode !== "new" ? (
            <Link
              href="/app/buddy?mode=new"
              className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-violet-100"
            >
              Start new Buddy plan
            </Link>
          ) : null}
          {otherTrips.length > 0 ? (
            <details className="relative">
              <summary className="cursor-pointer list-none rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-violet-100">
                Switch trip
              </summary>
              <div className="absolute right-0 z-10 mt-2 w-64 rounded-[18px] border border-slate-200 bg-white p-2 shadow-lg">
                {otherTrips.map((trip) => (
                  <Link
                    key={trip.id}
                    href={`/app/buddy?trip=${encodeURIComponent(trip.id)}`}
                    className="block rounded-[12px] px-3 py-2 text-sm text-slate-700 hover:bg-violet-50"
                  >
                    {trip.title}
                  </Link>
                ))}
              </div>
            </details>
          ) : null}
          <Link
            href="/app/trips"
            className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-violet-100"
          >
            Open Trip Hub
          </Link>
        </div>
      </div>
    </div>
  );
}
