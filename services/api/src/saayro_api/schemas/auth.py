from __future__ import annotations

from pydantic import BaseModel


class SessionActor(BaseModel):
    user_id: str
    email: str
    full_name: str
    auth_mode: str


class SessionRead(BaseModel):
    actor: SessionActor
    session_id: str
    expires_in_seconds: int
    mode: str

