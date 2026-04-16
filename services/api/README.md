# Saayro API

Backend basics foundation for Saayro using FastAPI, async SQLAlchemy, and Alembic.

## Local PostgreSQL development

PostgreSQL is the primary local development database for `services/api`.

1. Copy the example environment file and keep the default PostgreSQL URL:

```powershell
Copy-Item .env.example .env
```

2. Start PostgreSQL locally:

```powershell
docker compose up -d postgres
```

The local Docker setup ships with a development-only `pg_hba.conf` so host tools like TablePlus can connect cleanly from your machine.
Saayro maps PostgreSQL to host port `5433` so it does not collide with any existing local PostgreSQL service already using `5432`.

3. Install dependencies, run migrations, and start the API:

```bash
uv sync --group dev
uv run alembic upgrade head
uv run uvicorn saayro_api.main:app --reload
```

If you change the PostgreSQL auth configuration or Docker volume state, recreate the local container:

```powershell
docker compose down
docker compose up -d postgres
```

## Optional SQLite verification

SQLite remains available only for lightweight local verification and tests. If you want a quick no-Postgres check, override the database URL for the session before running migrations:

```powershell
$env:SAAYRO_API_DATABASE_URL="sqlite+aiosqlite:///C:/Users/$env:USERNAME/AppData/Local/Temp/saayro_api.db"
uv run alembic upgrade head
uv run uvicorn saayro_api.main:app --reload
```

## Quality checks

```bash
uv run ruff check .
uv run mypy src
uv run pytest
```
