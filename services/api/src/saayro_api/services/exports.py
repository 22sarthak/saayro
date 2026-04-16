from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from saayro_api.models.exports import ExportJob
from saayro_api.schemas.exports import ExportJobRead
from saayro_api.services.trips import get_trip_model_or_404


def _export_metadata(fmt: str) -> tuple[str, str, str]:
    mapping = {
        "pdf": ("Trip PDF", "A polished itinerary export for travelers and coordinators.", "ready"),
        "whatsapp": ("WhatsApp Share", "Compact day-by-day sharing copy.", "ready"),
        "share-link": ("Shareable Link", "A read-only link for trip companions.", "ready"),
        "notes": ("Notes Copy", "A portable notes-ready trip summary.", "pending"),
    }
    return mapping.get(fmt, ("Export Pack", "A placeholder export job.", "pending"))


async def list_export_jobs(db: AsyncSession, user_id: str, trip_id: str) -> list[ExportJobRead]:
    trip = await get_trip_model_or_404(db, user_id, trip_id)
    result = await db.execute(select(ExportJob).where(ExportJob.trip_id == trip.id).order_by(ExportJob.created_at.desc()))
    return [ExportJobRead.model_validate(item) for item in result.scalars().all()]


async def create_export_job(db: AsyncSession, user_id: str, trip_id: str, fmt: str) -> ExportJobRead:
    trip = await get_trip_model_or_404(db, user_id, trip_id)
    label, description, status = _export_metadata(fmt)
    job = ExportJob(
        trip_id=trip.id,
        format=fmt,
        label=label,
        description=description,
        status=status,
        artifact_location=f"/placeholder/exports/{trip.id}/{fmt}",
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return ExportJobRead.model_validate(job)

