"use client";

import Link from "next/link";
import { Card } from "@saayro/ui";
import { useSearchParams } from "next/navigation";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { StatePanel } from "@/components/ui/state-panel";

export default function ForgotPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  return (
    <>
      <StatePanel
        eyebrow={token ? "Reset password" : "Forgot password"}
        title={token ? "Set a fresh Saayro password." : "Recover your Saayro account without guesswork."}
        description="Reset stays truthful in this step: the request goes into the local outbox, and the link can be reviewed without pretending a live mail provider is already wired."
        tone="discovery"
      />
      <Card className="space-y-5 rounded-[30px]">
        {token ? <ForgotPasswordForm token={token} /> : <ForgotPasswordForm />}
        <p className="text-sm text-slate-500">
          Back to <Link href="/sign-in" className="text-slate-900 underline decoration-slate-300 underline-offset-4">sign in</Link>
        </p>
      </Card>
    </>
  );
}
