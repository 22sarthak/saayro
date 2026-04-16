import { Badge, ConnectedSourceTile, ExportTile, SectionHeader } from "@saayro/ui";
import { StatePanel } from "@/components/ui/state-panel";
import { getProfileData } from "@/lib/mock-selectors";

export default function ProfilePage() {
  const profile = getProfileData();

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
      <div className="space-y-5">
        <section className="section-shell space-y-4">
          <SectionHeader title={profile.userName} description={`Home base: ${profile.homeBase}`} />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] bg-sky-100 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Preferred maps</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{profile.preferences.preferredMapsApp}</p>
            </div>
            <div className="rounded-[24px] bg-mint-100 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Travel pace</p>
              <p className="mt-2 text-sm font-semibold capitalize text-slate-900">{profile.preferences.travelPace}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.preferences.interests.map((interest) => (
              <Badge key={interest}>{interest}</Badge>
            ))}
          </div>
        </section>

        <section className="section-shell space-y-4">
          <SectionHeader title="Connected accounts" description="Profile needs to express both confidence and partial connection states clearly." />
          <div className="grid gap-3">
            {profile.connectedAccounts.map((account) => (
              <ConnectedSourceTile key={account.id} account={account} itemCount={2} />
            ))}
          </div>
        </section>
      </div>
      <div className="space-y-5">
        <StatePanel
          eyebrow="Partial connected state"
          title={profile.partialConnection.title}
          description="A low-confidence connected item should feel reviewable and fixable, not alarming."
          tone="danger"
        >
          <div className="rounded-[22px] bg-white/70 p-4 text-sm leading-6 text-slate-700">
            {profile.partialConnection.metadata.reason}
          </div>
        </StatePanel>
        <section className="section-shell space-y-4">
          <SectionHeader title="Portable outputs" description="Export readiness belongs in profile too because travelers often need sharable outputs beyond a single trip view." />
          <div className="grid gap-3">
            {profile.exportPacks.map((pack) => (
              <ExportTile key={pack.id} pack={pack} />
            ))}
          </div>
        </section>
        <StatePanel
          eyebrow="Trust and privacy"
          title="Keep scope clear, calm, and reversible."
          description="Profile should show how permissions and connected account confidence will be managed, without pretending any live linkage already exists."
          tone="raised"
        />
      </div>
    </div>
  );
}
