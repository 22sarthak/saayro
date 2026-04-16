from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from saayro_api.api.deps import get_db, get_session_actor
from saayro_api.schemas.auth import SessionActor
from saayro_api.schemas.itinerary import (
    ItineraryOptimizeRequest,
    ItineraryRead,
    ItineraryUpdateResponse,
)
from saayro_api.services.itinerary import (
    generate_itinerary,
    get_itinerary_or_404,
    optimize_itinerary,
)

router = APIRouter(tags=["itinerary"])


@router.get("/trips/{trip_id}/itinerary", response_model=ItineraryRead)
async def get_itinerary(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
    actor: SessionActor = Depends(get_session_actor),
) -> ItineraryRead:
    return await get_itinerary_or_404(db, actor.user_id, trip_id)


@router.post("/trips/{trip_id}/itinerary/generate", response_model=ItineraryUpdateResponse, status_code=status.HTTP_201_CREATED)
async def post_generate_itinerary(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
    actor: SessionActor = Depends(get_session_actor),
) -> ItineraryUpdateResponse:
    return await generate_itinerary(db, actor.user_id, trip_id)


@router.post("/trips/{trip_id}/itinerary/optimize", response_model=ItineraryUpdateResponse)
async def post_optimize_itinerary(
    trip_id: str,
    payload: ItineraryOptimizeRequest,
    db: AsyncSession = Depends(get_db),
    actor: SessionActor = Depends(get_session_actor),
) -> ItineraryUpdateResponse:
    return await optimize_itinerary(db, actor.user_id, trip_id, payload.goal)
