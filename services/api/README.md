# Saayro API

Backend basics foundation for Saayro using FastAPI, async SQLAlchemy, and Alembic.
Step 7 adds the first Buddy AI application layer with Gemini primary generation, Ollama fallback, and mock-safe controlled behavior when providers are unavailable.
Step 8B adds real session handling, Google sign-in exchange endpoints, and an OTP provider-ready seam.
Step 8C adds Google Gmail and Calendar connector foundations for Connected Travel, with backend-owned OAuth callbacks, conservative import, and review-ready travel context.

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

## Auth environment

Set these in `.env` for real auth flow testing:

```powershell
SAAYRO_API_AUTH_GOOGLE_WEB_CLIENT_ID=your-google-web-client-id
SAAYRO_API_AUTH_GOOGLE_MOBILE_CLIENT_IDS=your-google-ios-client-id,your-google-android-client-id,your-google-expo-web-client-id
SAAYRO_API_OTP_ENABLED=false
SAAYRO_API_OTP_PROVIDER=provider-ready
```

Web exchanges Google access tokens into Saayro-owned HTTP-only session cookies.
Mobile exchanges Google access tokens into Saayro-owned bearer sessions stored on device.
OTP endpoints are live structurally, but can remain non-live until an SMS provider is configured.

## Google connector environment

Set these in `.env` to enable Gmail and Calendar connector linking:

```powershell
SAAYRO_API_WEB_APP_URL=http://localhost:3000
SAAYRO_API_GOOGLE_CONNECTOR_CLIENT_ID=your-google-connector-client-id
SAAYRO_API_GOOGLE_CONNECTOR_CLIENT_SECRET=your-google-connector-client-secret
SAAYRO_API_GOOGLE_CONNECTOR_REDIRECT_URI=http://127.0.0.1:8000/v1/connections/google/callback
SAAYRO_API_GOOGLE_CONNECTOR_STATE_SECRET=replace-with-a-long-random-secret
SAAYRO_API_GOOGLE_CONNECTOR_GMAIL_SCOPE=https://www.googleapis.com/auth/gmail.readonly
SAAYRO_API_GOOGLE_CONNECTOR_CALENDAR_SCOPE=https://www.googleapis.com/auth/calendar.events.readonly
```

Connector linking is backend-owned and web-initiated in this step.
Initial import stays travel-first: strong trip matches attach automatically, while lighter matches remain review-ready in Connected Travel.

## AI provider setup

- Gemini is the primary provider path.
- Ollama `llama3` is the automatic fallback when Gemini is unavailable, misconfigured, or rate limited.
- If neither provider is usable, Buddy returns a controlled mock-safe response rather than a raw provider error.

For Gemini, set `SAAYRO_API_AI_GEMINI_API_KEY` in `.env`.

For Ollama fallback, run a local model server:

```powershell
ollama serve
ollama pull llama3
```

Buddy provider/model metadata is exposed only in development mode and only for development review.

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
