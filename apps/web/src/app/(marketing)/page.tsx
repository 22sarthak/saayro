import { createRouteHandoffTarget, resolveMapHandoff } from "@saayro/types";
import { Badge, Card, ExportTile, RoutePreviewCard, SectionHeader, TimelineItem } from "@saayro/ui";
import { SaayroLogo } from "@/components/brand/saayro-logo";
import { ButtonLink } from "@/components/ui/button-link";
import { getBuddyThread, getFeaturedTrip } from "@/lib/mock-selectors";

const featureCards = [
  {
    title: "Plan with calmer travel logic",
    description: "Saayro turns a rough India trip idea into a route-aware plan with better pacing, sequencing, and fewer awkward jumps.",
    tone: "bg-sky-100"
  },
  {
    title: "Ask Buddy inside the trip",
    description: "Buddy stays anchored to destination, dates, and itinerary context, so suggestions feel like guidance instead of generic answers.",
    tone: "bg-violet-100"
  },
  {
    title: "Share, export, and hand off cleanly",
    description: "Routes, driver notes, hotel timing, and day plans stay portable so the trip can move outside the app without friction.",
    tone: "bg-amber-100"
  }
];

export default function LandingPage() {
  const featuredTrip = getFeaturedTrip();
  const buddyMessage = getBuddyThread().find((message) => message.role === "buddy");
  const firstDay = featuredTrip.itinerary[0];
  const firstRoute = featuredTrip.itinerary.flatMap((day) => day.stops).find((stop) => stop.routePreview)?.routePreview;
  const marketingHandoff = firstRoute
    ? resolveMapHandoff(createRouteHandoffTarget(firstRoute), featuredTrip.preferences.preferredMapsApp, firstRoute.mapsAppOptions)
    : null;

  return (
    <div className="px-4 py-6 lg:px-6">
      <div className="mx-auto flex max-w-[1480px] flex-col gap-6">
        <header className="surface-panel flex flex-col gap-4 rounded-[30px] px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <SaayroLogo />
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/sign-in" variant="ghost">
              Sign in
            </ButtonLink>
            <ButtonLink href="/sign-up" variant="primary">
              Start planning a trip
            </ButtonLink>
          </div>
        </header>

        <section className="atlas-grid overflow-hidden rounded-[36px] border border-slate-200/70 bg-hero-wash px-6 py-10 shadow-float lg:px-10 lg:py-14">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-6">
              <Badge className="w-fit bg-white/75">Premium pan-India AI travel companion</Badge>
              <div className="space-y-4">
                <h1 className="editorial-title balanced-copy max-w-4xl text-5xl text-slate-950 lg:text-7xl">
                  Plan, navigate, and carry a trip more clearly across India.
                </h1>
                <p className="balanced-copy max-w-2xl text-lg leading-8 text-slate-700">
                  Saayro is a premium pan-India AI travel companion that helps you shape an itinerary, ask Buddy for practical guidance, and hand routes or plans off when the real trip begins.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <ButtonLink href="/sign-up" variant="primary">
                  Start a Jaipur trip preview
                </ButtonLink>
                <ButtonLink href="/sign-in" variant="secondary">
                  Explore the signed-in shell
                </ButtonLink>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[22px] bg-white/70 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Plan with structure</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">Move from destination idea to a paced, day-by-day trip shell.</p>
                </div>
                <div className="rounded-[22px] bg-white/70 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Stay trip-aware</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">Buddy suggestions stay inside the itinerary instead of floating off as generic chat.</p>
                </div>
                <div className="rounded-[22px] bg-white/70 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Travel beyond the app</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">Map handoff, exports, and sharing are treated as core product value.</p>
                </div>
              </div>
            </div>
            <Card surface="raised" className="space-y-5 rounded-[32px]">
              <SectionHeader
                title="See the trip before you commit to it"
                description="A product preview belongs near the fold, so the first thing people understand is what Saayro helps them do."
              />
              <div className="grid gap-4">
                <div className="rounded-[26px] bg-sky-100 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Trip preview</p>
                      <h2 className="mt-2 editorial-title text-3xl text-slate-950">{featuredTrip.title}</h2>
                    </div>
                    <Badge>{featuredTrip.destinationCity}</Badge>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {firstDay?.stops.slice(0, 2).map((stop) => (
                      <TimelineItem key={stop.id} stop={stop} />
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
                  <div className="rounded-[24px] bg-violet-100 p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Buddy preview</p>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{buddyMessage?.content}</p>
                    {buddyMessage?.actions?.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {buddyMessage.actions.map((action) => (
                          <Badge key={action.id}>{action.label}</Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-4">
                    {firstRoute && marketingHandoff ? (
                      <RoutePreviewCard
                        route={firstRoute}
                        ctaLabel={marketingHandoff.fallbackLabel}
                        ctaHref={marketingHandoff.externalUrl}
                        fallbackLabel={`Copy destination: ${marketingHandoff.destinationLabel}`}
                      />
                    ) : null}
                    <ExportTile pack={featuredTrip.exports[0]!} />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="section-shell space-y-4">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Why Saayro works</p>
            <h2 className="editorial-title text-4xl text-slate-950">Travel-first clarity, not travel-tool clutter.</h2>
            <p className="text-sm leading-7 text-slate-600">
              The shell stays bright and editorial, but every block should answer a traveler question: what is my plan, what changed, what should I do next, and what can I hand off?
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {featureCards.map((card) => (
              <Card key={card.title} className={`space-y-4 rounded-[28px] ${card.tone}`}>
                <h3 className="editorial-title text-3xl text-slate-950">{card.title}</h3>
                <p className="text-sm leading-7 text-slate-700">{card.description}</p>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
