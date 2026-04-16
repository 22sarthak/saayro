from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from typing import Any
from urllib.parse import urlencode

import httpx
from fastapi import status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from saayro_api.core.config import Settings, get_settings
from saayro_api.core.errors import ApiException
from saayro_api.core.secrets import seal_payload, unseal_payload
from saayro_api.models.connections import ConnectedAccount, ConnectedTravelItem
from saayro_api.models.trips import Trip
from saayro_api.schemas.connections import (
    ConnectedAccountRead,
    ConnectionCallbackSummary,
    ConnectionDisconnectResponse,
    ConnectionLinkStartResponse,
    ConnectionSyncResponse,
)

CONNECTOR_PROVIDERS = ("gmail", "calendar")
PROFILE_SCOPES = ["openid", "email", "profile"]
GMAIL_QUERY = (
    '(flight OR airline OR hotel OR reservation OR booking OR train OR bus OR itinerary OR check-in '
    'OR boarding OR departure OR arrival)'
)
TRAVEL_KEYWORDS = {
    "flight",
    "airline",
    "hotel",
    "reservation",
    "booking",
    "check-in",
    "itinerary",
    "boarding",
    "departure",
    "arrival",
    "train",
    "bus",
    "airport",
    "terminal",
    "stay",
    "ticket",
}


@dataclass
class GoogleConnectorIdentity:
    subject: str
    email: str
    full_name: str


@dataclass
class ConnectorTokens:
    access_token: str
    refresh_token: str | None
    scopes: list[str]
    expires_at: datetime | None


@dataclass
class ImportCandidate:
    external_id: str
    provider: str
    source_kind: str
    title: str
    item_type: str
    start_at: datetime
    end_at: datetime | None
    summary: str
    location: str
    metadata: dict[str, str]


def ensure_provider(provider: str) -> str:
    if provider not in CONNECTOR_PROVIDERS:
        raise ApiException(status_code=400, code="validation_error", message="Unsupported connector provider.")
    return provider


def provider_label(provider: str) -> str:
    return "Connected Travel inbox scan" if provider == "gmail" else "Connected Travel calendar scan"


def provider_capabilities(provider: str) -> list[str]:
    return ["travel-email-import"] if provider == "gmail" else ["travel-event-import"]


def build_account_read(account: ConnectedAccount) -> ConnectedAccountRead:
    return ConnectedAccountRead(
        id=account.id,
        provider=account.provider,
        label=account.label,
        state=account.state,
        granted_scopes=account.granted_scopes,
        capabilities=account.capabilities_json,
        provider_account_email=account.provider_account_email,
        provider_account_name=account.provider_account_name,
        last_synced_at=account.last_synced_at,
        last_imported_at=account.last_imported_at,
        attached_item_count=account.attached_item_count,
        review_needed_item_count=account.review_needed_item_count,
        imported_item_count=account.imported_item_count,
        status_message=account.status_message,
    )


def build_placeholder_account(provider: str) -> ConnectedAccountRead:
    return ConnectedAccountRead(
        id=f"{provider}-status",
        provider=provider,
        label=provider_label(provider),
        state="not-connected",
        granted_scopes=[],
        capabilities=provider_capabilities(provider),
        provider_account_email=None,
        provider_account_name=None,
        last_synced_at=None,
        last_imported_at=None,
        attached_item_count=0,
        review_needed_item_count=0,
        imported_item_count=0,
        status_message="Connect this source to surface travel context for review.",
    )


def safe_return_to(return_to: str | None) -> str:
    if not return_to or not return_to.startswith("/"):
        return "/app/profile"
    return return_to


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def normalize_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def parse_provider_datetime(value: str | None, fallback: datetime | None = None) -> datetime:
    if not value:
        return fallback or utc_now()
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return normalize_datetime(parsed)
    except ValueError:
        return fallback or utc_now()


def seal_secret_value(value: str, settings: Settings) -> str:
    return seal_payload({"token": value.strip()}, settings.google_connector_state_secret)


def unseal_secret_value(value: str, settings: Settings) -> str:
    payload = unseal_payload(value, settings.google_connector_state_secret)
    token = str(payload.get("token", "")).strip()
    if not token:
        raise ApiException(status_code=500, code="connector_secret_invalid", message="Stored connector token is invalid.")
    return token


def scopes_for_provider(provider: str, settings: Settings) -> list[str]:
    provider_scope = settings.google_connector_gmail_scope if provider == "gmail" else settings.google_connector_calendar_scope
    return [*PROFILE_SCOPES, provider_scope]


def connector_state_payload(user_id: str, provider: str, return_to: str) -> dict[str, Any]:
    return {
        "user_id": user_id,
        "provider": provider,
        "return_to": return_to,
        "expires_at": (utc_now() + timedelta(minutes=15)).isoformat(),
    }


def build_authorization_url(settings: Settings, *, user_id: str, provider: str, return_to: str) -> str:
    params = {
        "client_id": settings.google_connector_client_id,
        "redirect_uri": settings.google_connector_redirect_uri,
        "response_type": "code",
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
        "scope": " ".join(scopes_for_provider(provider, settings)),
        "state": seal_payload(
            connector_state_payload(user_id, provider, return_to),
            settings.google_connector_state_secret,
        ),
    }
    return f"{settings.google_connector_auth_url}?{urlencode(params)}"


async def list_connector_accounts(db: AsyncSession, user_id: str) -> list[ConnectedAccountRead]:
    result = await db.execute(
        select(ConnectedAccount)
        .where(ConnectedAccount.user_id == user_id, ConnectedAccount.provider.in_(CONNECTOR_PROVIDERS))
        .order_by(ConnectedAccount.created_at.asc())
    )
    existing = {account.provider: account for account in result.scalars().all()}
    return [
        build_account_read(existing[provider]) if provider in existing else build_placeholder_account(provider)
        for provider in CONNECTOR_PROVIDERS
    ]


async def start_google_connector_link(
    db: AsyncSession,
    *,
    user_id: str,
    provider: str,
    return_to: str | None,
) -> ConnectionLinkStartResponse:
    settings = get_settings()
    provider = ensure_provider(provider)
    if not settings.google_connector_client_id or not settings.google_connector_client_secret:
        raise ApiException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="connector_not_configured",
            message="Google connector credentials are not configured.",
        )

    result = await db.execute(
        select(ConnectedAccount).where(ConnectedAccount.user_id == user_id, ConnectedAccount.provider == provider)
    )
    account = result.scalar_one_or_none()
    return ConnectionLinkStartResponse(
        provider=provider,
        authorization_url=build_authorization_url(
            settings,
            user_id=user_id,
            provider=provider,
            return_to=safe_return_to(return_to),
        ),
        message="Open Google to link this Connected Travel source.",
        account=build_account_read(account) if account is not None else build_placeholder_account(provider),
    )


async def exchange_google_connector_code(settings: Settings, code: str) -> ConnectorTokens:
    async with httpx.AsyncClient(timeout=settings.ai_timeout_seconds) as client:
        response = await client.post(
            settings.google_connector_token_url,
            data={
                "code": code,
                "client_id": settings.google_connector_client_id,
                "client_secret": settings.google_connector_client_secret,
                "redirect_uri": settings.google_connector_redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        if response.status_code >= 400:
            raise ApiException(status_code=401, code="connector_exchange_failed", message="Google connector exchange failed.")
        payload = response.json()

    access_token = str(payload.get("access_token", "")).strip()
    if not access_token:
        raise ApiException(status_code=401, code="connector_exchange_failed", message="Google connector access token is missing.")
    refresh_token = str(payload.get("refresh_token", "")).strip() or None
    expires_in = int(payload.get("expires_in", 0) or 0)
    return ConnectorTokens(
        access_token=access_token,
        refresh_token=refresh_token,
        scopes=[scope for scope in str(payload.get("scope", "")).split(" ") if scope],
        expires_at=utc_now() + timedelta(seconds=expires_in) if expires_in else None,
    )


async def refresh_google_connector_tokens(settings: Settings, refresh_token: str) -> ConnectorTokens:
    async with httpx.AsyncClient(timeout=settings.ai_timeout_seconds) as client:
        response = await client.post(
            settings.google_connector_token_url,
            data={
                "refresh_token": refresh_token,
                "client_id": settings.google_connector_client_id,
                "client_secret": settings.google_connector_client_secret,
                "grant_type": "refresh_token",
            },
        )
        if response.status_code >= 400:
            raise ApiException(status_code=401, code="connector_refresh_failed", message="Google connector refresh failed.")
        payload = response.json()

    access_token = str(payload.get("access_token", "")).strip()
    if not access_token:
        raise ApiException(status_code=401, code="connector_refresh_failed", message="Refreshed Google access token is missing.")
    expires_in = int(payload.get("expires_in", 0) or 0)
    return ConnectorTokens(
        access_token=access_token,
        refresh_token=refresh_token,
        scopes=[scope for scope in str(payload.get("scope", "")).split(" ") if scope],
        expires_at=utc_now() + timedelta(seconds=expires_in) if expires_in else None,
    )


async def fetch_google_identity(settings: Settings, access_token: str) -> GoogleConnectorIdentity:
    async with httpx.AsyncClient(timeout=settings.ai_timeout_seconds) as client:
        response = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if response.status_code >= 400:
            raise ApiException(status_code=401, code="connector_profile_failed", message="Could not load Google connector profile.")
        payload = response.json()

    subject = str(payload.get("sub", "")).strip()
    email = str(payload.get("email", "")).strip().lower()
    full_name = str(payload.get("name", "")).strip() or email
    if not subject or not email:
        raise ApiException(status_code=401, code="connector_profile_failed", message="Google connector profile is incomplete.")
    return GoogleConnectorIdentity(subject=subject, email=email, full_name=full_name)


async def load_user_trips(db: AsyncSession, user_id: str) -> list[Trip]:
    result = await db.execute(select(Trip).where(Trip.user_id == user_id).order_by(Trip.start_date.asc()))
    return list(result.scalars().all())


def trip_window_matches(trip: Trip, start_at: datetime, end_at: datetime | None) -> bool:
    item_start = start_at.date()
    item_end = (end_at or start_at).date()
    trip_start = trip.start_date - timedelta(days=1)
    trip_end = trip.end_date + timedelta(days=1)
    return item_start <= trip_end and item_end >= trip_start


def text_mentions_trip(trip: Trip, text: str) -> bool:
    haystack = text.lower()
    return any(
        term and term.lower() in haystack
        for term in [trip.destination_city, trip.destination_region, trip.destination_country, trip.title]
    )


def determine_item_type(text: str) -> str:
    haystack = text.lower()
    if any(token in haystack for token in ("flight", "airline", "boarding", "terminal", "departure")):
        return "flight"
    if any(token in haystack for token in ("hotel", "stay", "check-in", "suite", "room")):
        return "hotel"
    if any(token in haystack for token in ("reservation", "booking", "table", "dinner")):
        return "reservation"
    return "event"


def is_travel_relevant(*parts: str) -> bool:
    haystack = " ".join(parts).lower()
    return any(keyword in haystack for keyword in TRAVEL_KEYWORDS)


def strong_trip_match(candidate: ImportCandidate, trips: list[Trip]) -> tuple[Trip | None, str]:
    searchable = " ".join(
        value
        for value in [candidate.title, candidate.summary, candidate.location, *candidate.metadata.values()]
        if value
    )
    for trip in trips:
        if trip_window_matches(trip, candidate.start_at, candidate.end_at) and text_mentions_trip(trip, searchable):
            return trip, "Matched trip dates and destination context."
    return None, "Travel signal needs review before attachment."


async def fetch_gmail_candidates(settings: Settings, access_token: str) -> list[ImportCandidate]:
    async with httpx.AsyncClient(timeout=settings.ai_timeout_seconds) as client:
        listed = await client.get(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"maxResults": 12, "q": f"{GMAIL_QUERY} newer_than:{settings.google_connector_sync_window_days}d"},
        )
        if listed.status_code >= 400:
            raise ApiException(status_code=502, code="connector_sync_failed", message="Could not read Gmail travel messages.", retryable=True)
        candidates: list[ImportCandidate] = []
        for item in listed.json().get("messages", []):
            message_id = str(item.get("id", "")).strip()
            if not message_id:
                continue
            detail = await client.get(
                f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"format": "metadata", "metadataHeaders": ["Subject", "From", "Date"]},
            )
            if detail.status_code >= 400:
                continue
            payload = detail.json()
            headers = {header.get("name", ""): header.get("value", "") for header in payload.get("payload", {}).get("headers", [])}
            subject = str(headers.get("Subject", "")).strip() or "Travel update"
            sender = str(headers.get("From", "")).strip()
            snippet = str(payload.get("snippet", "")).strip()
            if not is_travel_relevant(subject, sender, snippet):
                continue
            try:
                start_at = normalize_datetime(parsedate_to_datetime(str(headers.get("Date", ""))))
            except Exception:
                internal_ms = int(payload.get("internalDate", 0) or 0)
                start_at = datetime.fromtimestamp(internal_ms / 1000, tz=timezone.utc) if internal_ms else utc_now()

            candidates.append(
                ImportCandidate(
                    external_id=message_id,
                    provider="gmail",
                    source_kind="gmail_message",
                    title=subject,
                    item_type=determine_item_type(f"{subject} {snippet} {sender}"),
                    start_at=start_at,
                    end_at=None,
                    summary=snippet,
                    location="",
                    metadata={
                        "source_id": message_id,
                        "source_kind": "gmail_message",
                        "sender": sender,
                        "subject": subject,
                        "snippet": snippet[:280],
                    },
                )
            )
        return candidates


async def fetch_calendar_candidates(settings: Settings, access_token: str) -> list[ImportCandidate]:
    time_min = (utc_now() - timedelta(days=30)).isoformat()
    time_max = (utc_now() + timedelta(days=settings.google_connector_sync_window_days)).isoformat()
    async with httpx.AsyncClient(timeout=settings.ai_timeout_seconds) as client:
        response = await client.get(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            headers={"Authorization": f"Bearer {access_token}"},
            params={
                "singleEvents": "true",
                "orderBy": "startTime",
                "timeMin": time_min,
                "timeMax": time_max,
                "maxResults": 25,
            },
        )
        if response.status_code >= 400:
            raise ApiException(status_code=502, code="connector_sync_failed", message="Could not read Calendar travel events.", retryable=True)
        candidates: list[ImportCandidate] = []
        for item in response.json().get("items", []):
            summary = str(item.get("summary", "")).strip()
            description = str(item.get("description", "")).strip()
            location = str(item.get("location", "")).strip()
            if not is_travel_relevant(summary, description, location):
                continue
            start_at = parse_provider_datetime(item.get("start", {}).get("dateTime"))
            if "date" in item.get("start", {}):
                start_at = parse_provider_datetime(f"{item['start']['date']}T09:00:00+00:00")
            end_at: datetime | None = None
            if "dateTime" in item.get("end", {}):
                end_at = parse_provider_datetime(item["end"]["dateTime"], start_at)
            elif "date" in item.get("end", {}):
                end_at = parse_provider_datetime(f"{item['end']['date']}T10:00:00+00:00", start_at)

            candidates.append(
                ImportCandidate(
                    external_id=str(item.get("id", "")).strip() or summary,
                    provider="calendar",
                    source_kind="calendar_event",
                    title=summary or "Travel event",
                    item_type=determine_item_type(f"{summary} {description} {location}"),
                    start_at=start_at,
                    end_at=end_at,
                    summary=description,
                    location=location,
                    metadata={
                        "source_id": str(item.get("id", "")).strip(),
                        "source_kind": "calendar_event",
                        "location": location,
                        "calendar_status": str(item.get("status", "")).strip(),
                    },
                )
            )
        return candidates


async def sync_import_candidates(
    db: AsyncSession,
    *,
    user_id: str,
    account: ConnectedAccount,
    provider: str,
    candidates: list[ImportCandidate],
) -> ConnectionCallbackSummary:
    trips = await load_user_trips(db, user_id)
    await db.execute(delete(ConnectedTravelItem).where(ConnectedTravelItem.connected_account_id == account.id))

    attached_count = 0
    review_needed_count = 0
    imported_count = 0
    for candidate in candidates:
        trip, reason = strong_trip_match(candidate, trips)
        state = "attached" if trip is not None else "candidate"
        confidence = "high" if trip is not None else "needs-review"
        if state == "attached":
            attached_count += 1
        else:
            review_needed_count += 1
        imported_count += 1
        db.add(
            ConnectedTravelItem(
                connected_account_id=account.id,
                trip_id=trip.id if trip is not None else None,
                title=candidate.title,
                item_type=candidate.item_type,
                state=state,
                confidence=confidence,
                start_at=candidate.start_at,
                end_at=candidate.end_at,
                metadata_json={
                    **candidate.metadata,
                    "extraction_reason": reason,
                    "summary": candidate.summary[:280],
                    "location": candidate.location,
                },
            )
        )

    account.attached_item_count = attached_count
    account.review_needed_item_count = review_needed_count
    account.imported_item_count = imported_count
    account.last_synced_at = utc_now()
    account.last_imported_at = account.last_synced_at
    account.state = "connected" if imported_count > 0 and review_needed_count == 0 else ("partial" if imported_count > 0 else "connected")
    account.status_message = (
        "Connected Travel attached the clearest travel items automatically."
        if imported_count > 0 and review_needed_count == 0
        else "Connected Travel imported travel context and left the lighter matches review-ready."
        if imported_count > 0
        else "Connected, but no travel-relevant items surfaced in the current review window."
    )
    await db.commit()
    await db.refresh(account)
    return ConnectionCallbackSummary(
        provider=provider,
        imported_count=imported_count,
        attached_count=attached_count,
        review_needed_count=review_needed_count,
        state=account.state,
    )


async def ensure_valid_tokens(db: AsyncSession, account: ConnectedAccount, settings: Settings) -> ConnectorTokens:
    if not account.sealed_access_token:
        raise ApiException(status_code=409, code="connector_not_ready", message="Connector is missing access credentials.")

    access_token = unseal_secret_value(account.sealed_access_token, settings)
    refresh_token = unseal_secret_value(account.sealed_refresh_token, settings) if account.sealed_refresh_token else None
    expires_at = account.token_expires_at
    if expires_at is not None and normalize_datetime(expires_at) <= utc_now() + timedelta(minutes=1):
        if not refresh_token:
            raise ApiException(status_code=401, code="connector_expired", message="Connector credentials expired and require relinking.")
        refreshed = await refresh_google_connector_tokens(settings, refresh_token)
        account.sealed_access_token = seal_secret_value(refreshed.access_token, settings)
        account.token_expires_at = refreshed.expires_at
        if refreshed.scopes:
            account.granted_scopes = refreshed.scopes
        await db.commit()
        access_token = refreshed.access_token
    return ConnectorTokens(
        access_token=access_token,
        refresh_token=refresh_token,
        scopes=account.granted_scopes,
        expires_at=account.token_expires_at,
    )


async def sync_connected_provider(db: AsyncSession, user_id: str, provider: str) -> ConnectionSyncResponse:
    settings = get_settings()
    provider = ensure_provider(provider)
    result = await db.execute(
        select(ConnectedAccount).where(
            ConnectedAccount.user_id == user_id,
            ConnectedAccount.provider == provider,
            ConnectedAccount.revoked_at.is_(None),
        )
    )
    account = result.scalar_one_or_none()
    if account is None:
        raise ApiException(status_code=404, code="not_found", message="Connector account not found.")

    tokens = await ensure_valid_tokens(db, account, settings)
    candidates = (
        await fetch_gmail_candidates(settings, tokens.access_token)
        if provider == "gmail"
        else await fetch_calendar_candidates(settings, tokens.access_token)
    )
    summary = await sync_import_candidates(db, user_id=user_id, account=account, provider=provider, candidates=candidates)
    return ConnectionSyncResponse(
        provider=provider,
        state=summary.state,
        imported_count=summary.imported_count,
        attached_count=summary.attached_count,
        review_needed_count=summary.review_needed_count,
        account=build_account_read(account),
        message=account.status_message or "Connected Travel sync completed.",
    )


async def complete_google_connector_callback(db: AsyncSession, *, code: str, state: str) -> tuple[str, ConnectionCallbackSummary]:
    settings = get_settings()
    payload = unseal_payload(state, settings.google_connector_state_secret)
    provider = ensure_provider(str(payload.get("provider", "")).strip())
    user_id = str(payload.get("user_id", "")).strip()
    return_to = safe_return_to(str(payload.get("return_to", "")).strip())
    expires_at = parse_provider_datetime(str(payload.get("expires_at", "")).strip())
    if expires_at <= utc_now():
        raise ApiException(status_code=400, code="connector_state_expired", message="Connector link has expired. Start again from Saayro.")

    tokens = await exchange_google_connector_code(settings, code)
    identity = await fetch_google_identity(settings, tokens.access_token)

    result = await db.execute(
        select(ConnectedAccount).where(ConnectedAccount.user_id == user_id, ConnectedAccount.provider == provider)
    )
    account = result.scalar_one_or_none()
    if account is None:
        account = ConnectedAccount(
            user_id=user_id,
            provider=provider,
            label=provider_label(provider),
            state="connecting",
            granted_scopes=tokens.scopes,
            capabilities_json=provider_capabilities(provider),
        )
        db.add(account)
        await db.flush()

    account.label = provider_label(provider)
    account.state = "connecting"
    account.capabilities_json = provider_capabilities(provider)
    account.provider_account_id = identity.subject
    account.provider_account_email = identity.email
    account.provider_account_name = identity.full_name
    account.granted_scopes = tokens.scopes
    account.sealed_access_token = seal_secret_value(tokens.access_token, settings)
    account.sealed_refresh_token = seal_secret_value(tokens.refresh_token, settings) if tokens.refresh_token else account.sealed_refresh_token
    account.token_expires_at = tokens.expires_at
    account.revoked_at = None
    await db.commit()
    await db.refresh(account)

    summary = await sync_connected_provider(db, user_id, provider)
    redirect_url = (
        f"{settings.web_app_url.rstrip('/')}{return_to}"
        f"?connector={provider}&state={summary.state}&imported={summary.imported_count}&attached={summary.attached_count}&review={summary.review_needed_count}"
    )
    return redirect_url, ConnectionCallbackSummary(
        provider=provider,
        imported_count=summary.imported_count,
        attached_count=summary.attached_count,
        review_needed_count=summary.review_needed_count,
        state=summary.state,
    )


async def disconnect_connected_provider(db: AsyncSession, user_id: str, provider: str) -> ConnectionDisconnectResponse:
    settings = get_settings()
    provider = ensure_provider(provider)
    result = await db.execute(
        select(ConnectedAccount).where(ConnectedAccount.user_id == user_id, ConnectedAccount.provider == provider)
    )
    account = result.scalar_one_or_none()
    if account is None:
        return ConnectionDisconnectResponse(provider=provider, disconnected=True, message="Connector was already disconnected.")

    access_token = unseal_secret_value(account.sealed_access_token, settings) if account.sealed_access_token else None
    if access_token:
        async with httpx.AsyncClient(timeout=settings.ai_timeout_seconds) as client:
            try:
                await client.post(
                    "https://oauth2.googleapis.com/revoke",
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                    content=f"token={access_token}",
                )
            except httpx.HTTPError:
                pass

    await db.execute(delete(ConnectedTravelItem).where(ConnectedTravelItem.connected_account_id == account.id))
    account.state = "revoked"
    account.revoked_at = utc_now()
    account.sealed_access_token = None
    account.sealed_refresh_token = None
    account.token_expires_at = None
    account.last_synced_at = None
    account.last_imported_at = None
    account.attached_item_count = 0
    account.review_needed_item_count = 0
    account.imported_item_count = 0
    account.status_message = "Connector disconnected."
    await db.commit()
    return ConnectionDisconnectResponse(provider=provider, disconnected=True, message="Connector disconnected and tokens revoked.")
