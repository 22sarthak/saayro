"use client";

import { Button, Badge } from "@saayro/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
  interests: string[];
  budgetSensitivity: string;
  notificationsEnabled: boolean;
};

const SUGGESTED_INTERESTS = [
  "regional food",
  "heritage walks",
  "beaches",
  "nightlife",
  "boutique stays",
  "temples",
  "nature",
  "cafés",
  "shopping",
  "art and design",
  "slow travel",
  "family-friendly",
];

const AGE_RANGE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Select age range" },
  { value: "under-18", label: "Under 18" },
  { value: "18-24", label: "18–24" },
  { value: "25-34", label: "25–34" },
  { value: "35-44", label: "35–44" },
  { value: "45-54", label: "45–54" },
  { value: "55-64", label: "55–64" },
  { value: "65+", label: "65+" },
];

function computeAgeRangeFromDob(dob: string): string {
  if (!dob) return "";
  const parsed = new Date(dob);
  if (Number.isNaN(parsed.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - parsed.getFullYear();
  const beforeBirthdayThisYear =
    now.getMonth() < parsed.getMonth() ||
    (now.getMonth() === parsed.getMonth() && now.getDate() < parsed.getDate());
  if (beforeBirthdayThisYear) age -= 1;
  if (age < 0) return "";
  if (age < 18) return "under-18";
  if (age < 25) return "18-24";
  if (age < 35) return "25-34";
  if (age < 45) return "35-44";
  if (age < 55) return "45-54";
  if (age < 65) return "55-64";
  return "65+";
}

function normalizeInterests(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item): item is string => item.length > 0);
}

function Field({
  label,
  helper,
  required = false,
  htmlFor,
  children,
}: {
  label: string;
  helper: string;
  required?: boolean;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="block">
        <span className="text-sm font-medium text-slate-900">
          {label}
          {required ? <span className="ml-1 text-rose-600" aria-hidden>*</span> : null}
        </span>
        <span className="mt-1 block text-xs text-slate-500">{helper}</span>
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-2xl border border-slate-200/80 bg-ivory-50 px-4 py-3 text-sm text-slate-900 outline-none";

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
    interests: normalizeInterests(session?.actor?.preferences?.interests),
    budgetSensitivity: session?.actor?.preferences?.budgetSensitivity ?? "medium",
    notificationsEnabled: session?.actor?.preferences?.notificationsEnabled ?? true,
  });
  const [ageRangeTouched, setAgeRangeTouched] = useState<boolean>(
    Boolean(session?.actor?.ageRange),
  );
  const [customInterestInput, setCustomInterestInput] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const token = searchParams.get("token");

  useEffect(() => {
    void fetchProfile()
      .then((profile) => {
        const incomingInterests = normalizeInterests(profile.preferences.interests);
        const incomingAgeRange = profile.ageRange ?? "";
        setForm((current) => ({
          ...current,
          fullName: profile.fullName || current.fullName,
          homeBase: profile.homeBase ?? current.homeBase,
          phoneNumber: profile.phoneNumber ?? current.phoneNumber,
          dateOfBirth: profile.dateOfBirth ?? current.dateOfBirth,
          ageRange: incomingAgeRange || current.ageRange,
          preferredMapsApp: String(profile.preferences.preferred_maps_app ?? current.preferredMapsApp),
          travelPace: String(profile.preferences.travel_pace ?? current.travelPace),
          comfortPriority: String(profile.preferences.comfort_priority ?? current.comfortPriority),
          interests: incomingInterests.length > 0 ? incomingInterests : current.interests,
          budgetSensitivity: String(profile.preferences.budget_sensitivity ?? current.budgetSensitivity),
          notificationsEnabled:
            typeof profile.preferences.notifications_enabled === "boolean"
              ? profile.preferences.notifications_enabled
              : current.notificationsEnabled,
        }));
        if (incomingAgeRange) {
          setAgeRangeTouched(true);
        }
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

  const toggleInterest = (interest: string) => {
    setForm((current) => {
      const exists = current.interests.includes(interest);
      return {
        ...current,
        interests: exists
          ? current.interests.filter((item) => item !== interest)
          : [...current.interests, interest],
      };
    });
  };

  const commitCustomInterests = () => {
    const entries = customInterestInput
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (entries.length === 0) {
      setCustomInterestInput("");
      return;
    }
    setForm((current) => {
      const merged = [...current.interests];
      for (const entry of entries) {
        if (!merged.some((existing) => existing.toLowerCase() === entry.toLowerCase())) {
          merged.push(entry);
        }
      }
      return { ...current, interests: merged };
    });
    setCustomInterestInput("");
  };

  const handleDobChange = (value: string) => {
    setForm((current) => {
      const nextAgeRange = ageRangeTouched ? current.ageRange : computeAgeRangeFromDob(value);
      return { ...current, dateOfBirth: value, ageRange: nextAgeRange };
    });
  };

  const handleAgeRangeChange = (value: string) => {
    setAgeRangeTouched(true);
    setForm((current) => ({ ...current, ageRange: value }));
  };

  const chipOptions = useMemo(() => {
    const custom = form.interests.filter((item) => !SUGGESTED_INTERESTS.includes(item));
    return [...SUGGESTED_INTERESTS, ...custom];
  }, [form.interests]);

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
          interests: form.interests,
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
    <form className="space-y-6 rounded-[30px] bg-white p-6 shadow-soft" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-center gap-3">
        <Badge>{session?.emailVerified ? "Email verified" : "Email verification pending"}</Badge>
        <Badge>{session?.needsOnboarding ? "Setup required" : "Editable later"}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Full name"
          helper="Required. This is how Saayro addresses you across trips."
          required
          htmlFor="profile-full-name"
        >
          <input
            id="profile-full-name"
            value={form.fullName}
            onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
            placeholder="Your full name"
            className={inputClass}
            required
          />
        </Field>

        <Field
          label="Home base"
          helper="Optional. Helps Saayro reason about departures and nearby trips."
          htmlFor="profile-home-base"
        >
          <input
            id="profile-home-base"
            value={form.homeBase}
            onChange={(event) => setForm((current) => ({ ...current, homeBase: event.target.value }))}
            placeholder="City you usually start from"
            className={inputClass}
          />
        </Field>

        <Field
          label="Mobile number"
          helper="Optional for now. OTP sign-in is provider-ready but not live yet."
          htmlFor="profile-mobile"
        >
          <input
            id="profile-mobile"
            value={form.phoneNumber}
            onChange={(event) => setForm((current) => ({ ...current, phoneNumber: event.target.value }))}
            placeholder="+91…"
            className={inputClass}
            inputMode="tel"
          />
        </Field>

        <Field
          label="Date of birth"
          helper="Optional. Used only to personalize pacing and age-sensitive suggestions."
          htmlFor="profile-dob"
        >
          <input
            id="profile-dob"
            value={form.dateOfBirth}
            onChange={(event) => handleDobChange(event.target.value)}
            type="date"
            className={inputClass}
          />
        </Field>

        <Field
          label="Age range"
          helper="Optional. You can provide this directly if you do not want to add DOB."
          htmlFor="profile-age-range"
        >
          <select
            id="profile-age-range"
            value={form.ageRange}
            onChange={(event) => handleAgeRangeChange(event.target.value)}
            className={inputClass}
          >
            {AGE_RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Preferred maps app"
          helper="Used when Saayro hands routes to an external map app."
          htmlFor="profile-maps-app"
        >
          <select
            id="profile-maps-app"
            value={form.preferredMapsApp}
            onChange={(event) => setForm((current) => ({ ...current, preferredMapsApp: event.target.value }))}
            className={inputClass}
          >
            <option value="google-maps">Google Maps</option>
            <option value="apple-maps">Apple Maps</option>
            <option value="in-app-preview">In-app preview</option>
          </select>
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field
          label="Travel pace"
          helper="How packed should your itinerary feel?"
          htmlFor="profile-travel-pace"
        >
          <select
            id="profile-travel-pace"
            value={form.travelPace}
            onChange={(event) => setForm((current) => ({ ...current, travelPace: event.target.value }))}
            className={inputClass}
          >
            <option value="slow">Slow · fewer stops, more breathing room</option>
            <option value="balanced">Balanced · moderate pacing</option>
            <option value="full">Full · packed days with more activities</option>
          </select>
        </Field>

        <Field
          label="Comfort style"
          helper="What level of comfort should Saayro optimize around?"
          htmlFor="profile-comfort"
        >
          <select
            id="profile-comfort"
            value={form.comfortPriority}
            onChange={(event) => setForm((current) => ({ ...current, comfortPriority: event.target.value }))}
            className={inputClass}
          >
            <option value="essential">Essential · simple and practical</option>
            <option value="balanced">Balanced · comfort without over-spending</option>
            <option value="premium">Premium · polished, higher-comfort choices</option>
          </select>
        </Field>

        <Field
          label="Budget sensitivity"
          helper="How strongly should Saayro protect your budget?"
          htmlFor="profile-budget"
        >
          <select
            id="profile-budget"
            value={form.budgetSensitivity}
            onChange={(event) => setForm((current) => ({ ...current, budgetSensitivity: event.target.value }))}
            className={inputClass}
          >
            <option value="low">Low · flexible budget</option>
            <option value="medium">Medium · balanced budget awareness</option>
            <option value="high">High · budget-conscious planning</option>
          </select>
        </Field>
      </div>

      <div className="space-y-3">
        <div>
          <span className="block text-sm font-medium text-slate-900">Travel interests</span>
          <span className="mt-1 block text-xs text-slate-500">
            Optional. Choose a few or add your own.
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {chipOptions.map((interest) => {
            const selected = form.interests.includes(interest);
            return (
              <button
                key={interest}
                type="button"
                onClick={() => toggleInterest(interest)}
                className={
                  selected
                    ? "rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                    : "rounded-full border border-slate-200 bg-ivory-50 px-3 py-1.5 text-xs text-slate-700 transition hover:bg-white"
                }
                aria-pressed={selected}
              >
                {interest}
                {selected ? <span aria-hidden className="ml-1.5">×</span> : null}
              </button>
            );
          })}
        </div>
        <input
          value={customInterestInput}
          onChange={(event) => setCustomInterestInput(event.target.value)}
          onBlur={commitCustomInterests}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              commitCustomInterests();
            }
          }}
          placeholder="Add your own, comma separated"
          className={inputClass}
          aria-label="Add custom travel interests"
        />
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
