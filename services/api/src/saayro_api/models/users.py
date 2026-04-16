from __future__ import annotations

from sqlalchemy import JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from saayro_api.db.base import Base, IdTimestampMixin


class User(IdTimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True)
    full_name: Mapped[str] = mapped_column(String(255))
    home_base: Mapped[str | None] = mapped_column(String(255), nullable=True)
    preferences: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)

    trips = relationship("Trip", back_populates="user")
    connected_accounts = relationship("ConnectedAccount", back_populates="user")

