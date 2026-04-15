import { Badge, Card } from "@saayro/ui";
import { ButtonLink } from "@/components/ui/button-link";
import { StatePanel } from "@/components/ui/state-panel";

const otpStates = [
  {
    label: "Normal",
    tone: "bg-white",
    body: "A clean verification moment with one field, clear timing, and low anxiety."
  },
  {
    label: "Resend pending",
    tone: "bg-sky-100",
    body: "The shell should show time passing clearly instead of leaving users uncertain."
  },
  {
    label: "Invalid code",
    tone: "bg-rose-100",
    body: "Recovery copy stays calm, practical, and free of blame."
  }
];

export default function OtpPage() {
  return (
    <>
      <StatePanel
        eyebrow="OTP preview"
        title="A verification flow that feels steady under pressure."
        description="No real OTP is sent here. This route exists to shape the trust, pacing, and fallback behavior of the future auth flow."
        tone="discovery"
        actions={
          <>
            <ButtonLink href="/app" variant="primary">
              Enter dashboard preview
            </ButtonLink>
            <ButtonLink href="/sign-in" variant="secondary">
              Back to sign in
            </ButtonLink>
          </>
        }
      />
      <Card className="space-y-5 rounded-[30px]">
        <div className="rounded-[24px] border border-slate-200/70 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900">Enter the 6-digit code</p>
            <Badge>02:14 left</Badge>
          </div>
          <div className="mt-4 grid grid-cols-6 gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-12 rounded-2xl border border-slate-200/80 bg-ivory-50" />
            ))}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {otpStates.map((state) => (
            <div key={state.label} className={`rounded-[24px] p-5 ${state.tone}`}>
              <p className="text-sm font-semibold text-slate-900">{state.label}</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{state.body}</p>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
