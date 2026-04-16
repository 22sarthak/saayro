import { Badge, Button, ConnectedSourceTile, ExportTile, SectionHeader } from "@saayro/ui";
import { ButtonLink } from "@/components/ui/button-link";
import { StatePanel } from "@/components/ui/state-panel";
import {
  getDashboardLoadingCard,
  getFeaturedTrip,
  getNoTripState,
  getRecentTrips,
  quickActions
} from "@/lib/mock-selectors";

export default function AppDashboardPage() {
  const featuredTrip = getFeaturedTrip();
  const recentTrips = getRecentTrips();
  const noTripState = getNoTripState();
  const loadingExport = getDashboardLoadingCard();

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
              {quickActions.map((action) => (
                <ButtonLink key={action.href} href={action.href} variant={action.tone === "buddy" ? "primary" : "secondary"}>
                  {action.label}
                </ButtonLink>
              ))}
            </>
          }
        >
          <div className="grid gap-4 md:grid-cols-3">
            {quickActions.map((action) => (
              <div key={action.label} className="rounded-[22px] bg-ivory-50 p-4">
                <p className="text-sm font-semibold text-slate-900">{action.label}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{action.description}</p>
              </div>
            ))}
          </div>
        </StatePanel>
        <div className="section-shell space-y-4">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Active trip</p>
          <h2 className="editorial-title text-4xl text-slate-950">{featuredTrip.title}</h2>
          <p className="text-sm leading-7 text-slate-600">{featuredTrip.overview}</p>
          <div className="flex flex-wrap gap-2">
            {featuredTrip.highlights.map((highlight) => (
              <Badge key={highlight}>{highlight}</Badge>
            ))}
          </div>
          <ButtonLink href={`/app/trips/${featuredTrip.id}`} variant="primary">
            Review Jaipur trip
          </ButtonLink>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="section-shell space-y-4">
          <SectionHeader title="Recent trips" description="Populated state for frequent-return travel planning." />
          <div className="grid gap-4">
            {recentTrips.map((trip) => (
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
            actions={<Button variant="secondary">Start a first India trip</Button>}
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
            {featuredTrip.connectedAccounts.map((account) => (
              <ConnectedSourceTile key={account.id} account={account} itemCount={featuredTrip.connectedItems.length} />
            ))}
          </div>
        </div>
        <div className="section-shell space-y-4">
          <SectionHeader title="Export status" description="Portable outputs stay visible because Saayro is open-ecosystem by design." />
          <div className="grid gap-3 md:grid-cols-2">
            {featuredTrip.exports.map((pack) => (
              <ExportTile key={pack.id} pack={pack} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
