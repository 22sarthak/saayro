from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from saayro_api.api.deps import get_db, get_session_actor
from saayro_api.schemas.auth import SessionActor
from saayro_api.schemas.connections import (
    ConnectedAccountRead,
    ConnectionDisconnectResponse,
    ConnectionLinkStartResponse,
    ConnectionSyncResponse,
)
from saayro_api.services.connections import list_connected_accounts
from saayro_api.services.google_connectors import (
    complete_google_connector_callback,
    disconnect_connected_provider,
    start_google_connector_link,
    sync_connected_provider,
)

router = APIRouter(tags=["connections"])


@router.get("/connections", response_model=list[ConnectedAccountRead])
async def get_connections(
    db: AsyncSession = Depends(get_db),
    actor: SessionActor = Depends(get_session_actor),
) -> list[ConnectedAccountRead]:
    return await list_connected_accounts(db, actor.user_id)


@router.post("/connections/{provider}/connect", response_model=ConnectionLinkStartResponse, status_code=status.HTTP_201_CREATED)
async def post_connect_provider(
    provider: str,
    return_to: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    actor: SessionActor = Depends(get_session_actor),
) -> ConnectionLinkStartResponse:
    return await start_google_connector_link(db, user_id=actor.user_id, provider=provider, return_to=return_to)


@router.get("/connections/{provider}/start")
async def get_connect_provider_start(
    provider: str,
    return_to: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    actor: SessionActor = Depends(get_session_actor),
) -> RedirectResponse:
    response = await start_google_connector_link(db, user_id=actor.user_id, provider=provider, return_to=return_to)
    return RedirectResponse(url=response.authorization_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)


@router.get("/connections/google/callback")
async def get_google_connector_callback(
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    redirect_url, _ = await complete_google_connector_callback(db, code=code, state=state)
    return RedirectResponse(url=redirect_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)


@router.post("/connections/{provider}/sync", response_model=ConnectionSyncResponse)
async def post_sync_provider(
    provider: str,
    db: AsyncSession = Depends(get_db),
    actor: SessionActor = Depends(get_session_actor),
) -> ConnectionSyncResponse:
    return await sync_connected_provider(db, actor.user_id, provider)


@router.delete("/connections/{provider}", response_model=ConnectionDisconnectResponse)
async def delete_provider_connection(
    provider: str,
    db: AsyncSession = Depends(get_db),
    actor: SessionActor = Depends(get_session_actor),
) -> ConnectionDisconnectResponse:
    return await disconnect_connected_provider(db, actor.user_id, provider)
