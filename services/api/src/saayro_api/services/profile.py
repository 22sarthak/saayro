from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from saayro_api.core.errors import ApiException
from saayro_api.core.security import utc_now
from saayro_api.models.users import User
from saayro_api.schemas.profile import ProfileRead, ProfileUpdate


def _normalize_phone(value: str | None) -> str | None:
    if value is None:
        return None
    compact = "".join(character for character in value if character.isdigit() or character == "+")
    return compact or None


def _to_profile_read(user: User) -> ProfileRead:
    return ProfileRead(
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        home_base=user.home_base,
        phone_number=user.phone_number,
        date_of_birth=user.date_of_birth,
        age_range=user.age_range,
        preferences=user.preferences or {},
        email_verified=user.email_verified_at is not None,
        phone_verified=user.phone_verified_at is not None and user.phone_number is not None,
        needs_onboarding=user.onboarding_completed_at is None or not user.full_name.strip(),
        onboarding_completed=user.onboarding_completed_at is not None,
    )


async def _get_user_or_404(db: AsyncSession, user_id: str) -> User:
    user = await db.get(User, user_id)
    if user is None:
        raise ApiException(status_code=404, code="not_found", message="User not found.")
    return user


async def get_profile(db: AsyncSession, user_id: str) -> ProfileRead:
    return _to_profile_read(await _get_user_or_404(db, user_id))


async def update_profile(db: AsyncSession, user_id: str, payload: ProfileUpdate) -> ProfileRead:
    user = await _get_user_or_404(db, user_id)

    if payload.full_name is not None:
        user.full_name = payload.full_name.strip()
    if payload.home_base is not None:
        user.home_base = payload.home_base.strip() or None
    if payload.date_of_birth is not None:
        user.date_of_birth = payload.date_of_birth
    if payload.age_range is not None:
        user.age_range = payload.age_range.strip() or None
    if payload.preferences is not None:
        user.preferences = payload.preferences

    if payload.phone_number is not None:
        normalized_phone = _normalize_phone(payload.phone_number)
        if normalized_phone != user.phone_number:
            if normalized_phone:
                result = await db.execute(select(User).where(User.phone_number == normalized_phone, User.id != user.id))
                conflicting_user = result.scalar_one_or_none()
                if conflicting_user is not None and conflicting_user.phone_verified_at is not None:
                    raise ApiException(
                        status_code=409,
                        code="phone_already_linked",
                        message="This mobile number is already linked to an account. Please sign in.",
                    )
            user.phone_number = normalized_phone
            user.phone_verified_at = None

    if payload.complete_onboarding:
        if not payload.confirm_full_name:
            raise ApiException(
                status_code=400,
                code="validation_error",
                message="Confirm the full name before finishing onboarding.",
            )
        if not user.full_name.strip():
            raise ApiException(
                status_code=400,
                code="validation_error",
                message="Full name is required before onboarding can finish.",
            )
        user.onboarding_completed_at = utc_now()

    await db.commit()
    await db.refresh(user)
    return _to_profile_read(user)
