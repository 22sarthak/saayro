from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from saayro_api.api.deps import get_db, get_session_actor
from saayro_api.schemas.auth import SessionActor
from saayro_api.schemas.exports import ExportJobCreate, ExportJobRead
from saayro_api.services.exports import create_export_job, list_export_jobs

router = APIRouter(tags=["exports"])


@router.get("/trips/{trip_id}/exports", response_model=list[ExportJobRead])
async def get_exports(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
    actor: SessionActor = Depends(get_session_actor),
) -> list[ExportJobRead]:
    return await list_export_jobs(db, actor.user_id, trip_id)


@router.post("/trips/{trip_id}/exports", response_model=ExportJobRead, status_code=status.HTTP_201_CREATED)
async def post_export(
    trip_id: str,
    payload: ExportJobCreate,
    db: AsyncSession = Depends(get_db),
    actor: SessionActor = Depends(get_session_actor),
) -> ExportJobRead:
    return await create_export_job(db, actor.user_id, trip_id, payload.format)

