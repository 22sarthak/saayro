from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from saayro_api.api.deps import get_db, get_session_actor
from saayro_api.schemas.auth import SessionActor
from saayro_api.schemas.connections import ConnectedAccountRead, ConnectionConnectResponse
from saayro_api.services.connections import connect_provider_placeholder, list_connected_accounts

router = APIRouter(tags=["connections"])


@router.get("/connections", response_model=list[ConnectedAccountRead])
async def get_connections(
    db: AsyncSession = Depends(get_db),
    actor: SessionActor = Depends(get_session_actor),
) -> list[ConnectedAccountRead]:
    return await list_connected_accounts(db, actor.user_id)


@router.post("/connections/{provider}/connect", response_model=ConnectionConnectResponse, status_code=status.HTTP_201_CREATED)
async def post_connect_provider(
    provider: str,
    db: AsyncSession = Depends(get_db),
    actor: SessionActor = Depends(get_session_actor),
) -> ConnectionConnectResponse:
    return await connect_provider_placeholder(db, actor.user_id, provider)

