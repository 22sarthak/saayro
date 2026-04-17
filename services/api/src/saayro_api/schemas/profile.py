from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field


class ProfileRead(BaseModel):
    user_id: str
    email: str
    full_name: str
    home_base: str | None = None
    phone_number: str | None = None
    date_of_birth: date | None = None
    age_range: str | None = None
    preferences: dict[str, object] = Field(default_factory=dict)
    email_verified: bool = False
    phone_verified: bool = False
    needs_onboarding: bool = False
    onboarding_completed: bool = False


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    home_base: str | None = Field(default=None, max_length=255)
    phone_number: str | None = Field(default=None, max_length=32)
    date_of_birth: date | None = None
    age_range: str | None = Field(default=None, max_length=50)
    preferences: dict[str, object] | None = None
    confirm_full_name: bool = False
    complete_onboarding: bool = False
