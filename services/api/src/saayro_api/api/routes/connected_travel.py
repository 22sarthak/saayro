from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from saayro_api.api.deps import get_db, get_session_actor
from saayro_api.schemas.auth import SessionActor
from saayro_api.schemas.connections import ConnectedTravelItemRead
from saayro_api.services.connections import list_connected_travel_items

router = APIRouter(tags=["connected-travel"])


@router.get("/trips/{trip_id}/connected-items", response_model=list[ConnectedTravelItemRead])
async def get_connected_items(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
    actor: SessionActor = Depends(get_session_actor),
) -> list[ConnectedTravelItemRead]:
    return await list_connected_travel_items(db, actor.user_id, trip_id)

