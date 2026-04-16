from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from saayro_api.db.base import Base, IdTimestampMixin


class ConnectedAccount(IdTimestampMixin, Base):
    __tablename__ = "connected_accounts"
    __table_args__ = (UniqueConstraint("user_id", "provider", name="uq_connected_accounts_user_provider"),)

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    provider: Mapped[str] = mapped_column(String(50))
    label: Mapped[str] = mapped_column(String(255))
    state: Mapped[str] = mapped_column(String(50))
    granted_scopes: Mapped[list[str]] = mapped_column(JSON, default=list)
    capabilities_json: Mapped[list[str]] = mapped_column(JSON, default=list)
    provider_account_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    provider_account_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    provider_account_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sealed_access_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    sealed_refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_imported_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    attached_item_count: Mapped[int] = mapped_column(Integer, default=0)
    review_needed_item_count: Mapped[int] = mapped_column(Integer, default=0)
    imported_item_count: Mapped[int] = mapped_column(Integer, default=0)
    status_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

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

    @property
    def provider(self) -> str:
        return self.connected_account.provider if self.connected_account is not None else "gmail"
