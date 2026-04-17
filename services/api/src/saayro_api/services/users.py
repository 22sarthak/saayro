from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from saayro_api.core.config import get_settings
from saayro_api.core.security import utc_now
from saayro_api.models.users import User
from saayro_api.services.auth import default_preferences


async def ensure_demo_user(db: AsyncSession) -> User:
    settings = get_settings()
    result = await db.execute(select(User).where(User.email == settings.demo_user_email))
    user = result.scalar_one_or_none()
    if user is not None:
        return user

    user = User(
        email=settings.demo_user_email,
        full_name=settings.demo_user_name,
        home_base="Delhi",
        email_verified_at=utc_now(),
        onboarding_completed_at=utc_now(),
        preferences=default_preferences(),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email.lower()))
    return result.scalar_one_or_none()
