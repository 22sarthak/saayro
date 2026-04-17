import type { UserPreferences } from "./domain";

export type AuthProvider = "google" | "otp" | "password";
export type SessionTransport = "cookie" | "bearer";
export type SessionStatus = "authenticated" | "signed_out";
export type OtpFlowStatus = "provider_ready_non_live" | "live" | "verified" | "failed";
export type AuthIntent = "sign_in" | "sign_up";
export type AuthOutcome = "signed_in" | "signed_up" | "linked_account";

export interface AuthSessionActor {
  userId: string;
  email: string;
  fullName: string;
  authMode: AuthProvider;
  homeBase?: string | null;
  phoneNumber?: string | null;
  dateOfBirth?: string | null;
  ageRange?: string | null;
  preferences?: UserPreferences | null;
}

export interface AuthSession {
  authenticated: boolean;
  actor: AuthSessionActor | null;
  sessionId: string | null;
  expiresAt: string | null;
  expiresInSeconds: number | null;
  transport: SessionTransport | null;
  status: SessionStatus;
  authOutcome?: AuthOutcome | null;
  needsOnboarding: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
}

export interface GoogleAuthExchangeRequest {
  accessToken?: string;
  idToken?: string;
  intent?: AuthIntent;
}

export interface GoogleAuthExchangeResponse {
  session: AuthSession;
  sessionToken?: string;
}

export interface EmailSignUpPayload {
  email: string;
  password: string;
  fullName: string;
}

export interface EmailSignInPayload {
  email: string;
  password: string;
}

export interface AuthStatusResponse {
  ok: boolean;
  message: string;
}

export interface LogoutResponse {
  signedOut: boolean;
}

export interface RefreshSessionResponse {
  session: AuthSession;
  sessionToken?: string;
}

export interface OtpRequestPayload {
  phoneNumber: string;
  intent?: AuthIntent | "verify_phone";
}

export interface OtpVerifyPayload {
  challengeId: string;
  code: string;
}

export interface OtpChallengeResponse {
  challengeId: string;
  phoneNumber: string;
  intent: AuthIntent | "verify_phone";
  status: OtpFlowStatus;
  provider: string;
  live: boolean;
  message: string;
  expiresAt: string | null;
}

export interface ProfileRead {
  userId: string;
  email: string;
  fullName: string;
  homeBase?: string | null;
  phoneNumber?: string | null;
  dateOfBirth?: string | null;
  ageRange?: string | null;
  preferences: Record<string, unknown>;
  emailVerified: boolean;
  phoneVerified: boolean;
  needsOnboarding: boolean;
  onboardingCompleted: boolean;
}

export interface ProfileUpdatePayload {
  fullName?: string | null;
  homeBase?: string | null;
  phoneNumber?: string | null;
  dateOfBirth?: string | null;
  ageRange?: string | null;
  preferences?: Record<string, unknown> | null;
  confirmFullName?: boolean;
  completeOnboarding?: boolean;
}
