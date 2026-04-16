from __future__ import annotations

from collections.abc import AsyncGenerator

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from saayro_api.db.session import get_db_session
from saayro_api.schemas.auth import SessionActor
from saayro_api.services.users import ensure_demo_user


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_db_session():
        yield session


async def get_session_actor(db: AsyncSession = Depends(get_db)) -> SessionActor:
    user = await ensure_demo_user(db)
    return SessionActor(user_id=user.id, email=user.email, full_name=user.full_name, auth_mode="placeholder")
