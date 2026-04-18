from sqlalchemy import case, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from saayro_api.core.errors import ApiException
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


async def list_connected_travel_review_items(
    db: AsyncSession,
    user_id: str,
    state: str | None = None,
) -> list[ConnectedTravelItemRead]:
    query = (
        select(ConnectedTravelItem)
        .options(
            selectinload(ConnectedTravelItem.connected_account),
            selectinload(ConnectedTravelItem.trip),
        )
        .join(ConnectedAccount, ConnectedTravelItem.connected_account_id == ConnectedAccount.id)
        .where(ConnectedAccount.user_id == user_id)
    )
    if state is not None:
        query = query.where(ConnectedTravelItem.state == state)

    state_rank = case(
        (ConnectedTravelItem.state == "candidate", 0),
        (ConnectedTravelItem.state == "attached", 1),
        (ConnectedTravelItem.state == "ignored", 2),
        else_=3,
    )
    result = await db.execute(query.order_by(state_rank.asc(), ConnectedTravelItem.start_at.asc()))
    return [ConnectedTravelItemRead.model_validate(item) for item in result.scalars().all()]


async def review_connected_travel_item(
    db: AsyncSession,
    *,
    user_id: str,
    item_id: str,
    action: str,
    trip_id: str | None = None,
) -> ConnectedTravelItemRead:
    result = await db.execute(
        select(ConnectedTravelItem)
        .options(
            selectinload(ConnectedTravelItem.connected_account),
            selectinload(ConnectedTravelItem.trip),
        )
        .join(ConnectedAccount, ConnectedTravelItem.connected_account_id == ConnectedAccount.id)
        .where(ConnectedTravelItem.id == item_id, ConnectedAccount.user_id == user_id)
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise ApiException(status_code=404, code="not_found", message="Connected Travel item not found.")

    if action == "attach":
        if not trip_id:
            raise ApiException(status_code=400, code="validation_error", message="Trip is required to attach this travel item.")
        trip = await get_trip_model_or_404(db, user_id, trip_id)
        item.trip_id = trip.id
        item.trip = trip
        item.state = "attached"
    elif action == "ignore":
        item.trip_id = None
        item.trip = None
        item.state = "ignored"
    else:
        raise ApiException(status_code=400, code="validation_error", message="Unsupported review action.")

    await _recompute_connected_account_status(db, item.connected_account_id)
    await db.commit()
    refreshed = await db.execute(
        select(ConnectedTravelItem)
        .options(
            selectinload(ConnectedTravelItem.connected_account),
            selectinload(ConnectedTravelItem.trip),
        )
        .where(ConnectedTravelItem.id == item_id)
    )
    updated_item = refreshed.scalar_one()
    return ConnectedTravelItemRead.model_validate(updated_item)


async def _recompute_connected_account_status(db: AsyncSession, account_id: str) -> None:
    account = await db.get(ConnectedAccount, account_id)
    if account is None:
        return

    result = await db.execute(select(ConnectedTravelItem.state).where(ConnectedTravelItem.connected_account_id == account_id))
    states = list(result.scalars().all())
    imported_count = len(states)
    attached_count = sum(1 for state in states if state == "attached")
    review_needed_count = sum(1 for state in states if state == "candidate")

    account.imported_item_count = imported_count
    account.attached_item_count = attached_count
    account.review_needed_item_count = review_needed_count
    account.state = "partial" if review_needed_count > 0 else "connected"
    if imported_count == 0:
        account.status_message = "Connected, but no travel-relevant items surfaced in the current review window."
    elif review_needed_count > 0:
        account.status_message = "Connected Travel imported travel context and left the lighter matches review-ready."
    elif attached_count > 0:
        account.status_message = "Connected Travel review is up to date and attached items are linked to trips."
    else:
        account.status_message = "Connected Travel review is up to date. Imported items are being kept out of trips."
