from __future__ import annotations

from fastapi import APIRouter, Depends

from saayro_api.api.deps import get_session_actor
from saayro_api.schemas.auth import SessionActor, SessionRead

router = APIRouter(tags=["auth"])


@router.get("/auth/session", response_model=SessionRead)
async def get_auth_session(actor: SessionActor = Depends(get_session_actor)) -> SessionRead:
    return SessionRead(actor=actor, session_id="sess_placeholder_saayro", expires_in_seconds=3600, mode="placeholder")
