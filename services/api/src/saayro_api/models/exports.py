from __future__ import annotations

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from saayro_api.db.base import Base, IdTimestampMixin


class ExportJob(IdTimestampMixin, Base):
    __tablename__ = "export_jobs"

    trip_id: Mapped[str] = mapped_column(ForeignKey("trips.id", ondelete="CASCADE"))
    format: Mapped[str] = mapped_column(String(50))
    label: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(50))
    artifact_location: Mapped[str | None] = mapped_column(String(512), nullable=True)

    trip = relationship("Trip", back_populates="export_jobs")

