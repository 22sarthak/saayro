from __future__ import annotations

from datetime import datetime, timedelta, timezone
from hashlib import sha256
from secrets import token_urlsafe


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def session_expiry(hours: int) -> datetime:
    return utc_now() + timedelta(hours=hours)


def generate_session_token() -> str:
    return token_urlsafe(32)


def hash_session_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()
