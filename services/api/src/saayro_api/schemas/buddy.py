from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from saayro_api.schemas.common import BaseSchema


class BuddyMessageCreate(BaseModel):
    content: str


class BuddyMessageRead(BaseSchema):
    id: str
    role: str
    content: str
    confidence: str | None
    actions: list[dict[str, object]] | None
    created_at: datetime
