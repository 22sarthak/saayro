from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from saayro_api.schemas.common import BaseSchema


class ConnectedAccountRead(BaseSchema):
    id: str
    provider: str
    label: str
    state: str
    granted_scopes: list[str]
    last_synced_at: datetime | None


class ConnectedTravelItemRead(BaseSchema):
    id: str
    title: str
    item_type: str
    state: str
    confidence: str
    start_at: datetime
    end_at: datetime | None
    metadata_json: dict[str, object]


class ConnectionConnectResponse(BaseModel):
    provider: str
    state: str
    message: str
    account: ConnectedAccountRead

