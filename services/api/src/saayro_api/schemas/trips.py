from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field

from saayro_api.schemas.common import BaseSchema


class UserPreferencesSchema(BaseModel):
    preferred_maps_app: str = "google-maps"
    travel_pace: str = "balanced"
    interests: list[str] = Field(default_factory=list)
    budget_sensitivity: str = "medium"
    comfort_priority: str = "premium"
    notifications_enabled: bool = True


class TripCreate(BaseModel):
    title: str
    destination_city: str
    destination_region: str
    destination_country: str = "India"
    start_date: date
    end_date: date
    party: str
    overview: str
    highlights: list[str] = Field(default_factory=list)
    preferences: UserPreferencesSchema = Field(default_factory=UserPreferencesSchema)


class TripUpdate(BaseModel):
    title: str | None = None
    destination_city: str | None = None
    destination_region: str | None = None
    destination_country: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: str | None = None
    party: str | None = None
    overview: str | None = None
    highlights: list[str] | None = None
    preferences: UserPreferencesSchema | None = None


class TripListItem(BaseSchema):
    id: str
    title: str
    destination_city: str
    destination_region: str
    destination_country: str
    start_date: date
    end_date: date
    status: str
    party: str
    highlights: list[str]


class TripRead(TripListItem):
    preferences: dict[str, object]
    overview: str
    created_at: datetime
    updated_at: datetime
