"use client";

import { Button } from "@saayro/ui";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { exchangeGoogleWeb } from "@/lib/auth-client";
import { useSession } from "@/components/auth/session-provider";

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
            error_callback?: (error: unknown) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

let googleScriptPromise: Promise<void> | null = null;

function buildGoogleGuidance(message: string): { label: string; href: string } | null {
  const normalized = message.toLowerCase();
  if (normalized.includes("continue signing in instead")) {
    return { label: "Open sign in", href: "/sign-in" };
  }
  if (normalized.includes("verify")) {
    return { label: "Open onboarding", href: "/app/onboarding" };
  }
  return null;
}

function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google sign-in is only available in the browser."));
  }
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }
  if (googleScriptPromise) {
    return googleScriptPromise;
  }

  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-saayro-google-signin]");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Could not load Google Identity Services.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.saayroGoogleSignin = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Google Identity Services."));
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

export function GoogleSignInAction({
  label,
  variant = "primary",
  intent = "sign_in",
}: {
  label: string;
  variant?: "primary" | "secondary" | "ghost";
  intent?: "sign_in" | "sign_up";
}) {
  const router = useRouter();
  const { setSession } = useSession();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const guidance = error ? buildGoogleGuidance(error) : null;

  const handleSignIn = async () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError("Set NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable Google sign-in.");
      return;
    }

    setPending(true);
    setError(null);

    try {
      await loadGoogleIdentityScript();
      const tokenClient = window.google?.accounts?.oauth2?.initTokenClient({
        client_id: clientId,
        scope: "openid email profile",
        callback: async (response) => {
          if (!response.access_token) {
            setPending(false);
            setError(response.error ?? "Google did not return an access token.");
            return;
          }

          try {
            const result = await exchangeGoogleWeb(response.access_token, intent);
            setSession(result.session);
            router.replace(result.session.needsOnboarding ? "/app/onboarding" : "/app");
          } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Could not complete Google sign-in.");
          } finally {
            setPending(false);
          }
        },
        error_callback: () => {
          setPending(false);
          setError("Google sign-in was interrupted.");
        },
      });

      tokenClient?.requestAccessToken({ prompt: "select_account" });
    } catch (loadError) {
      setPending(false);
      setError(loadError instanceof Error ? loadError.message : "Google sign-in is unavailable.");
    }
  };

  return (
    <div className="space-y-2">
      <Button variant={variant} onClick={handleSignIn} disabled={pending}>
        {pending ? "Connecting Google..." : label}
      </Button>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {guidance ? (
        <p className="text-sm text-slate-600">
          Next step:{" "}
          <Link href={guidance.href} className="text-slate-900 underline decoration-slate-300 underline-offset-4">
            {guidance.label}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
