from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class SessionActor(BaseModel):
    user_id: str
    email: str
    full_name: str
    auth_mode: Literal["google", "otp"]
    home_base: str | None = None
    preferences: dict[str, object] = Field(default_factory=dict)


class SessionRead(BaseModel):
    authenticated: bool
    actor: SessionActor | None = None
    session_id: str | None = None
    expires_at: datetime | None = None
    expires_in_seconds: int | None = None
    transport: Literal["cookie", "bearer"] | None = None
    status: Literal["authenticated", "signed_out"] = "signed_out"


class GoogleAuthExchangeRequest(BaseModel):
    access_token: str | None = Field(default=None, min_length=1)
    id_token: str | None = Field(default=None, min_length=1)


class GoogleAuthExchangeResponse(BaseModel):
    session: SessionRead
    session_token: str | None = None


class LogoutResponse(BaseModel):
    signed_out: bool = True


class RefreshSessionResponse(BaseModel):
    session: SessionRead
    session_token: str | None = None


class OtpRequestPayload(BaseModel):
    phone_number: str = Field(min_length=8, max_length=20)


class OtpVerifyPayload(BaseModel):
    challenge_id: str
    code: str = Field(min_length=4, max_length=8)


class OtpChallengeRead(BaseModel):
    challenge_id: str
    phone_number: str
    status: Literal["provider_ready_non_live", "live", "verified", "failed"]
    provider: str
    live: bool
    message: str
    expires_at: datetime | None = None
