from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from saayro_api.models.connections import ConnectedAccount, ConnectedTravelItem
from saayro_api.schemas.connections import ConnectedAccountRead, ConnectedTravelItemRead
from saayro_api.services.google_connectors import list_connector_accounts
from saayro_api.services.trips import get_trip_model_or_404


async def list_connected_accounts(db: AsyncSession, user_id: str) -> list[ConnectedAccountRead]:
    return await list_connector_accounts(db, user_id)


async def list_connected_travel_items(db: AsyncSession, user_id: str, trip_id: str) -> list[ConnectedTravelItemRead]:
    trip = await get_trip_model_or_404(db, user_id, trip_id)
    result = await db.execute(
        select(ConnectedTravelItem)
        .options(selectinload(ConnectedTravelItem.connected_account))
        .join(ConnectedAccount, ConnectedTravelItem.connected_account_id == ConnectedAccount.id)
        .where(ConnectedAccount.user_id == user_id, ConnectedTravelItem.trip_id == trip.id)
        .order_by(ConnectedTravelItem.start_at.asc())
    )
    return [ConnectedTravelItemRead.model_validate(item) for item in result.scalars().all()]
