from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from saayro_api.api.deps import get_db, get_session_actor
from saayro_api.schemas.auth import SessionActor
from saayro_api.schemas.buddy import BuddyMessageCreate, BuddyMessageRead
from saayro_api.services.buddy import create_placeholder_exchange, list_messages

router = APIRouter(tags=["buddy"])


@router.get("/trips/{trip_id}/buddy/messages", response_model=list[BuddyMessageRead])
async def get_buddy_messages(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
    actor: SessionActor = Depends(get_session_actor),
) -> list[BuddyMessageRead]:
    return await list_messages(db, actor.user_id, trip_id)


@router.post("/trips/{trip_id}/buddy/messages", response_model=list[BuddyMessageRead], status_code=status.HTTP_201_CREATED)
async def post_buddy_message(
    trip_id: str,
    payload: BuddyMessageCreate,
    db: AsyncSession = Depends(get_db),
    actor: SessionActor = Depends(get_session_actor),
) -> list[BuddyMessageRead]:
    return await create_placeholder_exchange(db, actor.user_id, trip_id, payload.content)

