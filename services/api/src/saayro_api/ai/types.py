from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

ScopeClass = Literal["in_scope_travel", "partially_related", "out_of_scope", "sensitive_high_risk"]


class BuddyAction(BaseModel):
    id: str
    type: Literal[
        "itinerary_refine",
        "open_trip_hub",
        "review_saved_places",
        "share_export_pack",
        "open_in_maps",
        "review_connected_travel",
    ]
    label: str
    payload: dict[str, object] = Field(default_factory=dict)


class ToolHint(BaseModel):
    tool: str
    reason: str


class BuddyDevMetadata(BaseModel):
    provider: str
    model: str
    fallback_used: bool = False


class BuddyStructuredReply(BaseModel):
    summary: str
    guidance: str
    confidence_label: Literal["low", "medium", "high"]
    scope_class: ScopeClass
    actions: list[BuddyAction] = Field(default_factory=list)
    follow_up_question: str | None = None
    tool_hints: list[ToolHint] = Field(default_factory=list)
    dev_metadata: BuddyDevMetadata | None = None


class BuddyUserContext(BaseModel):
    user_id: str
    full_name: str
    email: str
    preferences: dict[str, object] = Field(default_factory=dict)


class BuddyTripContext(BaseModel):
    id: str
    title: str
    destination_city: str
    destination_region: str
    destination_country: str
    start_date: date
    end_date: date
    party: str
    overview: str
    highlights: list[str] = Field(default_factory=list)
    preferences: dict[str, object] = Field(default_factory=dict)


class BuddyItineraryStopContext(BaseModel):
    id: str
    title: str
    stop_type: str
    city: str
    subtitle: str
    start_time: str
    end_time: str | None = None
    confidence: str
    tags: list[str] = Field(default_factory=list)
    note: str | None = None
    route_metadata: dict[str, object] | None = None


class BuddyItineraryDayContext(BaseModel):
    id: str
    day_number: int
    date: date
    title: str
    summary: str
    stops: list[BuddyItineraryStopContext] = Field(default_factory=list)


class SavedPlaceContext(BaseModel):
    id: str
    title: str
    city: str
    reason: str
    tags: list[str] = Field(default_factory=list)


class ExportContext(BaseModel):
    id: str
    format: str
    label: str
    status: str


class ConnectedTravelSummary(BaseModel):
    connected_accounts: list[dict[str, object]] = Field(default_factory=list)
    attached_items: list[dict[str, object]] = Field(default_factory=list)
    summary: str


class SaayroBuddyContext(BaseModel):
    user: BuddyUserContext
    trip: BuddyTripContext | None = None
    itinerary_days: list[BuddyItineraryDayContext] = Field(default_factory=list)
    saved_places: list[SavedPlaceContext] = Field(default_factory=list)
    exports: list[ExportContext] = Field(default_factory=list)
    connected_travel: ConnectedTravelSummary | None = None


class BuddyProviderRequest(BaseModel):
    message: str
    context: SaayroBuddyContext
    scope_class: ScopeClass


class BuddyProviderResponse(BaseModel):
    reply: BuddyStructuredReply
    provider: str
    model: str


class BuddyScopeDecision(BaseModel):
    scope_class: ScopeClass
    reason: str


class BuddyPersistedGeneration(BaseModel):
    reply: BuddyStructuredReply
    provider: str
    model: str
    fallback_used: bool = False


class ConnectedTravelItemContext(BaseModel):
    title: str
    item_type: str
    state: str
    confidence: str
    start_at: datetime
    end_at: datetime | None = None
