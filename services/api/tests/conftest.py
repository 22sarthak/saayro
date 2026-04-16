from __future__ import annotations

import tempfile
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from saayro_api.api.deps import get_db
from saayro_api.core.application import create_app
from saayro_api.core.config import get_settings
from saayro_api.db.base import Base
from saayro_api.services.buddy import _orchestrator


@pytest_asyncio.fixture
async def client_factory() -> AsyncIterator:
    @asynccontextmanager
    async def _build_client() -> AsyncIterator[AsyncClient]:
        db_path = Path(tempfile.gettempdir()) / "saayro_api_test.db"
        if db_path.exists():
            try:
                db_path.unlink()
            except PermissionError:
                pass

        get_settings.cache_clear()
        _orchestrator.cache_clear()
        engine = create_async_engine(f"sqlite+aiosqlite:///{db_path.as_posix()}", future=True)
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)

        session_factory = async_sessionmaker(bind=engine, expire_on_commit=False)
        app = create_app()

        async def override_get_db():
            async with session_factory() as session:
                yield session

        app.dependency_overrides[get_db] = override_get_db

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as async_client:
            yield async_client

        await engine.dispose()
        get_settings.cache_clear()
        _orchestrator.cache_clear()
        if db_path.exists():
            try:
                db_path.unlink()
            except PermissionError:
                pass

    yield _build_client


@pytest_asyncio.fixture
async def client(client_factory) -> AsyncIterator[AsyncClient]:
    async with client_factory() as async_client:
        yield async_client
