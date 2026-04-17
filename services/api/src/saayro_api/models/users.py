from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from saayro_api.db.base import Base, IdTimestampMixin


class User(IdTimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True)
    full_name: Mapped[str] = mapped_column(String(255))
    home_base: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(32), unique=True, nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email_verified_at: Mapped[datetime | None] = mapped_column(nullable=True)
    phone_verified_at: Mapped[datetime | None] = mapped_column(nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(nullable=True)
    age_range: Mapped[str | None] = mapped_column(String(50), nullable=True)
    onboarding_completed_at: Mapped[datetime | None] = mapped_column(nullable=True)
    preferences: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)

    trips = relationship("Trip", back_populates="user")
    connected_accounts = relationship("ConnectedAccount", back_populates="user")
    identities = relationship("UserIdentity", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
