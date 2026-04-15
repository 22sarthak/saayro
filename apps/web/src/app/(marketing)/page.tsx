import { Badge, Card, SectionHeader } from "@saayro/ui";
import { SaayroLogo } from "@/components/brand/saayro-logo";
import { ButtonLink } from "@/components/ui/button-link";

const featureCards = [
  {
    title: "Trip planning that actually feels composed",
    description: "Turn a messy travel idea into a route-aware plan with calmer pacing, stronger sequencing, and better handoff moments.",
    tone: "bg-sky-100"
  },
  {
    title: "Buddy that guides instead of performing",
    description: "Saayro's Buddy stays inside the trip context, gives practical suggestions, and helps you move from intent to action.",
    tone: "bg-violet-100"
  },
  {
    title: "Portable by design",
    description: "Export, share, and hand routes off cleanly instead of getting trapped inside one closed travel workflow.",
    tone: "bg-amber-100"
  }
];

export default function LandingPage() {
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
              Start the shell
            </ButtonLink>
          </div>
        </header>

        <section className="atlas-grid overflow-hidden rounded-[36px] border border-slate-200/70 bg-hero-wash px-6 py-10 shadow-float lg:px-10 lg:py-14">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-6">
              <Badge className="w-fit bg-white/75">Premium pan-India AI travel companion</Badge>
              <div className="space-y-4">
                <h1 className="editorial-title balanced-copy max-w-4xl text-5xl text-slate-950 lg:text-7xl">
                  Your trip&apos;s smarter half, designed for real movement.
                </h1>
                <p className="balanced-copy max-w-2xl text-lg leading-8 text-slate-700">
                  Saayro brings planning, itinerary clarity, Buddy guidance, and portable handoffs into one bright editorial shell built for travel-first thinking.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <ButtonLink href="/sign-up" variant="primary">
                  Create your shell account
                </ButtonLink>
                <ButtonLink href="/sign-in" variant="secondary">
                  Preview sign-in
                </ButtonLink>
              </div>
            </div>
            <Card surface="raised" className="space-y-6 rounded-[32px]">
              <SectionHeader
                title="Built for the trip itself"
                description="Not a generic chatbot page. Not a booking funnel in disguise. A calmer operating layer for planning, deciding, and moving."
              />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] bg-sky-100 p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Maps and movement</p>
                  <p className="mt-3 text-sm leading-6 text-slate-700">Sky tones cue routes, handoffs, timing, and in-motion decision support.</p>
                </div>
                <div className="rounded-[24px] bg-violet-100 p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Buddy intelligence</p>
                  <p className="mt-3 text-sm leading-6 text-slate-700">Violet stays reserved for suggestions, reasoning, and guided next steps.</p>
                </div>
                <div className="rounded-[24px] bg-mint-100 p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Connected confidence</p>
                  <p className="mt-3 text-sm leading-6 text-slate-700">Mint signals grounded sync states, success, and calmer reassurance.</p>
                </div>
                <div className="rounded-[24px] bg-amber-100 p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Discovery warmth</p>
                  <p className="mt-3 text-sm leading-6 text-slate-700">Amber marks food, culture, and saved moments worth keeping in the plan.</p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="section-shell space-y-4">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Approved direction</p>
            <h2 className="editorial-title text-4xl text-slate-950">Ivory Atlas with subtle hues.</h2>
            <p className="text-sm leading-7 text-slate-600">
              Bright surfaces, soft shadows, and meaningful accent mapping keep the interface premium, readable, and unmistakably travel-first.
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
