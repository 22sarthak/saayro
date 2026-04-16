# Saayro

Saayro is a premium pan-India AI travel companion app.

Tagline: Your trip's smarter half

## What Saayro is
Saayro helps users plan, organize, and navigate trips with a travel-first product experience, a structured Buddy assistant, and portable outputs such as exports and map handoffs.

## Current phase
- Front-end shell first with mock data
- Documentation foundation before deeper implementation

## Repository intent
- `docs/` is the source of truth for product, design, engineering, operations, policy, and launch
- Saayro is travel-first, not chatbot-first
- the approved visual direction is Ivory Atlas with subtle hues

## Start here
- Product overview: `docs/00-overview/product-brief.md`
- Design direction: `docs/01-design/ivory-atlas-system.md`
- Product requirements: `docs/02-product/prd.md`
- MVP boundaries: `docs/02-product/mvp-scope.md`
- Frontend architecture: `docs/05-frontend/frontend-architecture.md`
- API expectations: `docs/06-backend/api-spec.md`
- Buddy behavior: `docs/07-ai/buddy-behavior-spec.md`

## Stack
| Area | Planned stack |
| --- | --- |
| Web | Next.js, TypeScript, Tailwind |
| Mobile | Expo, TypeScript |
| API | FastAPI, PostgreSQL |
| Shared | `packages/ui`, `packages/types` |

## Backend basics
- backend service lives in `services/api`
- uses FastAPI, async SQLAlchemy, Alembic, and `uv`
- PostgreSQL is the primary local development database for backend work
- SQLite remains optional for lightweight verification and tests
- Saayro Docker PostgreSQL is exposed on `127.0.0.1:5433` to avoid conflicts with any existing local PostgreSQL on `5432`
- local backend commands:
  - `cd services/api`
  - `docker compose up -d postgres`
  - `uv sync --group dev`
  - `uv run alembic upgrade head`
  - `uv run uvicorn saayro_api.main:app --reload`

## Auth setup
- real Google sign-in now depends on matching client IDs in:
  - `services/api/.env`
  - `apps/web/.env.local`
  - `apps/mobile/.env`
- web uses Google as the live auth path with backend-owned session cookies
- mobile uses Google AuthSession with backend-issued bearer sessions
- OTP is wired as a provider-ready path and can remain non-live until an SMS provider is enabled

## Repository structure
- `docs/00-overview`: product context, market framing, glossary, and success metrics
- `docs/01-design`: brand rules, Ivory Atlas system, accessibility, motion, and content tone
- `docs/02-product`: PRD, scope, roadmap, release plan, and monetization
- `docs/03-user-flows`: end-to-end user behavior specs
- `docs/04-information-architecture`: navigation, screens, permissions, and data ownership
- `docs/05-frontend`: UI architecture, components, analytics, and frontend contracts
- `docs/06-backend`: API, data model, security, integrations, jobs, and errors
- `docs/07-ai`: Buddy behavior, prompts, multimodal, trust, and evaluation
- `docs/08-operations`: deployment, observability, QA, testing, and support
- `docs/09-legal-and-policy`: privacy, retention, permissions, disclaimers, and regional considerations
- `docs/10-launch`: launch, pricing, beta, and feedback strategy
- `docs/templates`: reusable templates for future specs and decisions

## Guardrails
- Do not implement real payments, production auth backend wiring, real email parsing, real calendar syncing, video understanding pipelines, complex RAG, or advanced model orchestration unless explicitly requested.

## Working principles
- keep the product calm, premium, and editorial
- use the Ivory Atlas system with subtle, meaningful accent hues
- prefer portability, clarity, and trust over lock-in or flashy AI behavior
- keep modules explicit and implementation-friendly
