from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from saayro_api.schemas.common import BaseSchema


class BuddyMessageCreate(BaseModel):
    content: str


class BuddyAttachTripPayload(BaseModel):
    trip_id: str


class BuddyAttachTripRead(BaseModel):
    attached: bool
    trip_id: str
    migrated_message_count: int = 0


class BuddyActionSchema(BaseModel):
    id: str
    type: str
    label: str
    payload: dict[str, object] = Field(default_factory=dict)


class BuddyToolHintSchema(BaseModel):
    tool: str
    reason: str


class BuddyDevMetadataSchema(BaseModel):
    provider: str
    model: str
    fallback_used: bool = False


class BuddyTripDraftSchema(BaseModel):
    title: str | None = None
    destination_city: str | None = None
    destination_region: str | None = None
    destination_country: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    party: str | None = None
    overview: str | None = None
    highlights: list[str] = Field(default_factory=list)
    ready: bool = False


class BuddyResponseSchema(BaseModel):
    summary: str
    guidance: str
    confidence_label: str
    scope_class: str
    actions: list[BuddyActionSchema] = Field(default_factory=list)
    follow_up_question: str | None = None
    tool_hints: list[BuddyToolHintSchema] = Field(default_factory=list)
    dev_metadata: BuddyDevMetadataSchema | None = None
    options: list[str] = Field(default_factory=list)
    planning_state: dict[str, object] = Field(default_factory=dict)
    trip_draft: BuddyTripDraftSchema | None = None


class BuddyMessageRead(BaseSchema):
    id: str
    role: str
    content: str
    confidence: str | None
    actions: list[BuddyActionSchema] | None
    response: BuddyResponseSchema | None = None
    scope_class: str | None = None
    created_at: datetime
