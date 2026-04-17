"use client";

import { searchIndiaDestinations, type BackendTripRead, type TravelerParty, type TripSummary } from "@saayro/types";
import { Button, Card } from "@saayro/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { attachPreTripBuddyToTrip } from "@/lib/buddy-client";
import { createTrip, fetchTripDetail, fetchTrips, updateTrip } from "@/lib/trip-client";

type TripDraft = {
  title: string;
  destinationCity: string;
  destinationRegion: string;
  destinationCountry: string;
  startDate: string;
  endDate: string;
  party: TravelerParty;
  overview: string;
  highlights: string[];
};

const defaultDraft: TripDraft = {
  title: "",
  destinationCity: "",
  destinationRegion: "",
  destinationCountry: "India",
  startDate: "",
  endDate: "",
  party: "couple",
  overview: "",
  highlights: [],
};

function normalizeTripDraft(trip: BackendTripRead): TripDraft {
  return {
    title: trip.title,
    destinationCity: trip.destination_city,
    destinationRegion: trip.destination_region,
    destinationCountry: trip.destination_country,
    startDate: trip.start_date,
    endDate: trip.end_date,
    party: trip.party as TravelerParty,
    overview: trip.overview,
    highlights: trip.highlights,
  };
}

export function TripHubEntry({ initialTrips }: { initialTrips: TripSummary[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [trips, setTrips] = useState(initialTrips);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(initialTrips[0]?.id ?? null);
  const [mode, setMode] = useState<"create" | "edit">(initialTrips.length === 0 ? "create" : "edit");
  const [draft, setDraft] = useState<TripDraft>(defaultDraft);
  const [destinationQuery, setDestinationQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const createRequested = searchParams.get("create") === "1";
  const source = searchParams.get("source");

  useEffect(() => {
    if (createRequested || trips.length === 0) {
      setMode("create");
      setSelectedTripId(null);
    }
  }, [createRequested, trips.length]);

  useEffect(() => {
    if (mode !== "edit" || !selectedTripId) {
      return;
    }

    let active = true;
    void fetchTripDetail(selectedTripId)
      .then((trip) => {
        if (!active) {
          return;
        }
        setDraft(normalizeTripDraft(trip));
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setMessage("Trip details could not load right now. You can still start a new trip.");
      });

    return () => {
      active = false;
    };
  }, [mode, selectedTripId]);

  const destinationMatches = useMemo(() => searchIndiaDestinations(destinationQuery).slice(0, 8), [destinationQuery]);

  const applyDestination = (destination: ReturnType<typeof searchIndiaDestinations>[number]) => {
    setDraft((current) => ({
      ...current,
      title: current.title || `${destination.city} trip`,
      destinationCity: destination.city,
      destinationRegion: destination.region,
      destinationCountry: destination.country,
      overview:
        current.overview ||
        `A premium ${destination.city} plan shaped around ${destination.highlights.slice(0, 2).join(" and ")}.`,
      highlights: destination.highlights.slice(0, 3),
    }));
    setDestinationQuery(`${destination.city}, ${destination.region}`);
  };

  const refreshTrips = async () => {
    const nextTrips = await fetchTrips();
    setTrips(nextTrips);
    return nextTrips;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const targetTrip =
        mode === "create"
          ? await createTrip(draft)
          : selectedTripId
            ? await updateTrip(selectedTripId, draft)
            : null;

      if (!targetTrip) {
        throw new Error("Choose a trip to edit or switch into create mode.");
      }

      if (mode === "create" && source === "buddy") {
        await attachPreTripBuddyToTrip(targetTrip.id);
      }

      const nextTrips = await refreshTrips();
      const activeTripId = targetTrip.id ?? nextTrips[0]?.id;
      router.replace(activeTripId ? `/app/trips/${activeTripId}` : "/app/trips");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Trip Hub could not save this trip yet.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="section-shell space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Trip Hub</p>
            <h2 className="editorial-title text-3xl text-slate-950">
              {trips.length ? "Open or shape a live trip." : "Create the first live trip."}
            </h2>
          </div>
          <Button
            variant={mode === "create" ? "primary" : "secondary"}
            onClick={() => {
              setMode("create");
              setSelectedTripId(null);
              setDraft(defaultDraft);
            }}
          >
            Create trip
          </Button>
        </div>
        <p className="text-sm leading-7 text-slate-600">
          Search stays intentionally curated for India in this step. It is a premium destination shortlist, not a live places API.
        </p>
        <div className="grid gap-3">
          {trips.length ? (
            trips.map((trip) => (
              <Card key={trip.id} className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{trip.title}</p>
                    <p className="text-sm text-slate-600">{trip.destinationLabel}</p>
                    <p className="mt-2 text-sm text-slate-500">
                      {trip.startDate} to {trip.endDate}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => router.push(`/app/trips/${trip.id}`)}>
                      Open trip
                    </Button>
                    <Button
                      variant={selectedTripId === trip.id && mode === "edit" ? "primary" : "ghost"}
                      onClick={() => {
                        setSelectedTripId(trip.id);
                        setMode("edit");
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="space-y-3">
              <p className="text-lg font-semibold text-slate-900">No live trip yet</p>
              <p className="text-sm leading-6 text-slate-600">
                This is now the real bridge into planning. Create a destination-led trip here instead of looping back to the dashboard.
              </p>
            </Card>
          )}
        </div>
      </div>

      <div className="section-shell space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
            {mode === "create" ? "Create trip" : "Edit trip"}
          </p>
          <h2 className="editorial-title text-3xl text-slate-950">
            {mode === "create" ? "Build a destination-first plan." : "Tighten the trip details."}
          </h2>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            value={destinationQuery}
            onChange={(event) => setDestinationQuery(event.target.value)}
            placeholder="Search curated India destinations"
            className="w-full rounded-[20px] border border-slate-200/80 bg-ivory-50 px-4 py-3 text-sm text-slate-900 outline-none"
          />
          <div className="grid gap-2 md:grid-cols-2">
            {destinationMatches.map((destination) => (
              <button
                key={destination.id}
                type="button"
                onClick={() => applyDestination(destination)}
                className="rounded-[18px] border border-slate-200/80 bg-white px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-ivory-50"
              >
                <span className="block font-semibold text-slate-900">{destination.city}</span>
                <span className="block text-xs text-slate-500">{destination.region} · {destination.highlights.join(", ")}</span>
              </button>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="Trip title"
              className="w-full rounded-[20px] border border-slate-200/80 bg-ivory-50 px-4 py-3 text-sm text-slate-900 outline-none"
            />
            <select
              value={draft.party}
              onChange={(event) => setDraft((current) => ({ ...current, party: event.target.value as TravelerParty }))}
              className="w-full rounded-[20px] border border-slate-200/80 bg-ivory-50 px-4 py-3 text-sm text-slate-900 outline-none"
            >
              <option value="solo">Solo</option>
              <option value="couple">Couple</option>
              <option value="family">Family</option>
              <option value="friends">Friends</option>
              <option value="business">Business</option>
            </select>
            <input
              value={draft.destinationCity}
              onChange={(event) => setDraft((current) => ({ ...current, destinationCity: event.target.value }))}
              placeholder="Destination city"
              className="w-full rounded-[20px] border border-slate-200/80 bg-ivory-50 px-4 py-3 text-sm text-slate-900 outline-none"
            />
            <input
              value={draft.destinationRegion}
              onChange={(event) => setDraft((current) => ({ ...current, destinationRegion: event.target.value }))}
              placeholder="State / region"
              className="w-full rounded-[20px] border border-slate-200/80 bg-ivory-50 px-4 py-3 text-sm text-slate-900 outline-none"
            />
            <input
              value={draft.startDate}
              onChange={(event) => setDraft((current) => ({ ...current, startDate: event.target.value }))}
              type="date"
              className="w-full rounded-[20px] border border-slate-200/80 bg-ivory-50 px-4 py-3 text-sm text-slate-900 outline-none"
            />
            <input
              value={draft.endDate}
              onChange={(event) => setDraft((current) => ({ ...current, endDate: event.target.value }))}
              type="date"
              className="w-full rounded-[20px] border border-slate-200/80 bg-ivory-50 px-4 py-3 text-sm text-slate-900 outline-none"
            />
          </div>
          <textarea
            value={draft.overview}
            onChange={(event) => setDraft((current) => ({ ...current, overview: event.target.value }))}
            rows={5}
            placeholder="Describe the trip in one calm, useful planning paragraph."
            className="w-full rounded-[20px] border border-slate-200/80 bg-ivory-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none"
          />
          <input
            value={draft.highlights.join(", ")}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                highlights: event.target.value.split(",").map((item) => item.trim()).filter(Boolean),
              }))
            }
            placeholder="Highlights, comma separated"
            className="w-full rounded-[20px] border border-slate-200/80 bg-ivory-50 px-4 py-3 text-sm text-slate-900 outline-none"
          />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Saving..." : mode === "create" ? "Create trip" : "Save trip"}
            </Button>
            {mode === "edit" ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setMode("create");
                  setSelectedTripId(null);
                  setDraft(defaultDraft);
                }}
              >
                Start a new trip
              </Button>
            ) : null}
          </div>
          {message ? <p className="text-sm text-rose-600">{message}</p> : null}
        </form>
      </div>
    </div>
  );
}
