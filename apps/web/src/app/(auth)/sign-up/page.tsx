import { Badge, Card } from "@saayro/ui";
import { ButtonLink } from "@/components/ui/button-link";
import { StatePanel } from "@/components/ui/state-panel";

export default function SignUpPage() {
  return (
    <>
      <StatePanel
        eyebrow="Create account"
        title="Start with a calmer shell, not a cluttered funnel."
        description="The sign-up surface should sell the product mood immediately: planning clarity, practical Buddy guidance, and portable outputs."
        tone="connected"
        actions={
          <>
            <ButtonLink href="/app" variant="primary">
              Open the dashboard preview
            </ButtonLink>
            <ButtonLink href="/sign-in" variant="secondary">
              Already have a shell?
            </ButtonLink>
          </>
        }
      >
        <div className="flex flex-wrap gap-3">
          <Badge>Planning</Badge>
          <Badge>Buddy</Badge>
          <Badge>Exports</Badge>
        </div>
      </StatePanel>
      <Card className="space-y-5 rounded-[30px]">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] bg-sky-100 p-5">
            <p className="text-sm font-semibold text-slate-900">Google account shell</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">Best for connected travel previews and a faster route into recent trips later.</p>
          </div>
          <div className="rounded-[24px] bg-violet-100 p-5">
            <p className="text-sm font-semibold text-slate-900">Mobile OTP shell</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">A lighter entry path for mobile-first travelers and rapid access moments.</p>
          </div>
        </div>
        <div className="rounded-[24px] bg-amber-100 p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">What you get next</p>
          <p className="mt-2 text-sm leading-7 text-slate-700">
            A discovery dashboard, a fully mock-driven trip hub, a Buddy route, and saved/profile shells that mirror the real product direction.
          </p>
        </div>
      </Card>
    </>
  );
}
