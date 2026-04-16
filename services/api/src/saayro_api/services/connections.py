from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from saayro_api.core.errors import ApiException
from saayro_api.models.connections import ConnectedAccount, ConnectedTravelItem
from saayro_api.schemas.connections import (
    ConnectedAccountRead,
    ConnectedTravelItemRead,
    ConnectionConnectResponse,
)
from saayro_api.services.trips import get_trip_model_or_404

VALID_PROVIDERS = {"google", "gmail", "outlook", "calendar"}


async def list_connected_accounts(db: AsyncSession, user_id: str) -> list[ConnectedAccountRead]:
    result = await db.execute(select(ConnectedAccount).where(ConnectedAccount.user_id == user_id).order_by(ConnectedAccount.created_at.asc()))
    return [ConnectedAccountRead.model_validate(item) for item in result.scalars().all()]


async def connect_provider_placeholder(db: AsyncSession, user_id: str, provider: str) -> ConnectionConnectResponse:
    if provider not in VALID_PROVIDERS:
        raise ApiException(status_code=400, code="validation_error", message="Unsupported provider.")

    result = await db.execute(select(ConnectedAccount).where(ConnectedAccount.user_id == user_id, ConnectedAccount.provider == provider))
    account = result.scalar_one_or_none()
    if account is None:
        account = ConnectedAccount(
            user_id=user_id,
            provider=provider,
            label="Connected Travel inbox scan" if provider in {"gmail", "outlook"} else f"{provider.title()} account",
            state="partial" if provider in {"gmail", "outlook"} else "connected",
            granted_scopes=["profile", "email"] if provider == "google" else [f"{provider}.placeholder"],
            last_synced_at=datetime.now(timezone.utc),
        )
        db.add(account)
    else:
        account.state = "partial" if provider in {"gmail", "outlook"} else "connected"
        account.last_synced_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(account)
    return ConnectionConnectResponse(
        provider=provider,
        state=account.state,
        message="Placeholder provider connection updated.",
        account=ConnectedAccountRead.model_validate(account),
    )


async def list_connected_travel_items(db: AsyncSession, user_id: str, trip_id: str) -> list[ConnectedTravelItemRead]:
    trip = await get_trip_model_or_404(db, user_id, trip_id)
    result = await db.execute(
        select(ConnectedTravelItem)
        .join(ConnectedAccount, ConnectedTravelItem.connected_account_id == ConnectedAccount.id)
        .where(ConnectedAccount.user_id == user_id, ConnectedTravelItem.trip_id == trip.id)
        .order_by(ConnectedTravelItem.start_at.asc())
    )
    items = result.scalars().all()
    if items:
        return [ConnectedTravelItemRead.model_validate(item) for item in items]

    account_result = await db.execute(select(ConnectedAccount).where(ConnectedAccount.user_id == user_id).order_by(ConnectedAccount.created_at.asc()))
    account = account_result.scalars().first()
    if account is None:
        return []

    start_at = datetime.combine(trip.start_date, datetime.min.time(), tzinfo=timezone.utc)
    end_at = datetime.combine(trip.end_date, datetime.min.time(), tzinfo=timezone.utc)
    placeholder_items = [
        ConnectedTravelItem(
            connected_account_id=account.id,
            trip_id=trip.id,
            title=f"Flight into {trip.destination_city}",
            item_type="flight",
            state="attached",
            confidence="high",
            start_at=start_at + timedelta(hours=7),
            end_at=start_at + timedelta(hours=9),
            metadata_json={"pnr": "PLCHDR", "terminal": "T3"},
        ),
        ConnectedTravelItem(
            connected_account_id=account.id,
            trip_id=trip.id,
            title=f"{trip.title} hotel hold",
            item_type="hotel",
            state="candidate",
            confidence="medium",
            start_at=start_at + timedelta(hours=14),
            end_at=end_at + timedelta(hours=11),
            metadata_json={"booking_source": "Placeholder", "room_type": "Suite"},
        ),
    ]
    db.add_all(placeholder_items)
    await db.commit()
    return [ConnectedTravelItemRead.model_validate(item) for item in placeholder_items]
