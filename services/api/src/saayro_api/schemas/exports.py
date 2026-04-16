from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from saayro_api.schemas.common import BaseSchema


class ExportJobCreate(BaseModel):
    format: str


class ExportJobRead(BaseSchema):
    id: str
    trip_id: str
    format: str
    label: str
    description: str
    status: str
    artifact_location: str | None
    created_at: datetime

