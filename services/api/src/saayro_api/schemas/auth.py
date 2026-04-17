from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


AuthIntent = Literal["sign_in", "sign_up"]
AuthMode = Literal["google", "otp", "password"]


class SessionActor(BaseModel):
    user_id: str
    email: str
    full_name: str
    auth_mode: AuthMode
    home_base: str | None = None
    phone_number: str | None = None
    date_of_birth: date | None = None
    age_range: str | None = None
    preferences: dict[str, object] = Field(default_factory=dict)


class SessionRead(BaseModel):
    authenticated: bool
    actor: SessionActor | None = None
    session_id: str | None = None
    expires_at: datetime | None = None
    expires_in_seconds: int | None = None
    transport: Literal["cookie", "bearer"] | None = None
    status: Literal["authenticated", "signed_out"] = "signed_out"
    auth_outcome: Literal["signed_in", "signed_up", "linked_account"] | None = None
    needs_onboarding: bool = False
    email_verified: bool = False
    phone_verified: bool = False


class GoogleAuthExchangeRequest(BaseModel):
    access_token: str | None = Field(default=None, min_length=1)
    id_token: str | None = Field(default=None, min_length=1)
    intent: AuthIntent = "sign_in"


class GoogleAuthExchangeResponse(BaseModel):
    session: SessionRead
    session_token: str | None = None


class EmailSignUpPayload(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)


class EmailSignInPayload(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=128)


class EmailVerificationRequestPayload(BaseModel):
    email: str | None = None


class TokenPayload(BaseModel):
    token: str = Field(min_length=12, max_length=255)


class ForgotPasswordPayload(BaseModel):
    email: str


class ResetPasswordPayload(TokenPayload):
    password: str = Field(min_length=8, max_length=128)


class AuthStatusRead(BaseModel):
    ok: bool = True
    message: str


class LogoutResponse(BaseModel):
    signed_out: bool = True


class RefreshSessionResponse(BaseModel):
    session: SessionRead
    session_token: str | None = None


class OtpRequestPayload(BaseModel):
    phone_number: str = Field(min_length=8, max_length=20)
    intent: AuthIntent | Literal["verify_phone"] = "sign_in"


class OtpVerifyPayload(BaseModel):
    challenge_id: str
    code: str = Field(min_length=4, max_length=8)


class OtpChallengeRead(BaseModel):
    challenge_id: str
    phone_number: str
    intent: AuthIntent | Literal["verify_phone"]
    status: Literal["provider_ready_non_live", "live", "verified", "failed"]
    provider: str
    live: bool
    message: str
    expires_at: datetime | None = None
