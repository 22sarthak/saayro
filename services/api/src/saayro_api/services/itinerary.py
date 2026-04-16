from __future__ import annotations

from collections.abc import Sequence
from datetime import timedelta

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from saayro_api.models.itinerary import ItineraryDay, ItineraryStop
from saayro_api.schemas.itinerary import (
    ItineraryDayRead,
    ItineraryRead,
    ItineraryStopRead,
    ItineraryUpdateResponse,
)
from saayro_api.services.trips import get_trip_model_or_404


def _serialize_day(day: ItineraryDay) -> ItineraryDayRead:
    return ItineraryDayRead(
        id=day.id,
        day_number=day.day_number,
        date=day.date,
        title=day.title,
        summary=day.summary,
        stops=[ItineraryStopRead.model_validate(stop) for stop in sorted(day.stops, key=lambda value: value.start_time)],
    )


def _serialize_itinerary(trip_id: str, days: Sequence[ItineraryDay]) -> ItineraryRead:
    return ItineraryRead(trip_id=trip_id, days=[_serialize_day(day) for day in sorted(days, key=lambda value: value.day_number)])


async def get_itinerary_or_404(db: AsyncSession, user_id: str, trip_id: str) -> ItineraryRead:
    trip = await get_trip_model_or_404(db, user_id, trip_id)
    result = await db.execute(
        select(ItineraryDay).where(ItineraryDay.trip_id == trip.id).options(selectinload(ItineraryDay.stops)).order_by(ItineraryDay.day_number.asc())
    )
    return _serialize_itinerary(trip.id, result.scalars().unique().all())


async def generate_itinerary(db: AsyncSession, user_id: str, trip_id: str) -> ItineraryUpdateResponse:
    trip = await get_trip_model_or_404(db, user_id, trip_id)
    await db.execute(delete(ItineraryStop).where(ItineraryStop.day_id.in_(select(ItineraryDay.id).where(ItineraryDay.trip_id == trip.id))))
    await db.execute(delete(ItineraryDay).where(ItineraryDay.trip_id == trip.id))

    total_days = (trip.end_date - trip.start_date).days + 1
    for index in range(total_days):
        day_date = trip.start_date + timedelta(days=index)
        day = ItineraryDay(
            trip_id=trip.id,
            day_number=index + 1,
            date=day_date,
            title="Arrival and orientation" if index == 0 else f"Day {index + 1} travel rhythm",
            summary=f"Placeholder itinerary day for {trip.destination_city}, ready for real planning logic later.",
        )
        db.add(day)
        await db.flush()
        db.add_all(
            [
                ItineraryStop(
                    day_id=day.id,
                    title=f"Check in around {trip.destination_city}" if index == 0 else f"Explore {trip.destination_city}",
                    stop_type="stay" if index == 0 else "activity",
                    city=trip.destination_city,
                    subtitle="Placeholder stop created by backend basics.",
                    start_time="14:00" if index == 0 else "10:00",
                    end_time="15:00" if index == 0 else "12:00",
                    confidence="medium",
                    tags=["placeholder", "backend-basics"],
                    note="This stop will be replaced by real itinerary logic later.",
                    route_metadata={
                        "id": f"route-{trip.id}-{index + 1}",
                        "origin_label": "Trip Hub",
                        "destination_label": trip.destination_city,
                        "mode": "drive",
                        "duration_minutes": 20,
                        "distance_kilometers": 8.5,
                        "maps_app_options": ["google-maps", "in-app-preview"],
                    },
                ),
                ItineraryStop(
                    day_id=day.id,
                    title="Dinner anchor",
                    stop_type="meal",
                    city=trip.destination_city,
                    subtitle="A calm meal placeholder to keep day pacing visible.",
                    start_time="20:00",
                    end_time="21:15",
                    confidence="medium",
                    tags=["meal", "placeholder"],
                    note="Kept intentionally generic until real planning logic lands.",
                ),
            ]
        )

    await db.commit()
    return ItineraryUpdateResponse(
        trip_id=trip.id,
        operation="generate",
        message="Placeholder itinerary generated for backend basics.",
        itinerary=await get_itinerary_or_404(db, user_id, trip.id),
    )


async def optimize_itinerary(db: AsyncSession, user_id: str, trip_id: str, goal: str) -> ItineraryUpdateResponse:
    trip = await get_trip_model_or_404(db, user_id, trip_id)
    result = await db.execute(
        select(ItineraryDay)
        .where(ItineraryDay.trip_id == trip.id)
        .options(selectinload(ItineraryDay.stops))
        .order_by(ItineraryDay.day_number.asc())
    )
    days = result.scalars().unique().all()
    if not days:
        return await generate_itinerary(db, user_id, trip_id)

    for day in days:
        day.summary = f"{day.summary} Optimized for {goal} in placeholder mode."

    await db.commit()
    return ItineraryUpdateResponse(
        trip_id=trip.id,
        operation="optimize",
        message=f"Placeholder itinerary optimized for {goal}.",
        itinerary=_serialize_itinerary(trip.id, days),
    )
