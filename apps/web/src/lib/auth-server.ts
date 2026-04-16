import type { AuthSession } from "@saayro/types";
import { cookies } from "next/headers";
import { normalizeSession } from "@/lib/auth-normalizers";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function fetchServerSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  if (!cookieHeader) {
    return null;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/v1/auth/session`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const raw = (await response.json()) as {
      authenticated: boolean;
      actor: {
        user_id: string;
        email: string;
        full_name: string;
        auth_mode: "google" | "otp";
        home_base?: string | null;
        preferences?: Record<string, unknown> | null;
      } | null;
      session_id: string | null;
      expires_at: string | null;
      expires_in_seconds: number | null;
      transport: AuthSession["transport"];
      status: AuthSession["status"];
    };

    return normalizeSession(raw);
  } catch {
    return null;
  }
}
