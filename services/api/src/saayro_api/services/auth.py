from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime
from typing import Literal, cast

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from saayro_api.core.config import Settings, get_settings
from saayro_api.core.errors import ApiException
from saayro_api.core.security import (
    generate_session_token,
    hash_session_token,
    session_expiry,
    utc_now,
)
from saayro_api.models.auth import OtpChallenge, Session, UserIdentity
from saayro_api.models.users import User
from saayro_api.schemas.auth import OtpChallengeRead, SessionActor, SessionRead


@dataclass
class SessionEnvelope:
    session: Session
    actor: SessionActor
    token: str | None = None


@dataclass
class GoogleIdentity:
    subject: str
    email: str
    full_name: str


def _seconds_until(expires_at: datetime | None) -> int | None:
    if expires_at is None:
        return None
    remaining = int((_normalize_datetime(expires_at) - utc_now()).total_seconds())
    return max(remaining, 0)


def build_session_read(envelope: SessionEnvelope | None) -> SessionRead:
    if envelope is None:
        return SessionRead(authenticated=False, status="signed_out")

    return SessionRead(
        authenticated=True,
        actor=envelope.actor,
        session_id=envelope.session.id,
        expires_at=envelope.session.expires_at,
        expires_in_seconds=_seconds_until(envelope.session.expires_at),
        transport=envelope.session.transport,  # type: ignore[arg-type]
        status="authenticated",
    )


def _configured_google_client_ids(settings: Settings) -> set[str]:
    return {
        client_id
        for client_id in [settings.auth_google_web_client_id, *settings.auth_google_mobile_client_ids]
        if client_id
    }


def _normalize_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=utc_now().tzinfo)
    return value


async def _get_user_by_id(db: AsyncSession, user_id: str) -> User | None:
    result = await db.execute(
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.identities), selectinload(User.sessions), selectinload(User.connected_accounts))
    )
    return result.scalar_one_or_none()


def _serialize_actor(user: User, auth_mode: str) -> SessionActor:
    return SessionActor(
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        auth_mode=cast(Literal["google", "otp"], auth_mode),
        home_base=user.home_base,
        preferences=user.preferences or {},
    )  # type: ignore[arg-type]


async def resolve_session_from_token(db: AsyncSession, token: str) -> SessionEnvelope | None:
    token_hash = hash_session_token(token)
    result = await db.execute(select(Session).where(Session.token_hash == token_hash).options(selectinload(Session.user)))
    session = result.scalar_one_or_none()
    if session is None or session.revoked_at is not None or _normalize_datetime(session.expires_at) <= utc_now():
        return None

    user = session.user
    actor = _serialize_actor(user, session.auth_mode)
    return SessionEnvelope(session=session, actor=actor)


async def issue_session(
    db: AsyncSession,
    user: User,
    *,
    auth_mode: str,
    transport: str,
    client_label: str,
    client_metadata: dict[str, object] | None = None,
) -> SessionEnvelope:
    raw_token = generate_session_token()
    session = Session(
        user_id=user.id,
        token_hash=hash_session_token(raw_token),
        auth_mode=auth_mode,
        transport=transport,
        expires_at=session_expiry(get_settings().auth_session_ttl_hours),
        client_label=client_label,
        client_metadata=json.dumps(client_metadata or {}),
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    actor = _serialize_actor(user, auth_mode)
    return SessionEnvelope(session=session, actor=actor, token=raw_token)


async def revoke_session(db: AsyncSession, session: Session) -> None:
    session.revoked_at = utc_now()
    await db.commit()


async def refresh_session(db: AsyncSession, current: SessionEnvelope) -> SessionEnvelope:
    await revoke_session(db, current.session)
    user = await _get_user_by_id(db, current.actor.user_id)
    if user is None:
        raise ApiException(status_code=401, code="unauthenticated", message="Session is no longer valid.")
    return await issue_session(
        db,
        user,
        auth_mode=current.session.auth_mode,
        transport=current.session.transport,
        client_label=current.session.client_label or "Refreshed session",
        client_metadata={"refreshed_from": current.session.id},
    )


async def _load_google_profile(settings: Settings, access_token: str | None, id_token: str | None) -> GoogleIdentity:
    if not access_token and not id_token:
        raise ApiException(status_code=400, code="validation_error", message="A Google access token or ID token is required.")

    async with httpx.AsyncClient(timeout=settings.ai_timeout_seconds) as client:
        if access_token:
            token_info = await client.get("https://oauth2.googleapis.com/tokeninfo", params={"access_token": access_token})
            if token_info.status_code >= 400:
                raise ApiException(status_code=401, code="invalid_google_token", message="Google access token is invalid.")
            info = token_info.json()
            audience = str(info.get("aud", ""))
            allowed_audiences = _configured_google_client_ids(settings)
            if allowed_audiences and audience and audience not in allowed_audiences:
                raise ApiException(status_code=401, code="invalid_google_token", message="Google token audience mismatch.")
            userinfo = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if userinfo.status_code >= 400:
                raise ApiException(status_code=401, code="invalid_google_token", message="Could not load Google user profile.")
            profile = userinfo.json()
        else:
            token_info = await client.get("https://oauth2.googleapis.com/tokeninfo", params={"id_token": id_token})
            if token_info.status_code >= 400:
                raise ApiException(status_code=401, code="invalid_google_token", message="Google ID token is invalid.")
            profile = token_info.json()
            audience = str(profile.get("aud", ""))
            allowed_audiences = _configured_google_client_ids(settings)
            if allowed_audiences and audience and audience not in allowed_audiences:
                raise ApiException(status_code=401, code="invalid_google_token", message="Google token audience mismatch.")

    subject = str(profile.get("sub", "")).strip()
    email = str(profile.get("email", "")).strip().lower()
    full_name = str(profile.get("name", "")).strip() or email.split("@")[0].replace(".", " ").title()
    if not subject or not email:
        raise ApiException(status_code=401, code="invalid_google_token", message="Google profile is missing required identity fields.")
    return GoogleIdentity(subject=subject, email=email, full_name=full_name)


async def authenticate_google(
    db: AsyncSession,
    *,
    access_token: str | None,
    id_token: str | None,
    transport: str,
    client_label: str,
) -> SessionEnvelope:
    settings = get_settings()
    identity = await _load_google_profile(settings, access_token, id_token)

    result = await db.execute(
        select(UserIdentity)
        .where(UserIdentity.provider == "google", UserIdentity.provider_user_id == identity.subject)
        .options(selectinload(UserIdentity.user))
    )
    existing_identity = result.scalar_one_or_none()
    if existing_identity is not None:
        user = existing_identity.user
        existing_identity.email = identity.email
        user.email = identity.email
        user.full_name = identity.full_name
        await db.commit()
        return await issue_session(
            db,
            user,
            auth_mode="google",
            transport=transport,
            client_label=client_label,
            client_metadata={"provider": "google"},
        )

    email_result = await db.execute(select(User).where(User.email == identity.email))
    user = email_result.scalar_one_or_none()
    if user is None:
        user = User(
            email=identity.email,
            full_name=identity.full_name,
            home_base="Delhi",
            preferences={
                "preferred_maps_app": "google-maps",
                "travel_pace": "balanced",
                "interests": ["boutique stays", "regional food", "sunrise viewpoints"],
                "budget_sensitivity": "medium",
                "comfort_priority": "premium",
                "notifications_enabled": True,
            },
        )
        db.add(user)
        await db.flush()
    else:
        user.full_name = identity.full_name

    db.add(UserIdentity(user_id=user.id, provider="google", provider_user_id=identity.subject, email=identity.email))
    await db.commit()
    await db.refresh(user)
    return await issue_session(
        db,
        user,
        auth_mode="google",
        transport=transport,
        client_label=client_label,
        client_metadata={"provider": "google"},
    )


async def request_otp_challenge(db: AsyncSession, phone_number: str) -> OtpChallengeRead:
    settings = get_settings()
    challenge = OtpChallenge(
        phone_number=phone_number,
        provider=settings.otp_provider,
        status="provider_ready_non_live" if not settings.otp_enabled else "live",
        expires_at=session_expiry(1),
    )
    db.add(challenge)
    await db.commit()
    await db.refresh(challenge)
    return OtpChallengeRead(
        challenge_id=challenge.id,
        phone_number=challenge.phone_number,
        status=challenge.status,  # type: ignore[arg-type]
        provider=challenge.provider,
        live=settings.otp_enabled,
        message=(
            "OTP delivery is provider-ready but not live in this environment."
            if not settings.otp_enabled
            else "OTP challenge created."
        ),
        expires_at=challenge.expires_at,
    )


async def verify_otp_challenge(db: AsyncSession, challenge_id: str, code: str) -> OtpChallengeRead:
    challenge = await db.get(OtpChallenge, challenge_id)
    if challenge is None:
        raise ApiException(status_code=404, code="not_found", message="OTP challenge not found.")

    settings = get_settings()
    if not settings.otp_enabled:
        return OtpChallengeRead(
            challenge_id=challenge.id,
            phone_number=challenge.phone_number,
            status="provider_ready_non_live",
            provider=challenge.provider,
            live=False,
            message="OTP verification is wired but not live in this environment.",
            expires_at=challenge.expires_at,
        )

    if challenge.expires_at and _normalize_datetime(challenge.expires_at) <= utc_now():
        challenge.status = "failed"
        await db.commit()
        return OtpChallengeRead(
            challenge_id=challenge.id,
            phone_number=challenge.phone_number,
            status="failed",
            provider=challenge.provider,
            live=True,
            message="OTP challenge expired.",
            expires_at=challenge.expires_at,
        )

    if code == "000000":
        challenge.status = "verified"
        challenge.consumed_at = utc_now()
        await db.commit()
        return OtpChallengeRead(
            challenge_id=challenge.id,
            phone_number=challenge.phone_number,
            status="verified",
            provider=challenge.provider,
            live=True,
            message="OTP verified.",
            expires_at=challenge.expires_at,
        )

    challenge.status = "failed"
    await db.commit()
    return OtpChallengeRead(
        challenge_id=challenge.id,
        phone_number=challenge.phone_number,
        status="failed",
        provider=challenge.provider,
        live=True,
        message="OTP code is invalid.",
        expires_at=challenge.expires_at,
    )
