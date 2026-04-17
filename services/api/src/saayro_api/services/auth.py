from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Literal, cast

import httpx
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from saayro_api.core.config import Settings, get_settings
from saayro_api.core.errors import ApiException
from saayro_api.core.security import (
    create_password_hash,
    generate_one_time_token,
    generate_session_token,
    hash_one_time_token,
    hash_session_token,
    session_expiry,
    utc_now,
    verify_password_hash,
)
from saayro_api.models.auth import AccountToken, OtpChallenge, OutboxMessage, Session, UserIdentity
from saayro_api.models.users import User
from saayro_api.schemas.auth import AuthStatusRead, OtpChallengeRead, SessionActor, SessionRead


@dataclass
class SessionEnvelope:
    session: Session
    actor: SessionActor
    token: str | None = None
    auth_outcome: Literal["signed_in", "signed_up", "linked_account"] | None = None


@dataclass
class GoogleIdentity:
    subject: str
    email: str
    full_name: str
    email_verified: bool


def default_preferences() -> dict[str, object]:
    return {
        "preferred_maps_app": "google-maps",
        "travel_pace": "balanced",
        "interests": ["boutique stays", "regional food", "sunrise viewpoints"],
        "budget_sensitivity": "medium",
        "comfort_priority": "premium",
        "notifications_enabled": True,
    }


def _normalize_email(value: str) -> str:
    return value.strip().lower()


def _normalize_phone(value: str | None) -> str | None:
    if value is None:
        return None
    compact = "".join(character for character in value if character.isdigit() or character == "+")
    return compact or None


def _user_email_verified(user: User) -> bool:
    return user.email_verified_at is not None


def _user_phone_verified(user: User) -> bool:
    return user.phone_number is not None and user.phone_verified_at is not None


def _user_needs_onboarding(user: User) -> bool:
    return user.onboarding_completed_at is None or not user.full_name.strip()


def _seconds_until(expires_at: datetime | None) -> int | None:
    if expires_at is None:
        return None
    remaining = int((_normalize_datetime(expires_at) - utc_now()).total_seconds())
    return max(remaining, 0)


def build_session_read(envelope: SessionEnvelope | None) -> SessionRead:
    if envelope is None:
        return SessionRead(authenticated=False, status="signed_out")

    user = envelope.session.user if hasattr(envelope.session, "user") else None
    return SessionRead(
        authenticated=True,
        actor=envelope.actor,
        session_id=envelope.session.id,
        expires_at=envelope.session.expires_at,
        expires_in_seconds=_seconds_until(envelope.session.expires_at),
        transport=envelope.session.transport,  # type: ignore[arg-type]
        status="authenticated",
        auth_outcome=envelope.auth_outcome,
        needs_onboarding=_user_needs_onboarding(user) if user is not None else False,
        email_verified=_user_email_verified(user) if user is not None else False,
        phone_verified=_user_phone_verified(user) if user is not None else False,
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


def _expiry_from_minutes(minutes: int) -> datetime:
    return utc_now() + timedelta(minutes=minutes)


async def _get_user_by_id(db: AsyncSession, user_id: str) -> User | None:
    result = await db.execute(
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.identities), selectinload(User.sessions), selectinload(User.connected_accounts))
    )
    return result.scalar_one_or_none()


async def _get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email).options(selectinload(User.identities)))
    return result.scalar_one_or_none()


async def _get_user_by_phone(db: AsyncSession, phone_number: str) -> User | None:
    result = await db.execute(select(User).where(User.phone_number == phone_number).options(selectinload(User.identities)))
    return result.scalar_one_or_none()


def _serialize_actor(user: User, auth_mode: str) -> SessionActor:
    return SessionActor(
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        auth_mode=cast(Literal["google", "otp", "password"], auth_mode),
        home_base=user.home_base,
        phone_number=user.phone_number,
        date_of_birth=user.date_of_birth,
        age_range=user.age_range,
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
    auth_outcome: Literal["signed_in", "signed_up", "linked_account"] | None = None,
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
    session.user = user
    actor = _serialize_actor(user, auth_mode)
    return SessionEnvelope(session=session, actor=actor, token=raw_token, auth_outcome=auth_outcome)


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
        auth_outcome="signed_in",
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
    email = _normalize_email(str(profile.get("email", "")))
    full_name = str(profile.get("name", "")).strip() or email.split("@")[0].replace(".", " ").title()
    email_verified = str(profile.get("email_verified", "true")).lower() in {"true", "1", "yes"}
    if not subject or not email:
        raise ApiException(status_code=401, code="invalid_google_token", message="Google profile is missing required identity fields.")
    return GoogleIdentity(subject=subject, email=email, full_name=full_name, email_verified=email_verified)


async def authenticate_google(
    db: AsyncSession,
    *,
    access_token: str | None,
    id_token: str | None,
    intent: Literal["sign_in", "sign_up"],
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
        if intent == "sign_up":
            raise ApiException(
                status_code=409,
                code="google_already_connected",
                message="This Google account is already connected. Continue signing in instead.",
            )
        user = existing_identity.user
        existing_identity.email = identity.email
        user.email = identity.email
        user.full_name = identity.full_name
        if identity.email_verified and user.email_verified_at is None:
            user.email_verified_at = utc_now()
        await db.commit()
        return await issue_session(
            db,
            user,
            auth_mode="google",
            transport=transport,
            client_label=client_label,
            client_metadata={"provider": "google"},
            auth_outcome="signed_in",
        )

    user = await _get_user_by_email(db, identity.email)
    if user is not None:
        if not _user_email_verified(user):
            raise ApiException(
                status_code=409,
                code="email_verification_required_for_link",
                message="A Saayro account exists with this email, but it is not verified yet. Verify that account before linking Google.",
            )
        db.add(UserIdentity(user_id=user.id, provider="google", provider_user_id=identity.subject, email=identity.email))
        user.full_name = identity.full_name or user.full_name
        if identity.email_verified and user.email_verified_at is None:
            user.email_verified_at = utc_now()
        await db.commit()
        await db.refresh(user)
        return await issue_session(
            db,
            user,
            auth_mode="google",
            transport=transport,
            client_label=client_label,
            client_metadata={"provider": "google", "linked": True},
            auth_outcome="linked_account",
        )

    user = User(
        email=identity.email,
        full_name=identity.full_name,
        email_verified_at=utc_now() if identity.email_verified else None,
        home_base="Delhi",
        preferences=default_preferences(),
    )
    db.add(user)
    await db.flush()
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
        auth_outcome="signed_up",
    )


async def _queue_outbox_message(
    db: AsyncSession,
    *,
    kind: str,
    recipient: str,
    subject: str,
    body: str,
    metadata_json: dict[str, object] | None = None,
) -> None:
    db.add(
        OutboxMessage(
            kind=kind,
            recipient=recipient,
            subject=subject,
            body=body,
            metadata_json=metadata_json or {},
        )
    )
    await db.flush()


async def _ensure_token_cooldown(
    db: AsyncSession,
    *,
    user_id: str,
    purpose: str,
    cooldown_seconds: int,
    message: str,
) -> None:
    result = await db.execute(
        select(AccountToken)
        .where(AccountToken.user_id == user_id, AccountToken.purpose == purpose, AccountToken.consumed_at.is_(None))
        .order_by(desc(AccountToken.created_at))
    )
    latest = result.scalars().first()
    if latest and (utc_now() - _normalize_datetime(latest.created_at)).total_seconds() < cooldown_seconds:
        raise ApiException(status_code=429, code="cooldown_active", message=message, retryable=True)


async def _issue_account_token(
    db: AsyncSession,
    *,
    user: User,
    purpose: Literal["verify_email", "reset_password"],
    ttl_minutes: int,
    cooldown_seconds: int,
    metadata_json: dict[str, object] | None = None,
) -> str:
    settings = get_settings()
    cooldown_message = (
        "A verification email was sent recently. Give it a moment before requesting another one."
        if purpose == "verify_email"
        else "A reset email was sent recently. Give it a moment before requesting another one."
    )
    await _ensure_token_cooldown(
        db,
        user_id=user.id,
        purpose=purpose,
        cooldown_seconds=cooldown_seconds,
        message=cooldown_message,
    )
    raw_token = generate_one_time_token()
    db.add(
        AccountToken(
            user_id=user.id,
            purpose=purpose,
            token_hash=hash_one_time_token(raw_token),
            expires_at=_expiry_from_minutes(ttl_minutes),
            metadata_json=metadata_json or {},
        )
    )
    await db.flush()
    action_path = "/auth/reset-password" if purpose == "reset_password" else "/app/onboarding"
    await _queue_outbox_message(
        db,
        kind=purpose,
        recipient=user.email,
        subject="Saayro account action required",
        body=f"{settings.web_app_url}{action_path}?token={raw_token}",
        metadata_json={"token": raw_token, "purpose": purpose},
    )
    return raw_token


async def _consume_account_token(
    db: AsyncSession,
    *,
    token: str,
    purpose: Literal["verify_email", "reset_password"],
) -> AccountToken:
    result = await db.execute(
        select(AccountToken)
        .where(AccountToken.token_hash == hash_one_time_token(token), AccountToken.purpose == purpose)
        .options(selectinload(AccountToken.user))
    )
    record = result.scalar_one_or_none()
    if record is None:
        raise ApiException(status_code=404, code="token_not_found", message="This link is no longer available.")
    if record.consumed_at is not None:
        raise ApiException(status_code=409, code="token_already_used", message="This link has already been used.")
    if _normalize_datetime(record.expires_at) <= utc_now():
        raise ApiException(status_code=410, code="token_expired", message="This link has expired. Request a fresh one.")
    record.consumed_at = utc_now()
    await db.flush()
    return record


async def request_email_verification(db: AsyncSession, user: User) -> AuthStatusRead:
    settings = get_settings()
    if _user_email_verified(user):
        return AuthStatusRead(message="This email is already verified.")
    await _issue_account_token(
        db,
        user=user,
        purpose="verify_email",
        ttl_minutes=settings.auth_email_verification_ttl_minutes,
        cooldown_seconds=settings.auth_email_verification_cooldown_seconds,
        metadata_json={"email": user.email},
    )
    await db.commit()
    return AuthStatusRead(message="A verification email was added to the local outbox.")


async def verify_email_token(db: AsyncSession, token: str) -> AuthStatusRead:
    record = await _consume_account_token(db, token=token, purpose="verify_email")
    record.user.email_verified_at = utc_now()
    await db.commit()
    return AuthStatusRead(message="Email verified. You can continue into Saayro.")


async def request_password_reset(db: AsyncSession, email: str) -> AuthStatusRead:
    settings = get_settings()
    user = await _get_user_by_email(db, _normalize_email(email))
    if user is None:
        return AuthStatusRead(message="If an account exists, a reset email was added to the local outbox.")
    if not user.password_hash:
        raise ApiException(
            status_code=409,
            code="password_sign_in_unavailable",
            message="This account does not use a Saayro password yet. Continue with Google or mobile instead.",
        )
    await _issue_account_token(
        db,
        user=user,
        purpose="reset_password",
        ttl_minutes=settings.auth_password_reset_ttl_minutes,
        cooldown_seconds=settings.auth_password_reset_cooldown_seconds,
        metadata_json={"email": user.email},
    )
    await db.commit()
    return AuthStatusRead(message="A password reset email was added to the local outbox.")


async def reset_password_with_token(db: AsyncSession, token: str, password: str) -> AuthStatusRead:
    settings = get_settings()
    if len(password) < settings.auth_password_min_length:
        raise ApiException(
            status_code=400,
            code="validation_error",
            message=f"Password must be at least {settings.auth_password_min_length} characters.",
        )
    record = await _consume_account_token(db, token=token, purpose="reset_password")
    record.user.password_hash = create_password_hash(password)
    await db.commit()
    return AuthStatusRead(message="Password updated. Sign in with your Saayro account.")


async def sign_up_with_email_password(
    db: AsyncSession,
    *,
    email: str,
    password: str,
    full_name: str,
    transport: str,
    client_label: str,
) -> SessionEnvelope:
    settings = get_settings()
    normalized_email = _normalize_email(email)
    if len(password) < settings.auth_password_min_length:
        raise ApiException(
            status_code=400,
            code="validation_error",
            message=f"Password must be at least {settings.auth_password_min_length} characters.",
        )
    existing_user = await _get_user_by_email(db, normalized_email)
    if existing_user is not None:
        if existing_user.password_hash and not _user_email_verified(existing_user):
            raise ApiException(
                status_code=409,
                code="email_verification_pending",
                message="A Saayro account already exists with this email. Verify it or reset your password to continue.",
            )
        if existing_user.password_hash:
            raise ApiException(
                status_code=409,
                code="account_exists_email",
                message="An account already exists with this email. Please sign in.",
            )
        raise ApiException(
            status_code=409,
            code="account_exists_email",
            message="This email is already linked to an account. Continue signing in instead.",
        )

    user = User(
        email=normalized_email,
        full_name=full_name.strip(),
        password_hash=create_password_hash(password),
        preferences=default_preferences(),
    )
    db.add(user)
    await db.flush()
    await _issue_account_token(
        db,
        user=user,
        purpose="verify_email",
        ttl_minutes=settings.auth_email_verification_ttl_minutes,
        cooldown_seconds=settings.auth_email_verification_cooldown_seconds,
        metadata_json={"email": user.email},
    )
    await db.commit()
    await db.refresh(user)
    return await issue_session(
        db,
        user,
        auth_mode="password",
        transport=transport,
        client_label=client_label,
        client_metadata={"provider": "password"},
        auth_outcome="signed_up",
    )


async def sign_in_with_email_password(
    db: AsyncSession,
    *,
    email: str,
    password: str,
    transport: str,
    client_label: str,
) -> SessionEnvelope:
    user = await _get_user_by_email(db, _normalize_email(email))
    if user is None:
        raise ApiException(status_code=401, code="invalid_credentials", message="Email or password is incorrect.")
    if not user.password_hash:
        raise ApiException(
            status_code=409,
            code="password_sign_in_unavailable",
            message="This account does not use a Saayro password. Continue with Google instead.",
        )
    if not verify_password_hash(password, user.password_hash):
        raise ApiException(status_code=401, code="invalid_credentials", message="Email or password is incorrect.")
    return await issue_session(
        db,
        user,
        auth_mode="password",
        transport=transport,
        client_label=client_label,
        client_metadata={"provider": "password"},
        auth_outcome="signed_in",
    )


async def request_otp_challenge(
    db: AsyncSession,
    phone_number: str,
    *,
    intent: Literal["sign_in", "sign_up", "verify_phone"] = "sign_in",
) -> OtpChallengeRead:
    settings = get_settings()
    normalized_phone = _normalize_phone(phone_number)
    if normalized_phone is None:
        raise ApiException(status_code=400, code="validation_error", message="A valid mobile number is required.")

    user = await _get_user_by_phone(db, normalized_phone)
    if intent == "sign_up" and user is not None and _user_phone_verified(user):
        raise ApiException(
            status_code=409,
            code="phone_already_linked",
            message="This mobile number is already linked to an account. Please sign in.",
        )
    if intent == "sign_in" and (user is None or not _user_phone_verified(user)):
        raise ApiException(
            status_code=409,
            code="phone_account_not_found",
            message="No verified account was found for this mobile number. Please sign up instead.",
        )
    if intent == "verify_phone" and user is not None and _user_phone_verified(user):
        raise ApiException(
            status_code=409,
            code="phone_already_linked",
            message="This mobile number is already linked to another account. Use a different number or sign in instead.",
        )

    result = await db.execute(
        select(OtpChallenge).where(OtpChallenge.phone_number == normalized_phone).order_by(desc(OtpChallenge.created_at))
    )
    latest = result.scalars().first()
    if latest and (utc_now() - _normalize_datetime(latest.created_at)).total_seconds() < settings.auth_otp_cooldown_seconds:
        raise ApiException(
            status_code=429,
            code="cooldown_active",
            message="An OTP was requested recently. Wait a moment before trying again.",
            retryable=True,
        )

    challenge = OtpChallenge(
        phone_number=normalized_phone,
        intent=intent,
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
        intent=challenge.intent,  # type: ignore[arg-type]
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
            intent=challenge.intent,  # type: ignore[arg-type]
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
            intent=challenge.intent,  # type: ignore[arg-type]
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
            intent=challenge.intent,  # type: ignore[arg-type]
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
        intent=challenge.intent,  # type: ignore[arg-type]
        status="failed",
        provider=challenge.provider,
        live=True,
        message="OTP code is invalid.",
        expires_at=challenge.expires_at,
    )


async def list_outbox_messages(db: AsyncSession) -> list[OutboxMessage]:
    result = await db.execute(select(OutboxMessage).order_by(desc(OutboxMessage.created_at)))
    return list(result.scalars().all())
