from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from saayro_api.core.errors import ApiException
from saayro_api.models.trips import Trip
from saayro_api.schemas.trips import TripCreate, TripListItem, TripRead, TripUpdate


def _trip_query(user_id: str) -> Any:
    return (
        select(Trip)
        .where(Trip.user_id == user_id)
        .options(selectinload(Trip.itinerary_days), selectinload(Trip.export_jobs), selectinload(Trip.connected_items))
        .order_by(Trip.start_date.asc())
    )


def _to_trip_read(trip: Trip) -> TripRead:
    return TripRead(
        id=trip.id,
        title=trip.title,
        destination_city=trip.destination_city,
        destination_region=trip.destination_region,
        destination_country=trip.destination_country,
        start_date=trip.start_date,
        end_date=trip.end_date,
        status=trip.status,
        party=trip.party,
        highlights=trip.highlights,
        preferences=trip.preferences,
        overview=trip.overview,
        created_at=trip.created_at,
        updated_at=trip.updated_at,
    )


async def list_trips(db: AsyncSession, user_id: str) -> list[TripListItem]:
    result = await db.execute(_trip_query(user_id))
    return [TripListItem.model_validate(item) for item in result.scalars().unique().all()]


async def get_trip_model_or_404(db: AsyncSession, user_id: str, trip_id: str) -> Trip:
    result = await db.execute(_trip_query(user_id).where(Trip.id == trip_id))
    trip = result.scalar_one_or_none()
    if trip is None:
        raise ApiException(status_code=404, code="not_found", message="Trip not found.")
    return trip


async def get_trip_or_404(db: AsyncSession, user_id: str, trip_id: str) -> TripRead:
    return _to_trip_read(await get_trip_model_or_404(db, user_id, trip_id))


async def create_trip(db: AsyncSession, user_id: str, payload: TripCreate) -> TripRead:
    if payload.end_date < payload.start_date:
        raise ApiException(status_code=400, code="validation_error", message="End date must be on or after start date.")

    trip = Trip(
        user_id=user_id,
        title=payload.title,
        destination_city=payload.destination_city,
        destination_region=payload.destination_region,
        destination_country=payload.destination_country,
        start_date=payload.start_date,
        end_date=payload.end_date,
        status="planned",
        party=payload.party,
        overview=payload.overview,
        highlights=payload.highlights,
        preferences=payload.preferences.model_dump(),
    )
    db.add(trip)
    await db.commit()
    await db.refresh(trip)
    return _to_trip_read(trip)


async def update_trip(db: AsyncSession, user_id: str, trip_id: str, payload: TripUpdate) -> TripRead:
    trip = await get_trip_model_or_404(db, user_id, trip_id)
    if payload.title is not None:
        trip.title = payload.title
    if payload.status is not None:
        trip.status = payload.status
    if payload.overview is not None:
        trip.overview = payload.overview
    if payload.highlights is not None:
        trip.highlights = payload.highlights
    trip.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(trip)
    return _to_trip_read(trip)
