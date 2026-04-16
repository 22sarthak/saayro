# Saayro API

Backend basics foundation for Saayro using FastAPI, async SQLAlchemy, and Alembic.

## Local commands

```bash
uv sync --group dev
uv run alembic upgrade head
uv run uvicorn saayro_api.main:app --reload
```

Local development defaults to SQLite for convenience and stays PostgreSQL-ready through SQLAlchemy and Alembic. If Windows file locking interferes with the default local SQLite file, override the database URL for the session before running migrations:

```powershell
$env:SAAYRO_API_DATABASE_URL="sqlite+aiosqlite:///C:/Users/$env:USERNAME/AppData/Local/Temp/saayro_api.db"
uv run alembic upgrade head
```

## Quality checks

```bash
uv run ruff check .
uv run mypy src
uv run pytest
```
