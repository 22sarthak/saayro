from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field

from saayro_api.schemas.common import BaseSchema


class ItineraryStopRead(BaseSchema):
    id: str
    title: str
    stop_type: str
    city: str
    subtitle: str
    start_time: str
    end_time: str | None
    confidence: str
    tags: list[str]
    note: str | None
    route_metadata: dict[str, object] | None


class ItineraryDayRead(BaseSchema):
    id: str
    day_number: int
    date: date
    title: str
    summary: str
    stops: list[ItineraryStopRead]


class ItineraryRead(BaseModel):
    trip_id: str
    days: list[ItineraryDayRead]


class ItineraryOptimizeRequest(BaseModel):
    goal: str = Field(default="pacing")


class ItineraryUpdateResponse(BaseModel):
    trip_id: str
    operation: str
    message: str
    itinerary: ItineraryRead

