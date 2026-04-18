from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from saayro_api.schemas.common import BaseSchema


class ConnectedAccountRead(BaseSchema):
    id: str
    provider: str
    label: str
    state: str
    granted_scopes: list[str]
    capabilities: list[str] = Field(default_factory=list)
    provider_account_email: str | None = None
    provider_account_name: str | None = None
    last_synced_at: datetime | None
    last_imported_at: datetime | None = None
    attached_item_count: int = 0
    review_needed_item_count: int = 0
    imported_item_count: int = 0
    status_message: str | None = None


class ConnectedTravelItemRead(BaseSchema):
    id: str
    provider: str
    account_label: str | None = None
    title: str
    item_type: str
    state: str
    confidence: str
    start_at: datetime
    end_at: datetime | None
    trip_id: str | None = None
    trip_title: str | None = None
    metadata_json: dict[str, object]


class ConnectedTravelReviewRequest(BaseModel):
    action: Literal["attach", "ignore"]
    trip_id: str | None = None


class ConnectionStatusRead(BaseModel):
    provider: str
    account: ConnectedAccountRead


class ConnectionLinkStartResponse(BaseModel):
    provider: str
    authorization_url: str
    message: str
    account: ConnectedAccountRead


class ConnectionSyncResponse(BaseModel):
    provider: str
    state: str
    imported_count: int
    attached_count: int
    review_needed_count: int
    account: ConnectedAccountRead
    message: str


class ConnectionDisconnectResponse(BaseModel):
    provider: str
    disconnected: bool
    message: str


class ConnectionCallbackSummary(BaseModel):
    provider: str
    imported_count: int
    attached_count: int
    review_needed_count: int
    state: str
