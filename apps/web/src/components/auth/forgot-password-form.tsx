"use client";

import { Button } from "@saayro/ui";
import { useState } from "react";
import { requestPasswordReset, resetPassword } from "@/lib/auth-client";

export function ForgotPasswordForm({ token }: { token?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const result = token ? await resetPassword(token, password) : await requestPasswordReset(email);
      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not continue.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="rounded-[24px] border border-slate-200/70 bg-white p-5" onSubmit={handleSubmit}>
      <p className="text-sm font-semibold text-slate-900">{token ? "Reset password" : "Forgot password"}</p>
      <div className="mt-4 grid gap-3">
        {token ? (
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="New password"
            type="password"
            className="w-full rounded-2xl border border-slate-200/80 bg-ivory-50 px-4 py-3 text-sm text-slate-900 outline-none"
          />
        ) : (
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            type="email"
            className="w-full rounded-2xl border border-slate-200/80 bg-ivory-50 px-4 py-3 text-sm text-slate-900 outline-none"
          />
        )}
      </div>
      <div className="mt-4">
        <Button variant="secondary" type="submit" disabled={pending}>
          {pending ? "Working..." : token ? "Save new password" : "Send reset email"}
        </Button>
      </div>
      {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
    </form>
  );
}
