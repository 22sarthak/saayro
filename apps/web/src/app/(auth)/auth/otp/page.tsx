"use client";

import { Badge, Button, Card } from "@saayro/ui";
import { useState } from "react";
import Link from "next/link";
import { requestOtp, verifyOtp } from "@/lib/auth-client";
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
  const [phoneNumber, setPhoneNumber] = useState("+91 ");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [statusLabel, setStatusLabel] = useState("Provider-ready");
  const [pending, setPending] = useState(false);

  const handleRequestOtp = async () => {
    setPending(true);
    setMessage(null);
    try {
      const result = await requestOtp({ phoneNumber });
      setChallengeId(result.challengeId);
      setStatusLabel(result.status === "provider_ready_non_live" ? "Provider-ready" : "Live");
      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start OTP.");
    } finally {
      setPending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!challengeId) {
      setMessage("Request the OTP path first so Saayro can create a challenge.");
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      const result = await verifyOtp({ challengeId, code });
      setStatusLabel(result.status === "provider_ready_non_live" ? "Provider-ready" : result.status);
      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not verify the OTP.");
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <StatePanel
        eyebrow="OTP path"
        title="A verification flow that feels steady under pressure."
        description="This route now calls the backend and creates a real OTP challenge object. Delivery stays provider-ready unless a live OTP provider is enabled."
        tone="discovery"
      />
      <Card className="space-y-5 rounded-[30px]">
        <div className="rounded-[24px] border border-slate-200/70 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900">Enter your mobile number</p>
            <Badge>{statusLabel}</Badge>
          </div>
          <input
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
            className="mt-4 w-full rounded-2xl border border-slate-200/80 bg-ivory-50 px-4 py-3 text-sm text-slate-900 outline-none"
            placeholder="+91 98765 43210"
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="primary" onClick={handleRequestOtp} disabled={pending}>
              {pending ? "Starting..." : "Request OTP"}
            </Button>
            <Link href="/sign-in" className="inline-flex items-center rounded-full border border-slate-200/80 px-4 py-2 text-sm font-semibold text-slate-700">
              Back to sign in
            </Link>
          </div>
        </div>
        <div className="rounded-[24px] border border-slate-200/70 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900">Enter the 6-digit code</p>
            <Badge>{challengeId ? "Challenge created" : "Awaiting request"}</Badge>
          </div>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="mt-4 w-full rounded-2xl border border-slate-200/80 bg-ivory-50 px-4 py-3 text-sm tracking-[0.4em] text-slate-900 outline-none"
            placeholder="123456"
          />
          <div className="mt-4">
            <Button variant="secondary" onClick={handleVerifyOtp} disabled={pending}>
              {pending ? "Checking..." : "Verify OTP"}
            </Button>
          </div>
        </div>
        {message ? <p className="rounded-[24px] bg-slate-950 px-5 py-4 text-sm text-white/85">{message}</p> : null}
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
