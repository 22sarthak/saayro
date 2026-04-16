from __future__ import annotations

from datetime import date

from sqlalchemy import JSON, Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from saayro_api.db.base import Base, IdTimestampMixin


class Trip(IdTimestampMixin, Base):
    __tablename__ = "trips"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(255))
    destination_city: Mapped[str] = mapped_column(String(255))
    destination_region: Mapped[str] = mapped_column(String(255))
    destination_country: Mapped[str] = mapped_column(String(255))
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(50))
    party: Mapped[str] = mapped_column(String(50))
    overview: Mapped[str] = mapped_column(Text)
    highlights: Mapped[list[str]] = mapped_column(JSON, default=list)
    preferences: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)

    user = relationship("User", back_populates="trips")
    itinerary_days = relationship("ItineraryDay", back_populates="trip", cascade="all, delete-orphan")
    buddy_thread = relationship("BuddyThread", back_populates="trip", uselist=False, cascade="all, delete-orphan")
    export_jobs = relationship("ExportJob", back_populates="trip", cascade="all, delete-orphan")
    connected_items = relationship("ConnectedTravelItem", back_populates="trip")

