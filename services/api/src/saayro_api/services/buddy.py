from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from saayro_api.models.buddy import BuddyMessage, BuddyThread
from saayro_api.schemas.buddy import BuddyMessageRead
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


async def list_messages(db: AsyncSession, user_id: str, trip_id: str) -> list[BuddyMessageRead]:
    trip = await get_trip_model_or_404(db, user_id, trip_id)
    thread = await _get_or_create_thread(db, trip.id)
    result = await db.execute(select(BuddyMessage).where(BuddyMessage.thread_id == thread.id).order_by(BuddyMessage.created_at.asc()))
    messages = result.scalars().all()
    await db.commit()
    return [BuddyMessageRead.model_validate(message) for message in messages]


async def create_placeholder_exchange(db: AsyncSession, user_id: str, trip_id: str, content: str) -> list[BuddyMessageRead]:
    trip = await get_trip_model_or_404(db, user_id, trip_id)
    thread = await _get_or_create_thread(db, trip.id)
    db.add(BuddyMessage(thread_id=thread.id, trip_id=trip.id, role="user", content=content))
    db.add(
        BuddyMessage(
            thread_id=thread.id,
            trip_id=trip.id,
            role="buddy",
            content="Buddy generation is not enabled yet. Your message is stored and the thread seam is ready for Step 7.",
            confidence="medium",
            actions=[
                {"id": "placeholder-open-trip", "type": "open-map", "label": "Open Trip Hub"},
                {"id": "placeholder-export", "type": "draft-export", "label": "Share Export Pack"},
            ],
        )
    )
    await db.commit()
    return await list_messages(db, user_id, trip.id)

