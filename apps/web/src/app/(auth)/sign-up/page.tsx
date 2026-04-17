"use client";

import { Badge, Card } from "@saayro/ui";
import Link from "next/link";
import { EmailAuthForm } from "@/components/auth/email-auth-form";
import { GoogleSignInAction } from "@/components/auth/google-sign-in-action";
import { StatePanel } from "@/components/ui/state-panel";

export default function SignUpPage() {
  return (
    <>
      <StatePanel
        eyebrow="Create account"
        title="Start with a calmer shell, not a cluttered funnel."
        description="Open Saayro with a real Google sign-in path, then keep OTP waiting in a provider-ready lane for later activation."
        tone="connected"
        actions={
          <>
            <GoogleSignInAction label="Create account with Google" intent="sign_up" />
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
            <p className="text-sm font-semibold text-slate-900">Google account</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">Best for reopening trips, connected travel, and a calmer return into the dashboard.</p>
          </div>
          <div className="rounded-[24px] bg-violet-100 p-5">
            <p className="text-sm font-semibold text-slate-900">Mobile OTP path</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">Provider-ready and structured correctly, with live delivery still intentionally off by default.</p>
          </div>
        </div>
        <div className="rounded-[24px] bg-amber-100 p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">What you get next</p>
          <p className="mt-2 text-sm leading-7 text-slate-700">
            A real Saayro session, a required first-run profile confirmation step, and a trip-first workspace that no longer dead-ends when you have not created a trip yet.
          </p>
        </div>
        <EmailAuthForm mode="sign-up" />
        <p className="text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-slate-900 underline decoration-slate-300 underline-offset-4">
            Sign in
          </Link>
        </p>
      </Card>
    </>
  );
}
