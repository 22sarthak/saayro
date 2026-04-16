"use client";

import { Badge, Card } from "@saayro/ui";
import Link from "next/link";
import { GoogleSignInAction } from "@/components/auth/google-sign-in-action";
import { StatePanel } from "@/components/ui/state-panel";

export default function SignInPage() {
  return (
    <>
      <StatePanel
        eyebrow="Sign in"
        title="Re-enter the trip with context intact."
        description="Choose your sign-in path. Google is live in this step, and OTP is now wired as a provider-ready path for later activation."
        tone="buddy"
        actions={
          <>
            <GoogleSignInAction label="Continue with Google" />
          </>
        }
      >
        <div className="flex flex-wrap gap-3">
          <Badge>Google-first</Badge>
          <Badge>Mobile + OTP</Badge>
          <Badge>Live session</Badge>
        </div>
      </StatePanel>
      <Card className="space-y-5 rounded-[30px]">
        <div className="rounded-[24px] bg-white px-5 py-5 shadow-soft">
          <p className="text-sm font-semibold text-slate-900">Continue with Google</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Fastest path back into recent trips, connected states, and saved places. This path is now live.</p>
        </div>
        <div className="rounded-[24px] bg-ivory-50 px-5 py-5">
          <p className="text-sm font-semibold text-slate-900">Continue with mobile number</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Use OTP when typing an email feels like extra travel admin. The provider seam is ready even if delivery is not live yet.</p>
          <div className="mt-4">
            <Link href="/auth/otp" className="text-sm font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4">
              Open OTP sign-in
            </Link>
          </div>
        </div>
        <div className="rounded-[24px] bg-slate-950 px-5 py-5 text-white">
          <p className="text-xs uppercase tracking-[0.24em] text-white/65">Privacy posture</p>
          <p className="mt-2 text-sm leading-6 text-white/85">Google sign-in now issues a real Saayro session. OTP remains intentionally provider-ready until a live delivery service is switched on.</p>
        </div>
        <p className="text-sm text-slate-500">
          New here? <Link href="/sign-up" className="text-slate-900 underline decoration-slate-300 underline-offset-4">Create your Saayro account</Link>
        </p>
      </Card>
    </>
  );
}
