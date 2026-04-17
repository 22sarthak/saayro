from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from saayro_api.ai.types import (
    BuddyItineraryDayContext,
    BuddyItineraryStopContext,
    BuddyTripContext,
    BuddyUserContext,
    ConnectedTravelSummary,
    ExportContext,
    SaayroBuddyContext,
    SavedPlaceContext,
)
from saayro_api.models.connections import ConnectedAccount, ConnectedTravelItem
from saayro_api.models.itinerary import ItineraryDay
from saayro_api.models.users import User
from saayro_api.services.trips import get_trip_model_or_404


async def build_buddy_context(db: AsyncSession, *, user_id: str, trip_id: str | None) -> SaayroBuddyContext:
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one()
    if trip_id is None:
        return SaayroBuddyContext(
            user=BuddyUserContext(
                user_id=user.id,
                full_name=user.full_name,
                email=user.email,
                preferences=user.preferences,
            ),
            trip=None,
            itinerary_days=[],
            saved_places=[],
            exports=[],
            connected_travel=ConnectedTravelSummary(
                connected_accounts=[],
                attached_items=[],
                summary="No trip exists yet, so Buddy should guide destination and trip-start planning first.",
            ),
        )

    trip = await get_trip_model_or_404(db, user_id, trip_id)
    day_result = await db.execute(
        select(ItineraryDay)
        .where(ItineraryDay.trip_id == trip.id)
        .options(selectinload(ItineraryDay.stops))
        .order_by(ItineraryDay.day_number.asc())
    )
    days = day_result.scalars().unique().all()
    accounts_result = await db.execute(
        select(ConnectedAccount).where(ConnectedAccount.user_id == user_id).order_by(ConnectedAccount.created_at.asc())
    )
    accounts = accounts_result.scalars().all()
    items_result = await db.execute(
        select(ConnectedTravelItem)
        .join(ConnectedAccount, ConnectedTravelItem.connected_account_id == ConnectedAccount.id)
        .where(ConnectedAccount.user_id == user_id, ConnectedTravelItem.trip_id == trip.id)
        .order_by(ConnectedTravelItem.start_at.asc())
    )
    items = items_result.scalars().all()

    itinerary_days = [
        BuddyItineraryDayContext(
            id=day.id,
            day_number=day.day_number,
            date=day.date,
            title=day.title,
            summary=day.summary,
            stops=[
                BuddyItineraryStopContext(
                    id=stop.id,
                    title=stop.title,
                    stop_type=stop.stop_type,
                    city=stop.city,
                    subtitle=stop.subtitle,
                    start_time=stop.start_time,
                    end_time=stop.end_time,
                    confidence=stop.confidence,
                    tags=stop.tags,
                    note=stop.note,
                    route_metadata=stop.route_metadata,
                )
                for stop in sorted(day.stops, key=lambda value: value.start_time)
            ],
        )
        for day in days
    ]
    saved_places = [
        SavedPlaceContext(
            id=stop.id,
            title=stop.title,
            city=stop.city,
            reason="Held from the itinerary for saved-place review.",
            tags=stop.tags,
        )
        for day in itinerary_days
        for stop in day.stops
        if stop.stop_type in {"activity", "meal", "stay"}
    ]
    exports = [
        ExportContext(id=job.id, format=job.format, label=job.label, status=job.status)
        for job in sorted(trip.export_jobs, key=lambda value: value.created_at, reverse=True)
    ]
    connected_summary = ConnectedTravelSummary(
        connected_accounts=[
            {"provider": account.provider, "label": account.label, "state": account.state}
            for account in accounts
        ],
        attached_items=[
            {
                "title": item.title,
                "item_type": item.item_type,
                "state": item.state,
                "confidence": item.confidence,
            }
            for item in items
        ],
        summary=(
            "Connected Travel has attached trip items ready for review."
            if items
            else "Connected Travel is available as a placeholder summary for this trip."
        ),
    )
    return SaayroBuddyContext(
        user=BuddyUserContext(
            user_id=user.id,
            full_name=user.full_name,
            email=user.email,
            preferences=user.preferences,
        ),
        trip=BuddyTripContext(
            id=trip.id,
            title=trip.title,
            destination_city=trip.destination_city,
            destination_region=trip.destination_region,
            destination_country=trip.destination_country,
            start_date=trip.start_date,
            end_date=trip.end_date,
            party=trip.party,
            overview=trip.overview,
            highlights=trip.highlights,
            preferences=trip.preferences,
        ),
        itinerary_days=itinerary_days,
        saved_places=saved_places[:8],
        exports=exports,
        connected_travel=connected_summary,
    )
