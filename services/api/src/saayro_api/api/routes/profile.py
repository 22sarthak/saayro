from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from saayro_api.api.deps import get_db, get_session_actor
from saayro_api.schemas.auth import SessionActor
from saayro_api.schemas.profile import ProfileRead, ProfileUpdate
from saayro_api.services.profile import get_profile, update_profile

router = APIRouter(tags=["profile"])


@router.get("/me/profile", response_model=ProfileRead)
async def get_me_profile(
    db: AsyncSession = Depends(get_db),
    actor: SessionActor = Depends(get_session_actor),
) -> ProfileRead:
    return await get_profile(db, actor.user_id)


@router.patch("/me/profile", response_model=ProfileRead)
async def patch_me_profile(
    payload: ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    actor: SessionActor = Depends(get_session_actor),
) -> ProfileRead:
    return await update_profile(db, actor.user_id, payload)
