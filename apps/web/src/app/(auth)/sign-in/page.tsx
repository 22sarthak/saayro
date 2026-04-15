import { Badge, Card } from "@saayro/ui";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button-link";
import { StatePanel } from "@/components/ui/state-panel";

export default function SignInPage() {
  return (
    <>
      <StatePanel
        eyebrow="Sign in"
        title="Re-enter the trip with context intact."
        description="Choose your sign-in path. This is a visual shell only for now, so every action keeps you inside the product preview."
        tone="buddy"
        actions={
          <>
            <ButtonLink href="/app" variant="primary">
              Continue to dashboard
            </ButtonLink>
            <ButtonLink href="/auth/otp" variant="secondary">
              Preview OTP flow
            </ButtonLink>
          </>
        }
      >
        <div className="flex flex-wrap gap-3">
          <Badge>Google-first</Badge>
          <Badge>Mobile + OTP</Badge>
          <Badge>Mock mode</Badge>
        </div>
      </StatePanel>
      <Card className="space-y-5 rounded-[30px]">
        <div className="rounded-[24px] bg-white px-5 py-5 shadow-soft">
          <p className="text-sm font-semibold text-slate-900">Continue with Google</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Fastest path back into recent trips, connected states, and saved places.</p>
        </div>
        <div className="rounded-[24px] bg-ivory-50 px-5 py-5">
          <p className="text-sm font-semibold text-slate-900">Continue with mobile number</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Use OTP when typing an email feels like extra travel admin.</p>
        </div>
        <div className="rounded-[24px] bg-slate-950 px-5 py-5 text-white">
          <p className="text-xs uppercase tracking-[0.24em] text-white/65">Privacy posture</p>
          <p className="mt-2 text-sm leading-6 text-white/85">No live auth is connected yet. These surfaces exist to set tone, hierarchy, and future flow shape.</p>
        </div>
        <p className="text-sm text-slate-500">
          New here? <Link href="/sign-up" className="text-slate-900 underline decoration-slate-300 underline-offset-4">Create a preview account shell</Link>
        </p>
      </Card>
    </>
  );
}
