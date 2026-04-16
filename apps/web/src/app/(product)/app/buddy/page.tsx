import { getBuddyScenario } from "@saayro/mock-data";
import { Badge, Button, Card, SectionHeader } from "@saayro/ui";
import { StatePanel } from "@/components/ui/state-panel";
import { getBuddyThread, getFeaturedTrip } from "@/lib/mock-selectors";

interface BuddyMessageView {
  id: string;
  role: string;
  content: string;
  actions?: Array<{ id: string; label: string }> | null;
  response?: {
    dev_metadata?: {
      provider: string;
      model: string;
      fallback_used: boolean;
    } | null;
  } | null;
}

export default function BuddyPage() {
  const trip = getFeaturedTrip();
  const messages = getBuddyThread() as BuddyMessageView[];
  const emptyPrompts = getBuddyScenario("empty").promptOptions;

  return (
    <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="section-shell space-y-5">
        <SectionHeader
          title="Buddy"
          description="A trip-aware conversation surface for pacing, route, and handoff decisions rather than a generic endless chat."
        />
        <div className="grid gap-4">
          {messages.map((message) => (
            <Card
              key={message.id}
              surface={message.role === "buddy" ? "buddy" : "raised"}
              className={message.role === "user" ? "ml-auto max-w-[85%]" : "mr-auto max-w-[90%]"}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{message.role === "buddy" ? "Buddy" : "You"}</p>
                {process.env.NODE_ENV === "development" && message.response?.dev_metadata ? (
                  <span className="rounded-full border border-violet-200 bg-violet-100 px-3 py-1 text-[11px] font-medium text-violet-700">
                    {message.response.dev_metadata.provider} / {message.response.dev_metadata.model}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-700">{message.content}</p>
              {message.actions?.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {message.actions.map((action) => (
                    <Button key={action.id} variant="secondary">
                      {action.label}
                    </Button>
                  ))}
                </div>
              ) : null}
            </Card>
          ))}
        </div>
        <div className="rounded-[24px] border border-slate-200/70 bg-white p-4">
          <p className="text-sm font-semibold text-slate-900">Next move</p>
          <div className="mt-4 rounded-[20px] bg-ivory-50 p-4 text-sm text-slate-500">Ask about pacing, Connected Travel review, route handoff, or the right Export Pack for this trip.</div>
        </div>
      </div>
      <div className="space-y-5">
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
        <StatePanel
          eyebrow="Empty-state prompts"
          title="When the thread is quiet, the shell should still coach the next move."
          description="These are first-message suggestions for the quiet state before the user types anything."
          tone="discovery"
        >
          <div className="grid gap-3">
            {emptyPrompts.map((prompt) => (
              <div key={prompt.id} className="rounded-[22px] bg-amber-100 p-4 text-sm leading-6 text-slate-700">
                {prompt.label}
              </div>
            ))}
          </div>
        </StatePanel>
      </div>
    </div>
  );
}
