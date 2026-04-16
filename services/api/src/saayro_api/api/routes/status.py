from __future__ import annotations

from fastapi import APIRouter

from saayro_api.core.config import get_settings

router = APIRouter(tags=["status"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/status")
async def status() -> dict[str, object]:
    settings = get_settings()
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.env,
        "apiPrefix": settings.prefix,
        "databaseBackend": settings.database_backend,
    }

