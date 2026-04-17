"use client";

import { Button, Badge } from "@saayro/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/components/auth/session-provider";
import { confirmEmailVerification, fetchProfile, requestEmailVerification, updateProfile } from "@/lib/auth-client";

type FormState = {
  fullName: string;
  homeBase: string;
  phoneNumber: string;
  dateOfBirth: string;
  ageRange: string;
  preferredMapsApp: string;
  travelPace: string;
  comfortPriority: string;
  interests: string;
  budgetSensitivity: string;
  notificationsEnabled: boolean;
};

export function ProfileSetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, refreshSession } = useSession();
  const [form, setForm] = useState<FormState>({
    fullName: session?.actor?.fullName ?? "",
    homeBase: session?.actor?.homeBase ?? "",
    phoneNumber: session?.actor?.phoneNumber ?? "",
    dateOfBirth: session?.actor?.dateOfBirth ?? "",
    ageRange: session?.actor?.ageRange ?? "",
    preferredMapsApp: session?.actor?.preferences?.preferredMapsApp ?? "google-maps",
    travelPace: session?.actor?.preferences?.travelPace ?? "balanced",
    comfortPriority: session?.actor?.preferences?.comfortPriority ?? "premium",
    interests: session?.actor?.preferences?.interests?.join(", ") ?? "",
    budgetSensitivity: session?.actor?.preferences?.budgetSensitivity ?? "medium",
    notificationsEnabled: session?.actor?.preferences?.notificationsEnabled ?? true,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const token = searchParams.get("token");

  useEffect(() => {
    void fetchProfile()
      .then((profile) => {
        setForm((current) => ({
          ...current,
          fullName: profile.fullName || current.fullName,
          homeBase: profile.homeBase ?? current.homeBase,
          phoneNumber: profile.phoneNumber ?? current.phoneNumber,
          dateOfBirth: profile.dateOfBirth ?? current.dateOfBirth,
          ageRange: profile.ageRange ?? current.ageRange,
          preferredMapsApp: String(profile.preferences.preferred_maps_app ?? current.preferredMapsApp),
          travelPace: String(profile.preferences.travel_pace ?? current.travelPace),
          comfortPriority: String(profile.preferences.comfort_priority ?? current.comfortPriority),
          interests: Array.isArray(profile.preferences.interests)
            ? profile.preferences.interests.map(String).join(", ")
            : current.interests,
          budgetSensitivity: String(profile.preferences.budget_sensitivity ?? current.budgetSensitivity),
          notificationsEnabled:
            typeof profile.preferences.notifications_enabled === "boolean"
              ? profile.preferences.notifications_enabled
              : current.notificationsEnabled,
        }));
      })
      .catch(() => {
        // Keep session-prefilled fallback state.
      });
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }
    void confirmEmailVerification(token)
      .then(async (result) => {
        setMessage(result.message);
        await refreshSession();
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : "Could not verify this email link.");
      });
  }, [refreshSession, token]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      await updateProfile({
        fullName: form.fullName,
        homeBase: form.homeBase,
        phoneNumber: form.phoneNumber || null,
        dateOfBirth: form.dateOfBirth || null,
        ageRange: form.ageRange || null,
        preferences: {
          preferred_maps_app: form.preferredMapsApp,
          travel_pace: form.travelPace,
          interests: form.interests
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          budget_sensitivity: form.budgetSensitivity,
          comfort_priority: form.comfortPriority,
          notifications_enabled: form.notificationsEnabled,
        },
        confirmFullName: true,
        completeOnboarding: session?.needsOnboarding ?? false,
      });
      const refreshed = await refreshSession();
      router.replace(refreshed.needsOnboarding ? "/app/onboarding" : "/app/trips");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save your profile.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="space-y-5 rounded-[30px] bg-white p-6 shadow-soft" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-center gap-3">
        <Badge>{session?.emailVerified ? "Email verified" : "Email verification pending"}</Badge>
        <Badge>{session?.needsOnboarding ? "Setup required" : "Editable later"}</Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <input value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} placeholder="Full name" className="rounded-2xl border border-slate-200/80 bg-ivory-50 px-4 py-3 text-sm text-slate-900 outline-none" />
        <input value={form.homeBase} onChange={(event) => setForm((current) => ({ ...current, homeBase: event.target.value }))} placeholder="Home base" className="rounded-2xl border border-slate-200/80 bg-ivory-50 px-4 py-3 text-sm text-slate-900 outline-none" />
        <input value={form.phoneNumber} onChange={(event) => setForm((current) => ({ ...current, phoneNumber: event.target.value }))} placeholder="Mobile number" className="rounded-2xl border border-slate-200/80 bg-ivory-50 px-4 py-3 text-sm text-slate-900 outline-none" />
        <input value={form.dateOfBirth} onChange={(event) => setForm((current) => ({ ...current, dateOfBirth: event.target.value }))} type="date" className="rounded-2xl border border-slate-200/80 bg-ivory-50 px-4 py-3 text-sm text-slate-900 outline-none" />
        <input value={form.ageRange} onChange={(event) => setForm((current) => ({ ...current, ageRange: event.target.value }))} placeholder="Age range" className="rounded-2xl border border-slate-200/80 bg-ivory-50 px-4 py-3 text-sm text-slate-900 outline-none" />
        <input value={form.interests} onChange={(event) => setForm((current) => ({ ...current, interests: event.target.value }))} placeholder="Travel interests, comma separated" className="rounded-2xl border border-slate-200/80 bg-ivory-50 px-4 py-3 text-sm text-slate-900 outline-none" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <select value={form.preferredMapsApp} onChange={(event) => setForm((current) => ({ ...current, preferredMapsApp: event.target.value }))} className="rounded-2xl border border-slate-200/80 bg-ivory-50 px-4 py-3 text-sm text-slate-900 outline-none">
          <option value="google-maps">Google Maps</option>
          <option value="apple-maps">Apple Maps</option>
          <option value="in-app-preview">In-app preview</option>
        </select>
        <select value={form.travelPace} onChange={(event) => setForm((current) => ({ ...current, travelPace: event.target.value }))} className="rounded-2xl border border-slate-200/80 bg-ivory-50 px-4 py-3 text-sm text-slate-900 outline-none">
          <option value="slow">Slow</option>
          <option value="balanced">Balanced</option>
          <option value="full">Full</option>
        </select>
        <select value={form.comfortPriority} onChange={(event) => setForm((current) => ({ ...current, comfortPriority: event.target.value }))} className="rounded-2xl border border-slate-200/80 bg-ivory-50 px-4 py-3 text-sm text-slate-900 outline-none">
          <option value="essential">Essential</option>
          <option value="balanced">Balanced</option>
          <option value="premium">Premium</option>
        </select>
        <select value={form.budgetSensitivity} onChange={(event) => setForm((current) => ({ ...current, budgetSensitivity: event.target.value }))} className="rounded-2xl border border-slate-200/80 bg-ivory-50 px-4 py-3 text-sm text-slate-900 outline-none">
          <option value="low">Low budget sensitivity</option>
          <option value="medium">Medium budget sensitivity</option>
          <option value="high">High budget sensitivity</option>
        </select>
      </div>
      <label className="flex items-center gap-3 text-sm text-slate-700">
        <input
          checked={form.notificationsEnabled}
          onChange={(event) => setForm((current) => ({ ...current, notificationsEnabled: event.target.checked }))}
          type="checkbox"
        />
        Keep notifications enabled
      </label>
      <div className="flex flex-wrap gap-3">
        <Button variant="primary" type="submit" disabled={pending}>
          {pending ? "Saving..." : session?.needsOnboarding ? "Complete setup" : "Save changes"}
        </Button>
        {!session?.emailVerified ? (
          <Button
            variant="secondary"
            type="button"
            onClick={() => {
              void requestEmailVerification()
                .then((result) => setMessage(result.message))
                .catch((error) => setMessage(error instanceof Error ? error.message : "Could not request verification."));
            }}
          >
            Resend verification
          </Button>
        ) : null}
      </div>
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
    </form>
  );
}
