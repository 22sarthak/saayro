from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from saayro_api.api.deps import get_db, get_session_actor
from saayro_api.schemas.auth import SessionActor
from saayro_api.schemas.buddy import BuddyAttachTripPayload, BuddyAttachTripRead, BuddyMessageCreate, BuddyMessageRead
from saayro_api.services.buddy import (
    attach_pretrip_thread_to_trip,
    create_buddy_exchange,
    create_pretrip_buddy_exchange,
    list_messages,
    list_pretrip_messages,
)

router = APIRouter(tags=["buddy"])


@router.get("/trips/{trip_id}/buddy/messages", response_model=list[BuddyMessageRead])
async def get_buddy_messages(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
    actor: SessionActor = Depends(get_session_actor),
) -> list[BuddyMessageRead]:
    return await list_messages(db, actor.user_id, trip_id)


@router.get("/buddy/pre-trip/messages", response_model=list[BuddyMessageRead])
async def get_pretrip_buddy_messages(
    db: AsyncSession = Depends(get_db),
    actor: SessionActor = Depends(get_session_actor),
) -> list[BuddyMessageRead]:
    return await list_pretrip_messages(db, actor.user_id)


@router.post("/trips/{trip_id}/buddy/messages", response_model=list[BuddyMessageRead], status_code=status.HTTP_201_CREATED)
async def post_buddy_message(
    trip_id: str,
    payload: BuddyMessageCreate,
    db: AsyncSession = Depends(get_db),
    actor: SessionActor = Depends(get_session_actor),
) -> list[BuddyMessageRead]:
    return await create_buddy_exchange(db, actor, trip_id, payload.content)


@router.post("/buddy/pre-trip/messages", response_model=list[BuddyMessageRead], status_code=status.HTTP_201_CREATED)
async def post_pretrip_buddy_message(
    payload: BuddyMessageCreate,
    db: AsyncSession = Depends(get_db),
    actor: SessionActor = Depends(get_session_actor),
) -> list[BuddyMessageRead]:
    return await create_pretrip_buddy_exchange(db, actor, payload.content)


@router.post("/buddy/pre-trip/attach-trip", response_model=BuddyAttachTripRead)
async def post_pretrip_attach_trip(
    payload: BuddyAttachTripPayload,
    db: AsyncSession = Depends(get_db),
    actor: SessionActor = Depends(get_session_actor),
) -> BuddyAttachTripRead:
    return await attach_pretrip_thread_to_trip(db, actor.user_id, payload.trip_id)
