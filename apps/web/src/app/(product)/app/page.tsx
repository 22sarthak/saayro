import { Badge, Button, ConnectedSourceTile, ExportTile, SectionHeader } from "@saayro/ui";
import { ButtonLink } from "@/components/ui/button-link";
import { StatePanel } from "@/components/ui/state-panel";
import { fetchServerSession } from "@/lib/auth-server";
import {
  getDashboardLoadingCard,
  getFeaturedTrip,
  getNoTripState,
  getRecentTrips,
  quickActions
} from "@/lib/mock-selectors";
import { fetchServerFeaturedTripData } from "@/lib/trip-server";

export default async function AppDashboardPage() {
  const session = await fetchServerSession();
  const liveTripData = session?.authenticated ? await fetchServerFeaturedTripData() : null;
  const showLiveEmptyState = Boolean(session?.authenticated && liveTripData && !liveTripData.featuredTrip);
  const featuredTrip = !showLiveEmptyState ? liveTripData?.featuredTrip ?? getFeaturedTrip() : null;
  const recentTrips = !showLiveEmptyState
    ? liveTripData?.recentTrips.length
      ? liveTripData.recentTrips
      : getRecentTrips()
    : [];
  const noTripState = getNoTripState();
  const loadingExport = getDashboardLoadingCard();
  const tripHubHref = liveTripData?.featuredTrip ? `/app/trips/${liveTripData.featuredTrip.id}` : "/app/trips";
  const actions = quickActions.map((action) =>
    action.id === "open-trip-hub" ? { ...action, href: tripHubHref } : action,
  );
  const hasLiveTrips = Boolean(liveTripData?.featuredTrip);
  const connectedAccounts = featuredTrip ? (hasLiveTrips ? liveTripData!.featuredTrip!.connectedAccounts : featuredTrip.connectedAccounts) : [];
  const connectedItems = featuredTrip ? (hasLiveTrips ? liveTripData!.featuredTrip!.connectedItems : featuredTrip.connectedItems) : [];
  const exportPacks = featuredTrip ? (hasLiveTrips ? liveTripData!.featuredTrip!.exports : featuredTrip.exports) : [];

  return (
    <div className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <StatePanel
          eyebrow="Discovery home"
          title="Start from the trip that is already moving."
          description="The dashboard should tell you what matters now: the active trip, what needs review, and where to go next."
          tone="raised"
          actions={
            <>
              {actions.map((action) => (
                <ButtonLink key={action.id} href={action.href ?? "/app"} variant={action.tone === "buddy" ? "primary" : "secondary"}>
                  {action.label}
                </ButtonLink>
              ))}
            </>
          }
        >
          <div className="grid gap-4 md:grid-cols-3">
            {actions.map((action) => (
              <div key={action.label} className="rounded-[22px] bg-ivory-50 p-4">
                <p className="text-sm font-semibold text-slate-900">{action.label}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{action.description}</p>
              </div>
            ))}
          </div>
        </StatePanel>
        <div className="section-shell space-y-4">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Active trip</p>
          {featuredTrip ? (
            <>
              <h2 className="editorial-title text-4xl text-slate-950">{featuredTrip.title}</h2>
              <p className="text-sm leading-7 text-slate-600">{featuredTrip.overview}</p>
              <div className="flex flex-wrap gap-2">
                {featuredTrip.highlights.map((highlight) => (
                  <Badge key={highlight}>{highlight}</Badge>
                ))}
              </div>
              <ButtonLink href={tripHubHref} variant="primary">
                Open Trip Hub
              </ButtonLink>
            </>
          ) : (
            <>
              <h2 className="editorial-title text-4xl text-slate-950">No active trip yet</h2>
              <p className="text-sm leading-7 text-slate-600">
                The signed-in workspace is live, but there is no persisted trip yet. Once one exists, this rail becomes the real trip hub entry.
              </p>
              <ButtonLink href="/app/trips?create=1" variant="primary">
                Open Trip Hub
              </ButtonLink>
            </>
          )}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="section-shell space-y-4">
          <SectionHeader title="Recent trips" description="Populated state for frequent-return travel planning." />
          <div className="grid gap-4">
            {recentTrips.length > 0
              ? recentTrips.map((trip) => (
                  <div key={trip.id} className="flex flex-col gap-4 rounded-[24px] border border-slate-200/70 bg-white p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{trip.title}</p>
                      <p className="text-sm text-slate-600">{trip.destinationLabel}</p>
                      <p className="mt-2 text-sm text-slate-500">
                        {trip.startDate} to {trip.endDate}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {trip.highlights.map((highlight) => (
                        <Badge key={highlight}>{highlight}</Badge>
                      ))}
                    </div>
                    <ButtonLink href={`/app/trips/${trip.id}`} variant="secondary">
                      Open trip
                    </ButtonLink>
                  </div>
                ))
              : noTripState.map((trip) => (
                  <div key={trip.id} className="rounded-[24px] border border-dashed border-slate-200/80 bg-ivory-50 p-4">
                    <p className="text-lg font-semibold text-slate-900">{trip.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Signed-in users with no persisted trips stay on a calm empty state instead of a broken planner shell.
                    </p>
                  </div>
                ))}
          </div>
        </div>

        <div className="space-y-5">
          <StatePanel
            eyebrow="Fresh account state"
            title={noTripState.length === 0 ? "No trips yet, and that should still feel useful." : "Trips loaded"}
            description="A first-run account should still point toward a useful next move instead of feeling empty."
            tone="discovery"
            actions={<ButtonLink href="/app/trips?create=1" variant="secondary">Start first trip</ButtonLink>}
          />
          <StatePanel
            eyebrow="Portable output"
            title="Exports warming into view"
            description={loadingExport.description}
            tone="connected"
          >
            <ExportTile pack={loadingExport} />
          </StatePanel>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="section-shell space-y-4">
          <SectionHeader title="Connected travel" description="Partial sync state preview for the web dashboard." />
          <div className="grid gap-3">
            {connectedAccounts.map((account) => (
              <ConnectedSourceTile key={account.id} account={account} itemCount={connectedItems.length} />
            ))}
          </div>
        </div>
        <div className="section-shell space-y-4">
          <SectionHeader title="Export status" description="Portable outputs stay visible because Saayro is open-ecosystem by design." />
          <div className="grid gap-3 md:grid-cols-2">
            {exportPacks.map((pack) => (
              <ExportTile key={pack.id} pack={pack} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
