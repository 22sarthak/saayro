from __future__ import annotations

import tempfile
from pathlib import Path

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from saayro_api.api.deps import get_db
from saayro_api.core.application import create_app
from saayro_api.db.base import Base


@pytest_asyncio.fixture
async def client() -> AsyncClient:
    db_path = Path(tempfile.gettempdir()) / "saayro_api_test.db"
    if db_path.exists():
        try:
            db_path.unlink()
        except PermissionError:
            pass

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
    if db_path.exists():
        try:
            db_path.unlink()
        except PermissionError:
            pass
