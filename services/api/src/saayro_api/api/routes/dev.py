from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from saayro_api.api.deps import get_db
from saayro_api.core.config import get_settings
from saayro_api.core.errors import ApiException
from saayro_api.schemas.dev import OutboxMessageRead
from saayro_api.services.auth import list_outbox_messages

router = APIRouter(tags=["dev"])


@router.get("/dev/outbox", response_model=list[OutboxMessageRead])
async def get_dev_outbox(db: AsyncSession = Depends(get_db)) -> list[OutboxMessageRead]:
    if get_settings().env == "production":
        raise ApiException(status_code=404, code="not_found", message="Not found.")
    messages = await list_outbox_messages(db)
    return [
        OutboxMessageRead(
            id=message.id,
            kind=message.kind,
            recipient=message.recipient,
            subject=message.subject,
            body=message.body,
            metadata_json=message.metadata_json or {},
            created_at=message.created_at,
        )
        for message in messages
    ]
