from __future__ import annotations

from functools import lru_cache
from typing import cast

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from saayro_api.ai import BuddyOrchestrator, build_buddy_orchestrator
from saayro_api.ai.config import provider_badge_enabled
from saayro_api.core.config import get_settings
from saayro_api.models.buddy import BuddyMessage, BuddyThread
from saayro_api.schemas.auth import SessionActor
from saayro_api.schemas.buddy import (
    BuddyActionSchema,
    BuddyAttachTripRead,
    BuddyDevMetadataSchema,
    BuddyMessageRead,
    BuddyResponseSchema,
)
from saayro_api.services.trips import get_trip_model_or_404


async def _get_or_create_thread(db: AsyncSession, trip_id: str) -> BuddyThread:
    result = await db.execute(select(BuddyThread).where(BuddyThread.trip_id == trip_id))
    thread = result.scalar_one_or_none()
    if thread is not None:
        return thread
    thread = BuddyThread(trip_id=trip_id)
    db.add(thread)
    await db.flush()
    return thread


async def _get_or_create_pretrip_thread(db: AsyncSession, user_id: str) -> BuddyThread:
    result = await db.execute(select(BuddyThread).where(BuddyThread.user_id == user_id))
    thread = result.scalar_one_or_none()
    if thread is not None:
        return thread
    thread = BuddyThread(user_id=user_id)
    db.add(thread)
    await db.flush()
    return thread


def _to_buddy_message_read(message: BuddyMessage) -> BuddyMessageRead:
    response = BuddyResponseSchema.model_validate(message.response_json) if message.response_json else None
    if response and not provider_badge_enabled(get_settings()):
        response = response.model_copy(update={"dev_metadata": None})
    elif response and response.dev_metadata is None and provider_badge_enabled(get_settings()) and message.provider_name and message.model_name:
        response = response.model_copy(
            update={
                "dev_metadata": BuddyDevMetadataSchema(
                    provider=message.provider_name,
                    model=message.model_name,
                    fallback_used=message.fallback_used,
                )
            }
        )
    return BuddyMessageRead(
        id=message.id,
        role=message.role,
        content=message.content,
        confidence=message.confidence,
        actions=cast("list[BuddyActionSchema] | None", message.actions),
        response=response,
        scope_class=message.scope_class,
        created_at=message.created_at,
    )


async def list_messages(db: AsyncSession, user_id: str, trip_id: str) -> list[BuddyMessageRead]:
    trip = await get_trip_model_or_404(db, user_id, trip_id)
    thread = await _get_or_create_thread(db, trip.id)
    result = await db.execute(select(BuddyMessage).where(BuddyMessage.thread_id == thread.id).order_by(BuddyMessage.created_at.asc()))
    messages = result.scalars().all()
    await db.commit()
    return [_to_buddy_message_read(message) for message in messages]


async def list_pretrip_messages(db: AsyncSession, user_id: str) -> list[BuddyMessageRead]:
    thread = await _get_or_create_pretrip_thread(db, user_id)
    result = await db.execute(select(BuddyMessage).where(BuddyMessage.thread_id == thread.id).order_by(BuddyMessage.created_at.asc()))
    messages = result.scalars().all()
    await db.commit()
    return [_to_buddy_message_read(message) for message in messages]


@lru_cache
def _orchestrator() -> BuddyOrchestrator:
    return build_buddy_orchestrator(get_settings())


async def create_buddy_exchange(db: AsyncSession, actor: SessionActor, trip_id: str, content: str) -> list[BuddyMessageRead]:
    trip = await get_trip_model_or_404(db, actor.user_id, trip_id)
    thread = await _get_or_create_thread(db, trip.id)
    db.add(BuddyMessage(thread_id=thread.id, trip_id=trip.id, role="user", content=content))
    generation = await _orchestrator().generate(db=db, actor=actor, trip_id=trip.id, message=content)
    db.add(
        BuddyMessage(
            thread_id=thread.id,
            trip_id=trip.id,
            role="buddy",
            content=generation.reply.summary,
            confidence=generation.reply.confidence_label,
            actions=[action.model_dump() for action in generation.reply.actions],
            response_json=generation.reply.model_dump(mode="json"),
            scope_class=generation.reply.scope_class,
            provider_name=generation.provider,
            model_name=generation.model,
            fallback_used=generation.fallback_used,
        )
    )
    await db.commit()
    return await list_messages(db, actor.user_id, trip.id)


async def create_pretrip_buddy_exchange(db: AsyncSession, actor: SessionActor, content: str) -> list[BuddyMessageRead]:
    thread = await _get_or_create_pretrip_thread(db, actor.user_id)
    db.add(BuddyMessage(thread_id=thread.id, trip_id=None, role="user", content=content))
    generation = await _orchestrator().generate(db=db, actor=actor, trip_id=None, message=content)
    db.add(
        BuddyMessage(
            thread_id=thread.id,
            trip_id=None,
            role="buddy",
            content=generation.reply.summary,
            confidence=generation.reply.confidence_label,
            actions=[action.model_dump() for action in generation.reply.actions],
            response_json=generation.reply.model_dump(mode="json"),
            scope_class=generation.reply.scope_class,
            provider_name=generation.provider,
            model_name=generation.model,
            fallback_used=generation.fallback_used,
        )
    )
    await db.commit()
    return await list_pretrip_messages(db, actor.user_id)


async def attach_pretrip_thread_to_trip(db: AsyncSession, user_id: str, trip_id: str) -> BuddyAttachTripRead:
    trip = await get_trip_model_or_404(db, user_id, trip_id)
    pretrip_result = await db.execute(select(BuddyThread).where(BuddyThread.user_id == user_id))
    pretrip_thread = pretrip_result.scalar_one_or_none()
    if pretrip_thread is None:
        return BuddyAttachTripRead(attached=False, trip_id=trip.id, migrated_message_count=0)

    trip_result = await db.execute(select(BuddyThread).where(BuddyThread.trip_id == trip.id))
    trip_thread = trip_result.scalar_one_or_none()
    messages_result = await db.execute(select(BuddyMessage).where(BuddyMessage.thread_id == pretrip_thread.id))
    messages = list(messages_result.scalars().all())

    if trip_thread is None:
        pretrip_thread.trip_id = trip.id
        pretrip_thread.user_id = None
        for message in messages:
            message.trip_id = trip.id
        await db.commit()
        return BuddyAttachTripRead(attached=True, trip_id=trip.id, migrated_message_count=len(messages))

    for message in messages:
        message.thread_id = trip_thread.id
        message.trip_id = trip.id
    await db.delete(pretrip_thread)
    await db.commit()
    return BuddyAttachTripRead(attached=True, trip_id=trip.id, migrated_message_count=len(messages))
