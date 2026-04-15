import { Badge, SectionHeader } from "@saayro/ui";
import { StatePanel } from "@/components/ui/state-panel";
import { getSavedCollection, getSavedEmptyCollection } from "@/lib/mock-selectors";

export default function SavedPage() {
  const savedItems = getSavedCollection();
  const emptyState = getSavedEmptyCollection();

  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="section-shell space-y-5">
        <SectionHeader
          title="Saved places and items"
          description="A discovery-like surface for the things worth keeping: meals, stays, culture moments, and connected travel anchors."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {savedItems.map((item) => (
            <div key={item.id} className="rounded-[26px] border border-slate-200/70 bg-white p-5 shadow-soft">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{item.category}</p>
              <h2 className="mt-3 text-xl font-semibold text-slate-900">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.subtitle}</p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <Badge>{item.city}</Badge>
                <span className="text-sm text-slate-500">Saved for later</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-5">
        <StatePanel
          eyebrow="Empty-state preview"
          title={emptyState.length === 0 ? "Nothing saved yet can still feel intentional." : "Saved items ready"}
          description="Fresh accounts should see guided curation instead of an abandoned-looking page."
          tone="discovery"
        />
        <StatePanel
          eyebrow="Discovery direction"
          title="Amber belongs here."
          description="Saved is where discovery, food warmth, and keepsake-worthy places should lean into the amber side of Ivory Atlas."
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

