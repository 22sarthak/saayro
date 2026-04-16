from __future__ import annotations

from collections.abc import AsyncGenerator

from fastapi import Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from saayro_api.core.config import get_settings
from saayro_api.core.errors import ApiException
from saayro_api.db.session import get_db_session
from saayro_api.models.auth import Session
from saayro_api.schemas.auth import SessionActor
from saayro_api.services.auth import SessionEnvelope, resolve_session_from_token


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_db_session():
        yield session


def _extract_bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    scheme, _, value = authorization.partition(" ")
    if scheme.lower() != "bearer" or not value.strip():
        return None
    return value.strip()


async def get_optional_session(
    request: Request,
    db: AsyncSession = Depends(get_db),
    authorization: str | None = Header(default=None),
) -> SessionEnvelope | None:
    settings = get_settings()
    session_token = request.cookies.get(settings.auth_session_cookie_name) or _extract_bearer_token(authorization)
    if not session_token:
        return None
    return await resolve_session_from_token(db, session_token)


async def get_session(request_session: SessionEnvelope | None = Depends(get_optional_session)) -> SessionEnvelope:
    if request_session is None:
        raise ApiException(status_code=401, code="unauthenticated", message="Sign in to continue.")
    return request_session


async def get_session_actor(session: SessionEnvelope = Depends(get_session)) -> SessionActor:
    return session.actor


async def get_session_record(session: SessionEnvelope = Depends(get_session)) -> Session:
    return session.session
