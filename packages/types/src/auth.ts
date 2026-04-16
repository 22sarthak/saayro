export type AuthProvider = "google" | "otp";
export type SessionTransport = "cookie" | "bearer";
export type SessionStatus = "authenticated" | "signed_out";
export type OtpFlowStatus = "provider_ready_non_live" | "live" | "verified" | "failed";

export interface AuthSessionActor {
  userId: string;
  email: string;
  fullName: string;
  authMode: AuthProvider;
}

export interface AuthSession {
  authenticated: boolean;
  actor: AuthSessionActor | null;
  sessionId: string | null;
  expiresAt: string | null;
  expiresInSeconds: number | null;
  transport: SessionTransport | null;
  status: SessionStatus;
}

export interface GoogleAuthExchangeRequest {
  accessToken?: string;
  idToken?: string;
}

export interface GoogleAuthExchangeResponse {
  session: AuthSession;
  sessionToken?: string;
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
}

export interface OtpVerifyPayload {
  challengeId: string;
  code: string;
}

export interface OtpChallengeResponse {
  challengeId: string;
  phoneNumber: string;
  status: OtpFlowStatus;
  provider: string;
  live: boolean;
  message: string;
  expiresAt: string | null;
}
