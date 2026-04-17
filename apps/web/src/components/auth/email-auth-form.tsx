"use client";

import { Button } from "@saayro/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/components/auth/session-provider";
import { signInWithEmailWeb, signUpWithEmailWeb } from "@/lib/auth-client";

function buildAuthGuidance(message: string): { label: string; href: string } | null {
  const normalized = message.toLowerCase();
  if (normalized.includes("reset your password")) {
    return { label: "Reset password", href: "/auth/forgot-password" };
  }
  if (normalized.includes("please sign in") || normalized.includes("continue signing in instead")) {
    return { label: "Open sign in", href: "/sign-in" };
  }
  if (normalized.includes("verify")) {
    return { label: "Open onboarding", href: "/app/onboarding" };
  }
  return null;
}

export function EmailAuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const { setSession } = useSession();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const guidance = message ? buildAuthGuidance(message) : null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const result =
        mode === "sign-up"
          ? await signUpWithEmailWeb({ email, password, fullName })
          : await signInWithEmailWeb({ email, password });
      setSession(result.session);
      router.replace(result.session.needsOnboarding ? "/app/onboarding" : "/app");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not continue with your Saayro account.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="rounded-[24px] border border-slate-200/70 bg-white p-5" onSubmit={handleSubmit}>
      <p className="text-sm font-semibold text-slate-900">{mode === "sign-up" ? "Create Saayro account" : "Sign in with Saayro account"}</p>
      <div className="mt-4 grid gap-3">
        {mode === "sign-up" ? (
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Full name"
            className="w-full rounded-2xl border border-slate-200/80 bg-ivory-50 px-4 py-3 text-sm text-slate-900 outline-none"
          />
        ) : null}
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          type="email"
          className="w-full rounded-2xl border border-slate-200/80 bg-ivory-50 px-4 py-3 text-sm text-slate-900 outline-none"
        />
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          type="password"
          className="w-full rounded-2xl border border-slate-200/80 bg-ivory-50 px-4 py-3 text-sm text-slate-900 outline-none"
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="secondary" type="submit" disabled={pending}>
          {pending ? "Working..." : mode === "sign-up" ? "Create with email" : "Continue with email"}
        </Button>
      </div>
      {message ? <p className="mt-3 text-sm text-rose-600">{message}</p> : null}
      {guidance ? (
        <p className="mt-2 text-sm text-slate-600">
          Next step:{" "}
          <Link href={guidance.href} className="text-slate-900 underline decoration-slate-300 underline-offset-4">
            {guidance.label}
          </Link>
        </p>
      ) : null}
    </form>
  );
}
