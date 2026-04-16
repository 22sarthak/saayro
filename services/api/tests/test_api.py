from __future__ import annotations

from httpx import AsyncClient

from saayro_api.ai.providers.gemini import GeminiProvider
from saayro_api.ai.providers.ollama import OllamaProvider
from saayro_api.ai.types import BuddyAction, BuddyProviderResponse, BuddyStructuredReply
from saayro_api.core.errors import ApiException


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


async def test_trip_crud_and_related_placeholders(client: AsyncClient) -> None:
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


async def test_connections_and_error_envelope(client: AsyncClient) -> None:
    missing = await client.get("/v1/trips/missing-trip")
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "not_found"

    connected = await client.post("/v1/connections/gmail/connect")
    assert connected.status_code == 201
    assert connected.json()["provider"] == "gmail"

    invalid = await client.post("/v1/connections/unknown/connect")
    assert invalid.status_code == 400
    assert invalid.json()["error"]["code"] == "validation_error"


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

    async with client_factory() as client:
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

    async with client_factory() as client:
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

    async with client_factory() as client:
        trip_id = await _create_trip(client)
        buddy = await client.post(f"/v1/trips/{trip_id}/buddy/messages", json={"content": "Help me debug this Python function."})
        body = buddy.json()
        assert buddy.status_code == 201
        assert body[1]["response"]["scope_class"] == "out_of_scope"
        assert body[1]["response"]["dev_metadata"] is None
