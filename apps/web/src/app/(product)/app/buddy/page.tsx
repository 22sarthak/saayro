import { getBuddyScenario } from "@saayro/mock-data";
import { Badge, SectionHeader } from "@saayro/ui";
import Link from "next/link";
import { BuddyContextHeader } from "@/components/buddy/buddy-context-header";
import { BuddyThreadPanel } from "@/components/buddy/buddy-thread-panel";
import { ButtonLink } from "@/components/ui/button-link";
import { StatePanel } from "@/components/ui/state-panel";
import { fetchServerSession } from "@/lib/auth-server";
import { normalizeMockBuddyMessage } from "@/lib/buddy-client";
import { getBuddyThread, getFeaturedTrip } from "@/lib/mock-selectors";
import { fetchServerTripBundle, fetchServerTripSummaries } from "@/lib/trip-server";

type BuddySearchParams = { mode?: string | string[]; trip?: string | string[]; prompt?: string | string[] };

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export default async function BuddyPage({ searchParams }: { searchParams: Promise<BuddySearchParams> }) {
  const resolvedParams = await searchParams;
  const requestedMode = firstParam(resolvedParams.mode);
  const requestedTripId = firstParam(resolvedParams.trip);
  const session = await fetchServerSession();
  const fallbackTrip = getFeaturedTrip();
  const fallbackMessages = getBuddyThread().map(normalizeMockBuddyMessage);
  const emptyPrompts = getBuddyScenario("empty").promptOptions;
  const liveTripSummaries = session?.authenticated ? await fetchServerTripSummaries() : null;
  const forcePretrip = requestedMode === "new";
  const matchedRequestedTrip = requestedTripId
    ? liveTripSummaries?.find((summary) => summary.id === requestedTripId) ?? null
    : null;
  const selectedSummary = forcePretrip
    ? null
    : requestedTripId
      ? matchedRequestedTrip
      : liveTripSummaries?.[0] ?? null;
  const liveTripBundle = selectedSummary ? await fetchServerTripBundle(selectedSummary.id) : null;
  const liveTrip = liveTripBundle?.trip ?? null;
  const authenticated = Boolean(session?.authenticated);
  const mode = authenticated
    ? forcePretrip
      ? "no_trip"
      : liveTrip
        ? "live"
        : liveTripSummaries
          ? "no_trip"
          : "fallback"
    : "fallback";
  const trip = liveTrip ?? fallbackTrip;
  const contextHeaderMode = mode === "live" ? "trip" : mode === "no_trip" ? "new" : "fallback";

  return (
    <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="section-shell space-y-5">
        {authenticated ? (
          <BuddyContextHeader
            mode={contextHeaderMode}
            activeTripTitle={mode === "live" ? trip.title : null}
            activeTripId={mode === "live" ? trip.id : null}
            tripSummaries={liveTripSummaries ?? []}
          />
        ) : null}
        <SectionHeader
          title="Buddy"
          description="A trip-aware conversation surface for pacing, route, and handoff decisions rather than a generic endless chat."
        />
        {mode === "fallback" ? (
          <BuddyThreadPanel
            liveTarget={null}
            initialMessages={fallbackMessages}
            emptyPrompts={emptyPrompts}
            composerPlaceholder="Ask about pacing, Connected Travel review, route handoff, or the right Export Pack for this trip."
          />
        ) : (
          <BuddyThreadPanel
            liveTarget={mode === "live" ? { kind: "trip", tripId: trip.id } : { kind: "pretrip" }}
            initialMessages={[]}
            emptyPrompts={emptyPrompts}
            composerPlaceholder={
              mode === "live"
                ? "Ask about pacing, Connected Travel review, route handoff, or the right Export Pack for this trip."
                : "Ask Buddy to shape a destination, pace, or first version of the trip before anything is saved yet."
            }
          />
        )}
      </div>
      <div className="space-y-5">
        {mode === "no_trip" ? (
          <StatePanel
            eyebrow="Active context"
            title="Pre-trip planning mode"
            description="Buddy can help narrow a destination and shape the first plan before the trip exists. Once you create the trip, that planning thread moves with it."
            tone="buddy"
            actions={<ButtonLink href="/app/trips?create=1&source=buddy" variant="primary">Create trip from Buddy</ButtonLink>}
          />
        ) : (
          <StatePanel
            eyebrow="Active context"
            title={trip.title}
          description={`${trip.destinationCity}, ${trip.destinationRegion} · ${trip.startDate} to ${trip.endDate}`}
          tone="connected"
        >
          <div className="flex flex-wrap gap-2">
            {trip.highlights.map((highlight) => (
              <Badge key={highlight}>{highlight}</Badge>
            ))}
          </div>
          </StatePanel>
        )}
        <StatePanel
          eyebrow="Empty-state prompts"
          title="When the thread is quiet, the shell should still coach the next move."
          description="These are first-message suggestions for the quiet state before the user types anything."
          tone="discovery"
        >
          <div className="grid gap-3">
            {emptyPrompts.map((prompt) => (
              mode === "live" ? (
                <Link
                  key={prompt.id}
                  href={`/app/buddy?prompt=${encodeURIComponent(prompt.label)}`}
                  className="rounded-[22px] bg-amber-100 p-4 text-sm leading-6 text-slate-700 transition hover:bg-amber-200"
                >
                  {prompt.label}
                </Link>
              ) : (
                <div key={prompt.id} className="rounded-[22px] bg-amber-100 p-4 text-sm leading-6 text-slate-700">
                  {prompt.label}
                </div>
              )
            ))}
          </div>
        </StatePanel>
      </div>
    </div>
  );
}
