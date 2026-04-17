from __future__ import annotations

from datetime import datetime, timedelta, timezone
from hashlib import pbkdf2_hmac
from hashlib import sha256
from hmac import compare_digest
from secrets import token_urlsafe
from secrets import token_hex


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def session_expiry(hours: int) -> datetime:
    return utc_now() + timedelta(hours=hours)


def generate_session_token() -> str:
    return token_urlsafe(32)


def hash_session_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


def generate_one_time_token() -> str:
    return token_urlsafe(24)


def hash_one_time_token(token: str) -> str:
    return hash_session_token(token)


def create_password_hash(password: str, *, iterations: int = 600_000) -> str:
    salt = token_hex(16)
    digest = pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations).hex()
    return f"pbkdf2_sha256${iterations}${salt}${digest}"


def verify_password_hash(password: str, encoded: str) -> bool:
    try:
        algorithm, raw_iterations, salt, expected_digest = encoded.split("$", 3)
        iterations = int(raw_iterations)
    except ValueError:
        return False

    if algorithm != "pbkdf2_sha256":
        return False

    digest = pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations).hex()
    return compare_digest(digest, expected_digest)
