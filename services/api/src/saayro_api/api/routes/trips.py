from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from saayro_api.api.deps import get_db, get_session_actor
from saayro_api.schemas.auth import SessionActor
from saayro_api.schemas.trips import TripCreate, TripListItem, TripRead, TripUpdate
from saayro_api.services.trips import create_trip, get_trip_or_404, list_trips, update_trip

router = APIRouter(tags=["trips"])


@router.get("/trips", response_model=list[TripListItem])
async def get_trips(db: AsyncSession = Depends(get_db), actor: SessionActor = Depends(get_session_actor)) -> list[TripListItem]:
    return await list_trips(db, actor.user_id)


@router.post("/trips", response_model=TripRead, status_code=status.HTTP_201_CREATED)
async def post_trip(
    payload: TripCreate,
    db: AsyncSession = Depends(get_db),
    actor: SessionActor = Depends(get_session_actor),
) -> TripRead:
    return await create_trip(db, actor.user_id, payload)


@router.get("/trips/{trip_id}", response_model=TripRead)
async def get_trip(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
    actor: SessionActor = Depends(get_session_actor),
) -> TripRead:
    return await get_trip_or_404(db, actor.user_id, trip_id)


@router.patch("/trips/{trip_id}", response_model=TripRead)
async def patch_trip(
    trip_id: str,
    payload: TripUpdate,
    db: AsyncSession = Depends(get_db),
    actor: SessionActor = Depends(get_session_actor),
) -> TripRead:
    return await update_trip(db, actor.user_id, trip_id, payload)

