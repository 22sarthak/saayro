from __future__ import annotations

from functools import lru_cache
from typing import cast

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from saayro_api.ai import BuddyOrchestrator, build_buddy_orchestrator
from saayro_api.ai.config import provider_badge_enabled
from saayro_api.ai.types import BuddyConversationTurn
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

_HISTORY_LIMIT = 8


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


_PRETRIP_LIFECYCLE_MODES_FOR_SCRUB: frozenset[str] = frozenset(
    {
        "pretrip_create",
        "awaiting_dates",
        "awaiting_party",
        "awaiting_overview",
        "pending_confirmation",
        "editing_details",
        "draft_recovery",
        "new_trip_planning",
    }
)


def _scrub_pretrip_state_for_trip(
    state: dict[str, object], *, trip_id: str | None = None
) -> dict[str, object]:
    scrubbed = dict(state)
    mode = scrubbed.get("mode")
    if trip_id is not None and mode in _PRETRIP_LIFECYCLE_MODES_FOR_SCRUB:
        scrubbed["mode"] = "trip_bound"
    elif mode == "new_trip_planning":
        scrubbed["mode"] = "refine_existing_trip"
    scrubbed.pop("requested_destination", None)
    scrubbed.pop("existing_trip_match", None)
    scrubbed.pop("itinerary_intent", None)
    if trip_id is not None:
        for key in ("expected_answer_type", "next_missing_field", "current_question"):
            scrubbed.pop(key, None)
        scrubbed["source_trip_id"] = trip_id
    else:
        scrubbed.pop("source_trip_id", None)
    return scrubbed


async def _load_thread_context(
    db: AsyncSession, thread_id: str, *, trip_id: str | None = None
) -> tuple[list[BuddyConversationTurn], dict[str, object], dict[str, object]]:
    result = await db.execute(
        select(BuddyMessage)
        .where(BuddyMessage.thread_id == thread_id)
        .order_by(BuddyMessage.created_at.desc())
        .limit(_HISTORY_LIMIT)
    )
    messages = list(result.scalars().all())
    messages.reverse()
    history = [
        BuddyConversationTurn(
            role="buddy" if message.role == "buddy" else "user",
            content=message.content,
        )
        for message in messages
    ]
    planning_state: dict[str, object] = {}
    active_turn_context: dict[str, object] = {}
    for message in reversed(messages):
        if message.role == "buddy" and message.response_json and isinstance(message.response_json, dict):
            response_json = message.response_json
            candidate_state = response_json.get("planning_state")
            if isinstance(candidate_state, dict):
                planning_state = candidate_state
            options_raw = response_json.get("options")
            options: list[str] = [o for o in options_raw if isinstance(o, str)] if isinstance(options_raw, list) else []
            follow_up = response_json.get("follow_up_question")
            current_question = follow_up if isinstance(follow_up, str) else None
            guidance_raw = response_json.get("guidance")
            last_guidance = guidance_raw if isinstance(guidance_raw, str) else ""
            active_turn_context = {
                "options": options,
                "current_question": current_question,
                "mode": planning_state.get("mode"),
                "requested_destination": planning_state.get("requested_destination"),
                "source_trip_id": planning_state.get("source_trip_id"),
                "existing_trip_match": planning_state.get("existing_trip_match"),
                "last_guidance": last_guidance,
                "expected_answer_type": planning_state.get("expected_answer_type"),
                "next_missing_field": planning_state.get("next_missing_field"),
            }
            break
    if trip_id is not None:
        planning_state = _scrub_pretrip_state_for_trip(planning_state, trip_id=trip_id)
        active_turn_context = {
            **active_turn_context,
            "mode": planning_state.get("mode"),
            "requested_destination": None,
            "source_trip_id": trip_id,
            "existing_trip_match": None,
            "expected_answer_type": planning_state.get("expected_answer_type"),
            "next_missing_field": planning_state.get("next_missing_field"),
        }
    return history, planning_state, active_turn_context


async def create_buddy_exchange(db: AsyncSession, actor: SessionActor, trip_id: str, content: str) -> list[BuddyMessageRead]:
    trip = await get_trip_model_or_404(db, actor.user_id, trip_id)
    thread = await _get_or_create_thread(db, trip.id)
    history, planning_state, active_turn_context = await _load_thread_context(db, thread.id, trip_id=trip.id)
    db.add(BuddyMessage(thread_id=thread.id, trip_id=trip.id, role="user", content=content))
    generation = await _orchestrator().generate(
        db=db,
        actor=actor,
        trip_id=trip.id,
        message=content,
        history=history,
        planning_state=planning_state,
        active_turn_context=active_turn_context,
    )
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
    history, planning_state, active_turn_context = await _load_thread_context(db, thread.id, trip_id=None)
    db.add(BuddyMessage(thread_id=thread.id, trip_id=None, role="user", content=content))
    generation = await _orchestrator().generate(
        db=db,
        actor=actor,
        trip_id=None,
        message=content,
        history=history,
        planning_state=planning_state,
        active_turn_context=active_turn_context,
    )
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
    if generation.created_trip_id is not None:
        await attach_pretrip_thread_to_trip(db, actor.user_id, generation.created_trip_id)
        return await list_messages(db, actor.user_id, generation.created_trip_id)
    return await list_pretrip_messages(db, actor.user_id)


def _scrub_migrated_pretrip_message(message: BuddyMessage) -> None:
    response_json = message.response_json
    if not isinstance(response_json, dict):
        return
    response_json = dict(response_json)
    response_json["trip_draft"] = None
    state = response_json.get("planning_state")
    if isinstance(state, dict):
        response_json["planning_state"] = _scrub_pretrip_state_for_trip(state)
    message.response_json = response_json


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
            _scrub_migrated_pretrip_message(message)
        await db.commit()
        return BuddyAttachTripRead(attached=True, trip_id=trip.id, migrated_message_count=len(messages))

    for message in messages:
        message.thread_id = trip_thread.id
        message.trip_id = trip.id
        _scrub_migrated_pretrip_message(message)
    await db.delete(pretrip_thread)
    await db.commit()
    return BuddyAttachTripRead(attached=True, trip_id=trip.id, migrated_message_count=len(messages))
