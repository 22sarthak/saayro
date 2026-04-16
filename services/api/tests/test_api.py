from __future__ import annotations

from httpx import AsyncClient


async def test_health_and_status(client: AsyncClient) -> None:
    health = await client.get("/health")
    status = await client.get("/status")

    assert health.status_code == 200
    assert health.json() == {"status": "ok"}
    assert status.status_code == 200
    assert status.json()["service"] == "Saayro API"


async def test_trip_crud_and_related_placeholders(client: AsyncClient) -> None:
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
    trip_id = created.json()["id"]

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

