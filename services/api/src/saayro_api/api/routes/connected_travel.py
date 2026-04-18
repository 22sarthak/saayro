from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from saayro_api.api.deps import get_db, get_session_actor
from saayro_api.schemas.auth import SessionActor
from saayro_api.schemas.connections import ConnectedTravelItemRead, ConnectedTravelReviewRequest
from saayro_api.services.connections import (
    list_connected_travel_items,
    list_connected_travel_review_items,
    review_connected_travel_item,
)

router = APIRouter(tags=["connected-travel"])


@router.get("/trips/{trip_id}/connected-items", response_model=list[ConnectedTravelItemRead])
async def get_connected_items(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
    actor: SessionActor = Depends(get_session_actor),
) -> list[ConnectedTravelItemRead]:
    return await list_connected_travel_items(db, actor.user_id, trip_id)


@router.get("/connected-travel/items", response_model=list[ConnectedTravelItemRead])
async def get_connected_travel_review_items(
    state: Literal["candidate", "attached", "ignored"] | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    actor: SessionActor = Depends(get_session_actor),
) -> list[ConnectedTravelItemRead]:
    return await list_connected_travel_review_items(db, actor.user_id, state)


@router.post("/connected-travel/items/{item_id}/review", response_model=ConnectedTravelItemRead)
async def post_connected_travel_review(
    item_id: str,
    payload: ConnectedTravelReviewRequest,
    db: AsyncSession = Depends(get_db),
    actor: SessionActor = Depends(get_session_actor),
) -> ConnectedTravelItemRead:
    return await review_connected_travel_item(
        db,
        user_id=actor.user_id,
        item_id=item_id,
        action=payload.action,
        trip_id=payload.trip_id,
    )
