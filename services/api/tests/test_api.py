from __future__ import annotations

from datetime import datetime, timedelta, timezone

from httpx import AsyncClient

from saayro_api.ai.providers.gemini import GeminiProvider
from saayro_api.ai.providers.ollama import OllamaProvider
from saayro_api.ai.types import BuddyAction, BuddyProviderResponse, BuddyStructuredReply
from saayro_api.core.config import get_settings
from saayro_api.core.errors import ApiException
from saayro_api.core.secrets import seal_payload
from saayro_api.models.users import User
from saayro_api.services import auth as auth_service
from saayro_api.services import google_connectors


async def _login_web(client: AsyncClient, monkeypatch) -> None:
    async def fake_google_profile(settings, access_token, id_token):
        return auth_service.GoogleIdentity(
            subject="google-subject-1",
            email="demo@saayro.app",
            full_name="Aarohi Mehta",
            email_verified=True,
        )

    monkeypatch.setattr(auth_service, "_load_google_profile", fake_google_profile)
    response = await client.post("/v1/auth/google/web", json={"access_token": "test-google-access-token"})
    assert response.status_code == 200


async def _login_mobile(client: AsyncClient, monkeypatch) -> str:
    async def fake_google_profile(settings, access_token, id_token):
        return auth_service.GoogleIdentity(
            subject="google-subject-2",
            email="mobile@saayro.app",
            full_name="Ira Kapoor",
            email_verified=True,
        )

    monkeypatch.setattr(auth_service, "_load_google_profile", fake_google_profile)
    response = await client.post("/v1/auth/google/mobile", json={"access_token": "mobile-google-access-token"})
    assert response.status_code == 200
    return response.json()["session_token"]


async def _create_trip(client: AsyncClient) -> str:
    created = await client.post(
        "/v1/trips",
        json={
            "title": "Jaipur Long Weekend",
            "destination_city": "Jaipur",
            "destination_region": "Rajasthan",
            "destination_country": "India",
            "start_date": "2026-11-12",
            "end_date": "2026-11-14",
            "party": "couple",
            "overview": "A premium Jaipur escape.",
            "highlights": ["Amber Fort", "Bar Palladio"],
            "preferences": {
                "preferred_maps_app": "google-maps",
                "travel_pace": "balanced",
                "interests": ["boutique stays"],
                "budget_sensitivity": "medium",
                "comfort_priority": "premium",
                "notifications_enabled": True,
            },
        },
    )
    assert created.status_code == 201
    return created.json()["id"]


async def test_health_and_status(client: AsyncClient) -> None:
    health = await client.get("/health")
    status = await client.get("/status")

    assert health.status_code == 200
    assert health.json() == {"status": "ok"}
    assert status.status_code == 200
    assert status.json()["service"] == "Saayro API"


async def test_user_auth_completion_timestamps_are_timezone_aware() -> None:
    assert User.__table__.c.email_verified_at.type.timezone is True
    assert User.__table__.c.phone_verified_at.type.timezone is True
    assert User.__table__.c.onboarding_completed_at.type.timezone is True


async def test_trip_crud_and_related_placeholders_with_real_session(client: AsyncClient, monkeypatch) -> None:
    await _login_web(client, monkeypatch)
    trip_id = await _create_trip(client)

    listed = await client.get("/v1/trips")
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    itinerary = await client.post(f"/v1/trips/{trip_id}/itinerary/generate")
    assert itinerary.status_code == 201
    assert itinerary.json()["operation"] == "generate"

    optimized = await client.post(f"/v1/trips/{trip_id}/itinerary/optimize", json={"goal": "pacing"})
    assert optimized.status_code == 200
    assert optimized.json()["operation"] == "optimize"

    buddy = await client.post(f"/v1/trips/{trip_id}/buddy/messages", json={"content": "Can we slow day two down?"})
    assert buddy.status_code == 201
    assert len(buddy.json()) == 2
    assert buddy.json()[1]["response"]["summary"]

    export_job = await client.post(f"/v1/trips/{trip_id}/exports", json={"format": "pdf"})
    assert export_job.status_code == 201
    assert export_job.json()["label"] == "Trip PDF"


async def test_auth_session_logout_refresh_and_otp_placeholder(client: AsyncClient, monkeypatch) -> None:
    await _login_web(client, monkeypatch)

    session = await client.get("/v1/auth/session")
    assert session.status_code == 200
    assert session.json()["authenticated"] is True

    refreshed = await client.post("/v1/auth/refresh")
    assert refreshed.status_code == 200
    assert refreshed.json()["session"]["authenticated"] is True

    otp_requested = await client.post(
        "/v1/auth/otp/request",
        json={"phone_number": "+919876543210", "intent": "sign_up"},
    )
    assert otp_requested.status_code == 200
    assert otp_requested.json()["status"] == "provider_ready_non_live"

    otp_verified = await client.post(
        "/v1/auth/otp/verify",
        json={"challenge_id": otp_requested.json()["challenge_id"], "code": "123456"},
    )
    assert otp_verified.status_code == 200
    assert otp_verified.json()["status"] == "provider_ready_non_live"

    logout = await client.post("/v1/auth/logout")
    assert logout.status_code == 200
    signed_out = await client.get("/v1/auth/session")
    assert signed_out.status_code == 200
    assert signed_out.json()["authenticated"] is False


async def test_mobile_bearer_session_and_error_envelope(client: AsyncClient, monkeypatch) -> None:
    token = await _login_mobile(client, monkeypatch)
    authed_client = client
    authed_client.headers["Authorization"] = f"Bearer {token}"

    await _create_trip(authed_client)
    missing = await authed_client.get("/v1/trips/missing-trip")
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "not_found"

    monkeypatch.setenv("SAAYRO_API_GOOGLE_CONNECTOR_CLIENT_ID", "connector-client")
    monkeypatch.setenv("SAAYRO_API_GOOGLE_CONNECTOR_CLIENT_SECRET", "connector-secret")
    monkeypatch.setenv("SAAYRO_API_GOOGLE_CONNECTOR_STATE_SECRET", "connector-state")
    get_settings.cache_clear()

    connected = await authed_client.post("/v1/connections/gmail/connect")
    assert connected.status_code == 201
    assert connected.json()["provider"] == "gmail"
    assert "authorization_url" in connected.json()

    invalid = await authed_client.post("/v1/connections/unknown/connect")
    assert invalid.status_code == 400
    assert invalid.json()["error"]["code"] == "validation_error"

    bearer_session = await authed_client.get("/v1/auth/session")
    assert bearer_session.status_code == 200
    assert bearer_session.json()["transport"] == "bearer"


async def test_google_connector_callback_sync_and_disconnect_flow(monkeypatch, client_factory) -> None:
    monkeypatch.setenv("SAAYRO_API_GOOGLE_CONNECTOR_CLIENT_ID", "connector-client")
    monkeypatch.setenv("SAAYRO_API_GOOGLE_CONNECTOR_CLIENT_SECRET", "connector-secret")
    monkeypatch.setenv("SAAYRO_API_GOOGLE_CONNECTOR_STATE_SECRET", "connector-state")
    monkeypatch.setenv("SAAYRO_API_WEB_APP_URL", "http://localhost:3000")

    async def fake_exchange(settings, code):
        return google_connectors.ConnectorTokens(
            access_token="gmail-access-token",
            refresh_token="gmail-refresh-token",
            scopes=["openid", "email", "profile", settings.google_connector_gmail_scope],
            expires_at=None,
        )

    async def fake_identity(settings, access_token):
        return google_connectors.GoogleConnectorIdentity(
            subject="google-connector-subject",
            email="connector@saayro.app",
            full_name="Connector Tester",
        )

    async def fake_gmail(settings, access_token):
        return [
            google_connectors.ImportCandidate(
                external_id="gmail-msg-1",
                provider="gmail",
                source_kind="gmail_message",
                title="Flight to Jaipur confirmed",
                item_type="flight",
                start_at=datetime(2026, 11, 12, 7, 30, tzinfo=timezone.utc),
                end_at=datetime(2026, 11, 12, 9, 0, tzinfo=timezone.utc),
                summary="IndiGo flight into Jaipur for the long weekend.",
                location="Jaipur",
                metadata={"source_id": "gmail-msg-1", "sender": "IndiGo"},
            ),
            google_connectors.ImportCandidate(
                external_id="gmail-msg-2",
                provider="gmail",
                source_kind="gmail_message",
                title="Hotel confirmation waiting for review",
                item_type="hotel",
                start_at=datetime(2026, 11, 20, 14, 0, tzinfo=timezone.utc),
                end_at=datetime(2026, 11, 22, 11, 0, tzinfo=timezone.utc),
                summary="A stay that does not clearly match the current trip.",
                location="Udaipur",
                metadata={"source_id": "gmail-msg-2", "sender": "Hotel"},
            ),
            google_connectors.ImportCandidate(
                external_id="gmail-msg-3",
                provider="gmail",
                source_kind="gmail_message",
                title="Dinner booking to review",
                item_type="reservation",
                start_at=datetime(2026, 11, 21, 19, 30, tzinfo=timezone.utc),
                end_at=datetime(2026, 11, 21, 21, 0, tzinfo=timezone.utc),
                summary="A restaurant booking that should stay review-ready before it attaches anywhere.",
                location="Udaipur",
                metadata={"source_id": "gmail-msg-3", "sender": "Restaurant"},
            ),
        ]

    monkeypatch.setattr(google_connectors, "exchange_google_connector_code", fake_exchange)
    monkeypatch.setattr(google_connectors, "fetch_google_identity", fake_identity)
    monkeypatch.setattr(google_connectors, "fetch_gmail_candidates", fake_gmail)

    async with client_factory() as client:
        await _login_web(client, monkeypatch)
        trip_id = await _create_trip(client)
        settings = get_settings()
        state = seal_payload(
            {
                "user_id": (await client.get("/v1/auth/session")).json()["actor"]["user_id"],
                "provider": "gmail",
                "return_to": "/app/profile",
                "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(),
            },
            settings.google_connector_state_secret,
        )

        callback = await client.get(f"/v1/connections/google/callback?code=test-code&state={state}", follow_redirects=False)
        assert callback.status_code == 307
        assert "connector=gmail" in callback.headers["location"]

        listed = await client.get("/v1/connections")
        assert listed.status_code == 200
        gmail_account = next(item for item in listed.json() if item["provider"] == "gmail")
        assert gmail_account["state"] == "partial"
        assert gmail_account["attached_item_count"] == 1
        assert gmail_account["review_needed_item_count"] == 2

        items = await client.get(f"/v1/trips/{trip_id}/connected-items")
        assert items.status_code == 200
        assert len(items.json()) == 1
        assert items.json()[0]["provider"] == "gmail"

        review_queue = await client.get("/v1/connected-travel/items")
        assert review_queue.status_code == 200
        assert [item["state"] for item in review_queue.json()[:2]] == ["candidate", "candidate"]
        attach_candidate = next(item for item in review_queue.json() if item["title"] == "Hotel confirmation waiting for review")
        ignore_candidate = next(item for item in review_queue.json() if item["title"] == "Dinner booking to review")

        attached = await client.post(
            f"/v1/connected-travel/items/{attach_candidate['id']}/review",
            json={"action": "attach", "trip_id": trip_id},
        )
        assert attached.status_code == 200
        assert attached.json()["state"] == "attached"
        assert attached.json()["trip_id"] == trip_id

        ignored = await client.post(
            f"/v1/connected-travel/items/{ignore_candidate['id']}/review",
            json={"action": "ignore"},
        )
        assert ignored.status_code == 200
        assert ignored.json()["state"] == "ignored"
        assert ignored.json()["trip_id"] is None

        updated_items = await client.get(f"/v1/trips/{trip_id}/connected-items")
        assert updated_items.status_code == 200
        assert len(updated_items.json()) == 2

        updated_accounts = await client.get("/v1/connections")
        updated_gmail_account = next(item for item in updated_accounts.json() if item["provider"] == "gmail")
        assert updated_gmail_account["attached_item_count"] == 2
        assert updated_gmail_account["review_needed_item_count"] == 0

        refreshed = await client.post("/v1/connections/gmail/sync")
        assert refreshed.status_code == 200
        assert refreshed.json()["review_needed_count"] == 2

        disconnected = await client.delete("/v1/connections/gmail")
        assert disconnected.status_code == 200
        assert disconnected.json()["disconnected"] is True


async def test_connected_travel_review_rejects_other_users(monkeypatch, client_factory) -> None:
    monkeypatch.setenv("SAAYRO_API_GOOGLE_CONNECTOR_CLIENT_ID", "connector-client")
    monkeypatch.setenv("SAAYRO_API_GOOGLE_CONNECTOR_CLIENT_SECRET", "connector-secret")
    monkeypatch.setenv("SAAYRO_API_GOOGLE_CONNECTOR_STATE_SECRET", "connector-state")
    monkeypatch.setenv("SAAYRO_API_WEB_APP_URL", "http://localhost:3000")

    async def fake_exchange(settings, code):
        return google_connectors.ConnectorTokens(
            access_token="gmail-access-token",
            refresh_token="gmail-refresh-token",
            scopes=["openid", "email", "profile", settings.google_connector_gmail_scope],
            expires_at=None,
        )

    async def fake_identity(settings, access_token):
        return google_connectors.GoogleConnectorIdentity(
            subject="google-connector-subject",
            email="connector@saayro.app",
            full_name="Connector Tester",
        )

    async def fake_gmail(settings, access_token):
        return [
            google_connectors.ImportCandidate(
                external_id="gmail-msg-review-1",
                provider="gmail",
                source_kind="gmail_message",
                title="Rail ticket to review",
                item_type="reservation",
                start_at=datetime(2026, 11, 18, 9, 0, tzinfo=timezone.utc),
                end_at=datetime(2026, 11, 18, 12, 0, tzinfo=timezone.utc),
                summary="A ticket that should remain review-ready.",
                location="Delhi",
                metadata={"source_id": "gmail-msg-review-1", "sender": "IRCTC"},
            ),
        ]

    monkeypatch.setattr(google_connectors, "exchange_google_connector_code", fake_exchange)
    monkeypatch.setattr(google_connectors, "fetch_google_identity", fake_identity)
    monkeypatch.setattr(google_connectors, "fetch_gmail_candidates", fake_gmail)

    async def owner_google_profile(settings, access_token, id_token):
        return auth_service.GoogleIdentity(
            subject="google-subject-connected-owner",
            email="owner@saayro.app",
            full_name="Owner Tester",
            email_verified=True,
        )

    async def other_google_profile(settings, access_token, id_token):
        return auth_service.GoogleIdentity(
            subject="google-subject-connected-other",
            email="other@saayro.app",
            full_name="Other Tester",
            email_verified=True,
        )

    monkeypatch.setattr(auth_service, "_load_google_profile", owner_google_profile)

    async with client_factory() as owner_client:
        response = await owner_client.post("/v1/auth/google/web", json={"access_token": "owner-google-access-token"})
        assert response.status_code == 200
        settings = get_settings()
        state = seal_payload(
            {
                "user_id": (await owner_client.get("/v1/auth/session")).json()["actor"]["user_id"],
                "provider": "gmail",
                "return_to": "/app/profile",
                "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(),
            },
            settings.google_connector_state_secret,
        )
        callback = await owner_client.get(f"/v1/connections/google/callback?code=test-code&state={state}", follow_redirects=False)
        assert callback.status_code == 307
        queue = await owner_client.get("/v1/connected-travel/items")
        item_id = queue.json()[0]["id"]

    monkeypatch.setattr(auth_service, "_load_google_profile", other_google_profile)
    async with client_factory() as other_client:
        response = await other_client.post("/v1/auth/google/web", json={"access_token": "other-google-access-token"})
        assert response.status_code == 200
        blocked = await other_client.post(f"/v1/connected-travel/items/{item_id}/review", json={"action": "ignore"})
        assert blocked.status_code == 404
        assert blocked.json()["error"]["code"] == "not_found"



async def test_buddy_generation_uses_gemini_and_persists_structured_response(
    monkeypatch,
    client_factory,
) -> None:
    monkeypatch.setenv("SAAYRO_API_AI_ENABLED", "true")
    monkeypatch.setenv("SAAYRO_API_AI_PROVIDER", "auto")
    monkeypatch.setenv("SAAYRO_API_AI_GEMINI_API_KEY", "test-key")
    monkeypatch.setenv("SAAYRO_API_AI_DEV_PROVIDER_BADGE", "true")

    async def fake_gemini_generate(self, request):
        return BuddyProviderResponse(
            provider="Gemini",
            model="gemini-2.5-flash",
            reply=BuddyStructuredReply(
                summary=f"Let us soften day two in {request.context.trip.destination_city}.",
                guidance="Move the longest stop later and keep the evening lighter.",
                confidence_label="high",
                scope_class="in_scope_travel",
                actions=[BuddyAction(id="refine-day-two", type="itinerary_refine", label="Refine this itinerary")],
                follow_up_question="Do you want a calmer morning or a shorter evening?",
            ),
        )

    monkeypatch.setattr(GeminiProvider, "generate", fake_gemini_generate)
    async def fake_google_profile(settings, access_token, id_token):
        return auth_service.GoogleIdentity(
            subject="google-subject-buddy-1",
            email="buddy@saayro.app",
            full_name="Buddy Tester",
            email_verified=True,
        )

    monkeypatch.setattr(auth_service, "_load_google_profile", fake_google_profile)

    async with client_factory() as client:
        await client.post("/v1/auth/google/web", json={"access_token": "test-google-access-token"})
        trip_id = await _create_trip(client)
        await client.post(f"/v1/trips/{trip_id}/itinerary/generate")
        buddy = await client.post(f"/v1/trips/{trip_id}/buddy/messages", json={"content": "Can we slow day two down?"})
        body = buddy.json()
        assert buddy.status_code == 201
        assert body[1]["response"]["guidance"] == "Move the longest stop later and keep the evening lighter."
        assert body[1]["response"]["dev_metadata"]["provider"] == "Gemini"
        assert body[1]["response"]["dev_metadata"]["fallback_used"] is False


async def test_buddy_generation_falls_back_to_ollama_when_gemini_fails(
    monkeypatch,
    client_factory,
) -> None:
    monkeypatch.setenv("SAAYRO_API_AI_ENABLED", "true")
    monkeypatch.setenv("SAAYRO_API_AI_PROVIDER", "auto")
    monkeypatch.setenv("SAAYRO_API_AI_GEMINI_API_KEY", "test-key")
    monkeypatch.setenv("SAAYRO_API_AI_DEV_PROVIDER_BADGE", "true")

    async def failing_gemini(self, request):
        raise ApiException(status_code=503, code="provider_unavailable", message="Rate limited.", retryable=True)

    async def fake_ollama_generate(self, request):
        return BuddyProviderResponse(
            provider="Ollama",
            model="llama3",
            reply=BuddyStructuredReply(
                summary="Here is a calmer pacing option for this trip.",
                guidance="Keep one anchor stop, one meal, and one flexible discovery block.",
                confidence_label="medium",
                scope_class="in_scope_travel",
                actions=[BuddyAction(id="share-export", type="share_export_pack", label="Share Export Pack")],
            ),
        )

    monkeypatch.setattr(GeminiProvider, "generate", failing_gemini)
    monkeypatch.setattr(OllamaProvider, "generate", fake_ollama_generate)
    async def fallback_google_profile(settings, access_token, id_token):
        return auth_service.GoogleIdentity(
            subject="google-subject-buddy-2",
            email="fallback@saayro.app",
            full_name="Fallback Tester",
            email_verified=True,
        )

    monkeypatch.setattr(auth_service, "_load_google_profile", fallback_google_profile)

    async with client_factory() as client:
        await client.post("/v1/auth/google/web", json={"access_token": "test-google-access-token"})
        trip_id = await _create_trip(client)
        await client.post(f"/v1/trips/{trip_id}/itinerary/generate")
        buddy = await client.post(f"/v1/trips/{trip_id}/buddy/messages", json={"content": "Help me refine this itinerary pacing."})
        body = buddy.json()
        assert buddy.status_code == 201
        assert body[1]["response"]["dev_metadata"]["provider"] == "Ollama"
        assert body[1]["response"]["dev_metadata"]["fallback_used"] is True


async def test_buddy_out_of_scope_redirects_and_hides_dev_metadata_in_production(
    monkeypatch,
    client_factory,
) -> None:
    monkeypatch.setenv("SAAYRO_API_ENV", "production")
    monkeypatch.setenv("SAAYRO_API_AI_ENABLED", "true")
    monkeypatch.setenv("SAAYRO_API_AI_PROVIDER", "mock")
    monkeypatch.setenv("SAAYRO_API_AI_DEV_PROVIDER_BADGE", "false")
    async def production_google_profile(settings, access_token, id_token):
        return auth_service.GoogleIdentity(
            subject="google-subject-buddy-3",
            email="prod@saayro.app",
            full_name="Prod Tester",
            email_verified=True,
        )

    monkeypatch.setattr(auth_service, "_load_google_profile", production_google_profile)

    async with client_factory() as client:
        await client.post("/v1/auth/google/web", json={"access_token": "test-google-access-token"})
        trip_id = await _create_trip(client)
        buddy = await client.post(f"/v1/trips/{trip_id}/buddy/messages", json={"content": "Help me debug this Python function."})
        body = buddy.json()
        assert buddy.status_code == 201
        assert body[1]["response"]["scope_class"] == "out_of_scope"
        assert body[1]["response"]["dev_metadata"] is None


async def test_pretrip_buddy_thread_attaches_to_created_trip(monkeypatch, client_factory) -> None:
    monkeypatch.setenv("SAAYRO_API_AI_ENABLED", "true")
    monkeypatch.setenv("SAAYRO_API_AI_PROVIDER", "mock")

    async def pretrip_google_profile(settings, access_token, id_token):
        return auth_service.GoogleIdentity(
            subject="google-subject-buddy-pretrip",
            email="pretrip@saayro.app",
            full_name="Pretrip Tester",
            email_verified=True,
        )

    monkeypatch.setattr(auth_service, "_load_google_profile", pretrip_google_profile)

    async with client_factory() as client:
        await client.post("/v1/auth/google/web", json={"access_token": "test-google-access-token"})
        pretrip = await client.post("/v1/buddy/pre-trip/messages", json={"content": "Help me choose between Jaipur and Udaipur."})
        assert pretrip.status_code == 201
        assert len(pretrip.json()) == 2

        trip_id = await _create_trip(client)
        attached = await client.post("/v1/buddy/pre-trip/attach-trip", json={"trip_id": trip_id})
        assert attached.status_code == 200
        assert attached.json()["attached"] is True
        assert attached.json()["migrated_message_count"] == 2

        trip_thread = await client.get(f"/v1/trips/{trip_id}/buddy/messages")
        assert trip_thread.status_code == 200
        assert len(trip_thread.json()) == 2
