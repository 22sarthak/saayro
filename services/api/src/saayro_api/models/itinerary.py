from __future__ import annotations

from datetime import date

from sqlalchemy import JSON, Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from saayro_api.db.base import Base, IdTimestampMixin


class ItineraryDay(IdTimestampMixin, Base):
    __tablename__ = "itinerary_days"

    trip_id: Mapped[str] = mapped_column(ForeignKey("trips.id", ondelete="CASCADE"))
    day_number: Mapped[int] = mapped_column(Integer)
    date: Mapped[date] = mapped_column(Date)
    title: Mapped[str] = mapped_column(String(255))
    summary: Mapped[str] = mapped_column(Text)

    trip = relationship("Trip", back_populates="itinerary_days")
    stops = relationship("ItineraryStop", back_populates="day", cascade="all, delete-orphan")


class ItineraryStop(IdTimestampMixin, Base):
    __tablename__ = "itinerary_stops"

    day_id: Mapped[str] = mapped_column(ForeignKey("itinerary_days.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255))
    stop_type: Mapped[str] = mapped_column(String(50))
    city: Mapped[str] = mapped_column(String(255))
    subtitle: Mapped[str] = mapped_column(Text)
    start_time: Mapped[str] = mapped_column(String(16))
    end_time: Mapped[str | None] = mapped_column(String(16), nullable=True)
    confidence: Mapped[str] = mapped_column(String(50))
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    route_metadata: Mapped[dict[str, object] | None] = mapped_column(JSON, nullable=True)

    day = relationship("ItineraryDay", back_populates="stops")
