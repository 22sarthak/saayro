from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from saayro_api.db.base import Base, IdTimestampMixin


class ConnectedAccount(IdTimestampMixin, Base):
    __tablename__ = "connected_accounts"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    provider: Mapped[str] = mapped_column(String(50))
    label: Mapped[str] = mapped_column(String(255))
    state: Mapped[str] = mapped_column(String(50))
    granted_scopes: Mapped[list[str]] = mapped_column(JSON, default=list)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="connected_accounts")
    items = relationship("ConnectedTravelItem", back_populates="connected_account", cascade="all, delete-orphan")


class ConnectedTravelItem(IdTimestampMixin, Base):
    __tablename__ = "connected_travel_items"

    connected_account_id: Mapped[str] = mapped_column(ForeignKey("connected_accounts.id", ondelete="CASCADE"))
    trip_id: Mapped[str | None] = mapped_column(ForeignKey("trips.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(255))
    item_type: Mapped[str] = mapped_column(String(50))
    state: Mapped[str] = mapped_column(String(50))
    confidence: Mapped[str] = mapped_column(String(50))
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    metadata_json: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)

    connected_account = relationship("ConnectedAccount", back_populates="items")
    trip = relationship("Trip", back_populates="connected_items")

