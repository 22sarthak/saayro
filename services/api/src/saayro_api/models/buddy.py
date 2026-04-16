from __future__ import annotations

from sqlalchemy import JSON, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from saayro_api.db.base import Base, IdTimestampMixin


class BuddyThread(IdTimestampMixin, Base):
    __tablename__ = "buddy_threads"

    trip_id: Mapped[str] = mapped_column(ForeignKey("trips.id", ondelete="CASCADE"), unique=True)

    trip = relationship("Trip", back_populates="buddy_thread")
    messages = relationship("BuddyMessage", back_populates="thread", cascade="all, delete-orphan")


class BuddyMessage(IdTimestampMixin, Base):
    __tablename__ = "buddy_messages"

    thread_id: Mapped[str] = mapped_column(ForeignKey("buddy_threads.id", ondelete="CASCADE"))
    trip_id: Mapped[str] = mapped_column(ForeignKey("trips.id", ondelete="CASCADE"))
    role: Mapped[str] = mapped_column(String(50))
    content: Mapped[str] = mapped_column(Text)
    confidence: Mapped[str | None] = mapped_column(String(50), nullable=True)
    actions: Mapped[list[dict[str, object]] | None] = mapped_column(JSON, nullable=True)
    response_json: Mapped[dict[str, object] | None] = mapped_column(JSON, nullable=True)
    scope_class: Mapped[str | None] = mapped_column(String(50), nullable=True)
    provider_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    model_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fallback_used: Mapped[bool] = mapped_column(default=False)

    thread = relationship("BuddyThread", back_populates="messages")
