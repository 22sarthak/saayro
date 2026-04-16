import { getSavedScenario } from "@saayro/mock-data";
import { createPlaceHandoffTarget, createRouteHandoffTarget, resolveMapHandoff } from "@saayro/types";
import { Badge, SectionHeader } from "@saayro/ui";
import { ButtonLink } from "@/components/ui/button-link";
import { StatePanel } from "@/components/ui/state-panel";
import { getProfileData } from "@/lib/mock-selectors";

export default function SavedPage() {
  const savedScenario = getSavedScenario("populated");
  const emptyState = getSavedScenario("empty");
  const profile = getProfileData();

  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="section-shell space-y-5">
        <SectionHeader
          title="Saved places and items"
          description="A curated travel shelf for the places and anchors worth keeping close while the trip is still taking shape."
        />
        {savedScenario.sections.map((section) => (
          <div key={section.id} className="space-y-4">
            <SectionHeader title={section.title} description={section.description} />
            <div className="grid gap-4 md:grid-cols-2">
              {section.items.map((item) => (
                <div key={item.id} className="rounded-[26px] border border-slate-200/70 bg-white p-5 shadow-soft">
                  {(() => {
                    const handoff = item.routeStop?.routePreview
                      ? resolveMapHandoff(
                          createRouteHandoffTarget(item.routeStop.routePreview),
                          profile.preferences.preferredMapsApp,
                          item.routeStop.routePreview.mapsAppOptions
                        )
                      : resolveMapHandoff(
                          createPlaceHandoffTarget({
                            title: item.title,
                            city: item.city,
                            subtitle: item.subtitle
                          }),
                          profile.preferences.preferredMapsApp,
                          ["google-maps", "apple-maps"]
                        );

                    return (
                      <>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{item.category}</p>
                  <h2 className="mt-3 text-xl font-semibold text-slate-900">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.subtitle}</p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <Badge>{item.city}</Badge>
                    <span className="text-sm text-slate-500">Ready to pull back into the trip</span>
                  </div>
                  <div className="mt-4">
                    {handoff.externalUrl ? (
                      <ButtonLink
                        href={handoff.externalUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        variant="secondary"
                      >
                        {handoff.fallbackLabel}
                      </ButtonLink>
                    ) : (
                      <div className="rounded-[18px] bg-ivory-50 px-4 py-3 text-sm text-slate-600">
                        Copy destination: {handoff.destinationLabel}
                      </div>
                    )}
                  </div>
                      </>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-5">
        <StatePanel
          eyebrow="Empty-state preview"
          title={emptyState.sections.length === 0 ? "Nothing saved yet should still feel intentional." : "Saved items ready"}
          description="Fresh accounts should see travel curation and direction instead of an abandoned-looking page."
          tone="discovery"
        />
        <StatePanel
          eyebrow="Why this matters"
          title="Saved should help shape the next travel decision."
          description="This page works best when saved meals, stays, and cultural anchors feel ready to move back into the itinerary."
          tone="discovery"
        >
          <div className="grid gap-3">
            <div className="rounded-[22px] bg-amber-100 p-4 text-sm leading-6 text-slate-700">Save standout meals you want to revisit while refining the day.</div>
            <div className="rounded-[22px] bg-white p-4 text-sm leading-6 text-slate-700">Keep transport and stay anchors nearby without mixing them into every browsing decision.</div>
          </div>
        </StatePanel>
      </div>
    </div>
  );
}
