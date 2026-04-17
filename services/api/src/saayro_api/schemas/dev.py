from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class OutboxMessageRead(BaseModel):
    id: str
    kind: str
    recipient: str
    subject: str
    body: str
    metadata_json: dict[str, object] = Field(default_factory=dict)
    created_at: datetime
