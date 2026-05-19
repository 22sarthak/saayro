from __future__ import annotations

from datetime import date, timedelta
from typing import Any

import pytest

from saayro_api.ai.orchestrator import BuddyOrchestrator
from saayro_api.ai.types import (
    BuddyAction,
    BuddyProviderResponse,
    BuddyStructuredReply,
    BuddyTripContext,
    BuddyTripDraft,
    BuddyUserContext,
    SaayroBuddyContext,
)
from saayro_api.core.config import Settings
from saayro_api.services.buddy import (
    _scrub_migrated_pretrip_message,
    _scrub_pretrip_state_for_trip,
)


def _settings() -> Settings:
    return Settings(
        ai_provider="auto",
        ai_gemini_api_key="",
        ai_groq_api_key="",
        ai_ollama_cloud_enabled=False,
        ai_ollama_cloud_api_key="",
        ai_ollama_local_enabled=False,
        ai_dev_provider_badge=True,
    )


def test_scrub_pretrip_state_rewrites_mode_and_drops_stale_fields() -> None:
    state = {
        "mode": "new_trip_planning",
        "requested_destination": "Goa",
        "source_trip_id": "pretrip-abc",
        "existing_trip_match": {"id": "x", "title": "y", "destination_city": "Goa"},
        "overview": "something kept",
        "options": ["a", "b"],
        "itinerary_intent": True,
    }
    scrubbed = _scrub_pretrip_state_for_trip(state)

    assert scrubbed["mode"] == "refine_existing_trip"
    assert "requested_destination" not in scrubbed
    assert "source_trip_id" not in scrubbed
    assert "existing_trip_match" not in scrubbed
    assert "itinerary_intent" not in scrubbed
    assert scrubbed["overview"] == "something kept"
    assert scrubbed["options"] == ["a", "b"]


def test_scrub_pretrip_state_preserves_non_new_trip_modes() -> None:
    state = {"mode": "refine_existing_trip", "overview": "kept"}
    scrubbed = _scrub_pretrip_state_for_trip(state)
    assert scrubbed["mode"] == "refine_existing_trip"


def test_scrub_migrated_pretrip_message_nulls_trip_draft_and_rewrites_state() -> None:
    class FakeMessage:
        def __init__(self, response_json: dict[str, Any] | None) -> None:
            self.response_json = response_json

    msg = FakeMessage(
        {
            "summary": "s",
            "guidance": "g",
            "trip_draft": {"destination_city": "Goa", "ready": True},
            "planning_state": {
                "mode": "new_trip_planning",
                "requested_destination": "Goa",
            },
        }
    )
    _scrub_migrated_pretrip_message(msg)  # type: ignore[arg-type]

    assert msg.response_json is not None
    assert msg.response_json["trip_draft"] is None
    assert msg.response_json["planning_state"]["mode"] == "refine_existing_trip"
    assert "requested_destination" not in msg.response_json["planning_state"]


def test_scrub_migrated_pretrip_message_ignores_missing_response_json() -> None:
    class FakeMessage:
        def __init__(self) -> None:
            self.response_json = None

    msg = FakeMessage()
    _scrub_migrated_pretrip_message(msg)  # type: ignore[arg-type]
    assert msg.response_json is None


class _FakeProvider:
    provider_name = "FakeProvider"
    model_name = "fake-model"

    def __init__(self, reply: BuddyStructuredReply) -> None:
        self._reply = reply

    async def generate(self, request: Any) -> BuddyProviderResponse:
        return BuddyProviderResponse(
            reply=self._reply, provider=self.provider_name, model=self.model_name
        )


def _build_reply_with_trip_draft() -> BuddyStructuredReply:
    return BuddyStructuredReply(
        summary="Let's refine your Goa trip.",
        guidance="Day 1: beach. Day 2: history.",
        confidence_label="medium",
        scope_class="in_scope_travel",
        actions=[],
        follow_up_question=None,
        tool_hints=[],
        options=[],
        planning_state={},
        trip_draft=BuddyTripDraft(
            title="Goa trip",
            destination_city="Goa",
            start_date="2024-09-22",
            end_date="2024-09-25",
            ready=True,
        ),
    )


class _FakeActor:
    user_id = "user-1"


class _FakeTrip:
    id = "trip-1"
    title = "Udaipur weekend"
    destination_city = "Udaipur"


@pytest.mark.asyncio
async def test_trip_bound_reply_strips_trip_draft(monkeypatch: pytest.MonkeyPatch) -> None:
    orch = BuddyOrchestrator(_settings())
    reply = _build_reply_with_trip_draft()
    fake = _FakeProvider(reply)

    monkeypatch.setattr(orch, "_provider_order", lambda: [fake])

    async def fake_build_context(*args: Any, **kwargs: Any) -> SaayroBuddyContext:
        return SaayroBuddyContext(
            user=BuddyUserContext(user_id="user-1", full_name="T", email="t@x.com")
        )

    monkeypatch.setattr("saayro_api.ai.orchestrator.build_buddy_context", fake_build_context)

    async def fake_get_trip(db: Any, user_id: str, trip_id: str) -> _FakeTrip:
        return _FakeTrip()

    monkeypatch.setattr("saayro_api.ai.orchestrator.get_trip_model_or_404", fake_get_trip)

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id="trip-1",
        message="plan the itinerary for the trip",
    )

    assert generation.reply.trip_draft is None
    assert generation.created_trip_id is None
    assert generation.provider == "FakeProvider"


def _pretrip_reply_with_past_dates() -> BuddyStructuredReply:
    return BuddyStructuredReply(
        summary="Creating your Goa trip.",
        guidance="ok",
        confidence_label="high",
        scope_class="in_scope_travel",
        actions=[],
        follow_up_question=None,
        tool_hints=[],
        options=[],
        planning_state={},
        trip_draft=BuddyTripDraft(
            title="Goa trip",
            destination_city="Goa",
            destination_region="Goa",
            destination_country="India",
            start_date="2024-09-22",
            end_date="2024-09-25",
            party="couple",
            overview="Explore local culture.",
            ready=True,
        ),
    )


@pytest.mark.asyncio
async def test_pretrip_past_dates_trigger_clarification_reply(monkeypatch: pytest.MonkeyPatch) -> None:
    orch = BuddyOrchestrator(_settings())
    fake = _FakeProvider(_pretrip_reply_with_past_dates())

    monkeypatch.setattr(orch, "_provider_order", lambda: [fake])

    async def fake_build_context(*args: Any, **kwargs: Any) -> SaayroBuddyContext:
        return SaayroBuddyContext(
            user=BuddyUserContext(user_id="user-1", full_name="T", email="t@x.com")
        )

    monkeypatch.setattr("saayro_api.ai.orchestrator.build_buddy_context", fake_build_context)

    async def empty_trips(db: Any, user_id: str) -> list[Any]:
        return []

    monkeypatch.setattr("saayro_api.ai.orchestrator.list_trips", empty_trips)

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id=None,
        message="Plan a 4 day trip to Goa.",
    )

    assert generation.created_trip_id is None
    assert generation.reply.trip_draft is None
    assert generation.reply.planning_state["mode"] == "awaiting_dates"
    assert len(generation.reply.options) == 3
    today = date.today()
    for option in generation.reply.options:
        start_s, _, end_s = option.partition(" to ")
        assert date.fromisoformat(start_s) >= today + timedelta(days=1)


@pytest.mark.asyncio
async def test_pretrip_valid_future_dates_still_create_trip(monkeypatch: pytest.MonkeyPatch) -> None:
    today = date.today()
    future_start = today + timedelta(days=14)
    future_end = future_start + timedelta(days=3)

    reply = _pretrip_reply_with_past_dates()
    draft = reply.trip_draft
    assert draft is not None
    reply = reply.model_copy(
        update={
            "trip_draft": draft.model_copy(
                update={
                    "start_date": future_start.isoformat(),
                    "end_date": future_end.isoformat(),
                }
            )
        }
    )
    orch = BuddyOrchestrator(_settings())
    fake = _FakeProvider(reply)

    monkeypatch.setattr(orch, "_provider_order", lambda: [fake])

    async def fake_build_context(*args: Any, **kwargs: Any) -> SaayroBuddyContext:
        return SaayroBuddyContext(
            user=BuddyUserContext(user_id="user-1", full_name="T", email="t@x.com")
        )

    monkeypatch.setattr("saayro_api.ai.orchestrator.build_buddy_context", fake_build_context)

    async def empty_trips(db: Any, user_id: str) -> list[Any]:
        return []

    monkeypatch.setattr("saayro_api.ai.orchestrator.list_trips", empty_trips)

    created_ids: list[str] = []

    async def fake_create_trip(db: Any, user_id: str, payload: Any) -> _FakeTrip:
        created_ids.append("trip-created-1")
        trip = _FakeTrip()
        trip.id = "trip-created-1"
        return trip

    monkeypatch.setattr("saayro_api.ai.orchestrator.create_trip", fake_create_trip)

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id=None,
        message="Plan a 4 day trip to Goa.",
    )

    assert generation.created_trip_id == "trip-created-1"
    assert created_ids == ["trip-created-1"]
    action_types = {action.type for action in generation.reply.actions}
    assert "open_trip_hub" in action_types
    assert "plan_itinerary" in action_types
    plan_action = next(a for a in generation.reply.actions if a.type == "plan_itinerary")
    assert plan_action.payload.get("trip_id") == "trip-created-1"


@pytest.mark.asyncio
async def test_what_next_after_itinerary_returns_continuation_options(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    orch = BuddyOrchestrator(_settings())

    class _ShouldNotCallProvider:
        provider_name = "Should"
        model_name = "not-call"

        async def generate(self, request: Any) -> BuddyProviderResponse:  # noqa: ARG002
            raise AssertionError("provider should not be called on deterministic continuation")

    monkeypatch.setattr(orch, "_provider_order", lambda: [_ShouldNotCallProvider()])

    async def fake_build_context(*args: Any, **kwargs: Any) -> SaayroBuddyContext:
        return SaayroBuddyContext(
            user=BuddyUserContext(user_id="user-1", full_name="T", email="t@x.com")
        )

    monkeypatch.setattr("saayro_api.ai.orchestrator.build_buddy_context", fake_build_context)

    async def fake_get_trip(db: Any, user_id: str, trip_id: str) -> _FakeTrip:
        return _FakeTrip()

    monkeypatch.setattr("saayro_api.ai.orchestrator.get_trip_model_or_404", fake_get_trip)

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id="trip-1",
        message="what next",
        active_turn_context={"last_guidance": "Day 1: beach.\nDay 2: history."},
    )

    assert generation.reply.scope_class == "in_scope_travel"
    assert generation.reply.options
    assert any("relaxed" in option.casefold() for option in generation.reply.options)


@pytest.mark.asyncio
async def test_what_next_trip_bound_without_itinerary_calls_provider(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    orch = BuddyOrchestrator(_settings())

    reply = BuddyStructuredReply(
        summary="Here's a gentle next step.",
        guidance="Pick a pacing refinement.",
        confidence_label="medium",
        scope_class="in_scope_travel",
        actions=[],
        follow_up_question=None,
        tool_hints=[],
        options=["Refine pacing"],
        planning_state={},
        trip_draft=None,
    )
    fake = _FakeProvider(reply)

    monkeypatch.setattr(orch, "_provider_order", lambda: [fake])

    async def fake_build_context(*args: Any, **kwargs: Any) -> SaayroBuddyContext:
        return SaayroBuddyContext(
            user=BuddyUserContext(user_id="user-1", full_name="T", email="t@x.com")
        )

    monkeypatch.setattr("saayro_api.ai.orchestrator.build_buddy_context", fake_build_context)

    async def fake_get_trip(db: Any, user_id: str, trip_id: str) -> _FakeTrip:
        return _FakeTrip()

    monkeypatch.setattr("saayro_api.ai.orchestrator.get_trip_model_or_404", fake_get_trip)

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id="trip-1",
        message="what next",
    )

    assert generation.reply.scope_class == "in_scope_travel"
    assert generation.provider == "FakeProvider"


@pytest.mark.asyncio
async def test_itinerary_reply_normalises_day_lines_and_strips_map_action(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    orch = BuddyOrchestrator(_settings())

    reply = BuddyStructuredReply(
        summary="Munnar itinerary outline.",
        guidance="Day 1: tea gardens. Day 2: Eravikulam park. Day 3: Mattupetty. Day 4: drive back.",
        confidence_label="high",
        scope_class="in_scope_travel",
        actions=[
            BuddyAction(id="map-1", type="open_in_maps", label="Open in maps"),
        ],
        follow_up_question=None,
        tool_hints=[],
        options=[],
        planning_state={},
        trip_draft=None,
    )
    fake = _FakeProvider(reply)

    monkeypatch.setattr(orch, "_provider_order", lambda: [fake])

    async def fake_build_context(*args: Any, **kwargs: Any) -> SaayroBuddyContext:
        return SaayroBuddyContext(
            user=BuddyUserContext(user_id="user-1", full_name="T", email="t@x.com")
        )

    monkeypatch.setattr("saayro_api.ai.orchestrator.build_buddy_context", fake_build_context)

    async def fake_get_trip(db: Any, user_id: str, trip_id: str) -> _FakeTrip:
        return _FakeTrip()

    monkeypatch.setattr("saayro_api.ai.orchestrator.get_trip_model_or_404", fake_get_trip)

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id="trip-1",
        message="Plan the itinerary for this trip",
    )

    guidance = generation.reply.guidance
    assert guidance.count("\nDay 2:") == 1
    assert guidance.count("\nDay 3:") == 1
    assert guidance.count("\nDay 4:") == 1
    action_types = {action.type for action in generation.reply.actions}
    assert "open_in_maps" not in action_types


@pytest.mark.asyncio
async def test_trip_bound_provider_actions_get_enriched_with_trip_id(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    orch = BuddyOrchestrator(_settings())
    reply = BuddyStructuredReply(
        summary="Refine options.",
        guidance="Day 1: walk. Day 2: market.",
        confidence_label="medium",
        scope_class="in_scope_travel",
        actions=[
            BuddyAction(id="a", type="itinerary_refine", label="Refine", payload={}),
            BuddyAction(id="b", type="open_trip_hub", label="Hub", payload={}),
        ],
        follow_up_question=None,
        tool_hints=[],
        options=[],
        planning_state={},
        trip_draft=None,
    )
    fake = _FakeProvider(reply)
    monkeypatch.setattr(orch, "_provider_order", lambda: [fake])

    async def fake_build_context(*args: Any, **kwargs: Any) -> SaayroBuddyContext:
        return SaayroBuddyContext(
            user=BuddyUserContext(user_id="user-1", full_name="T", email="t@x.com")
        )

    monkeypatch.setattr("saayro_api.ai.orchestrator.build_buddy_context", fake_build_context)

    async def fake_get_trip(db: Any, user_id: str, trip_id: str) -> _FakeTrip:
        return _FakeTrip()

    monkeypatch.setattr("saayro_api.ai.orchestrator.get_trip_model_or_404", fake_get_trip)

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id="trip-1",
        message="plan the itinerary for the trip",
    )

    for action in generation.reply.actions:
        assert action.payload.get("trip_id") == "trip-1"


@pytest.mark.asyncio
async def test_trip_bound_provider_action_conflicting_trip_id_is_overwritten(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    orch = BuddyOrchestrator(_settings())
    reply = BuddyStructuredReply(
        summary="Refine options.",
        guidance="Day 1: walk.",
        confidence_label="medium",
        scope_class="in_scope_travel",
        actions=[
            BuddyAction(
                id="a", type="itinerary_refine", label="Refine",
                payload={"trip_id": "other-trip"},
            ),
        ],
        follow_up_question=None,
        tool_hints=[],
        options=[],
        planning_state={},
        trip_draft=None,
    )
    fake = _FakeProvider(reply)
    monkeypatch.setattr(orch, "_provider_order", lambda: [fake])

    async def fake_build_context(*args: Any, **kwargs: Any) -> SaayroBuddyContext:
        return SaayroBuddyContext(
            user=BuddyUserContext(user_id="user-1", full_name="T", email="t@x.com")
        )

    monkeypatch.setattr("saayro_api.ai.orchestrator.build_buddy_context", fake_build_context)

    async def fake_get_trip(db: Any, user_id: str, trip_id: str) -> _FakeTrip:
        return _FakeTrip()

    monkeypatch.setattr("saayro_api.ai.orchestrator.get_trip_model_or_404", fake_get_trip)

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id="trip-1",
        message="plan the itinerary for the trip",
    )

    assert generation.reply.actions[0].payload.get("trip_id") == "trip-1"


@pytest.mark.asyncio
async def test_deterministic_continuation_actions_carry_trip_id(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    orch = BuddyOrchestrator(_settings())

    class _ShouldNotCallProvider:
        provider_name = "Should"
        model_name = "not-call"

        async def generate(self, request: Any) -> BuddyProviderResponse:  # noqa: ARG002
            raise AssertionError("provider should not be called on deterministic continuation")

    monkeypatch.setattr(orch, "_provider_order", lambda: [_ShouldNotCallProvider()])

    async def fake_build_context(*args: Any, **kwargs: Any) -> SaayroBuddyContext:
        return SaayroBuddyContext(
            user=BuddyUserContext(user_id="user-1", full_name="T", email="t@x.com")
        )

    monkeypatch.setattr("saayro_api.ai.orchestrator.build_buddy_context", fake_build_context)

    async def fake_get_trip(db: Any, user_id: str, trip_id: str) -> _FakeTrip:
        return _FakeTrip()

    monkeypatch.setattr("saayro_api.ai.orchestrator.get_trip_model_or_404", fake_get_trip)

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id="trip-1",
        message="what next",
        active_turn_context={"last_guidance": "Day 1: beach.\nDay 2: history."},
    )

    assert generation.reply.actions
    for action in generation.reply.actions:
        assert action.payload.get("trip_id") == "trip-1"


def _build_past_trip_context(trip_id: str = "trip-old", title: str = "Goa memories") -> SaayroBuddyContext:
    past_start = date.today() - timedelta(days=40)
    past_end = past_start + timedelta(days=3)
    return SaayroBuddyContext(
        user=BuddyUserContext(user_id="user-1", full_name="T", email="t@x.com"),
        trip=BuddyTripContext(
            id=trip_id,
            title=title,
            destination_city="Goa",
            destination_region="Goa",
            destination_country="India",
            start_date=past_start,
            end_date=past_end,
            party="couple",
            overview="Laid-back Goa break.",
            highlights=[],
            preferences={},
        ),
    )


@pytest.mark.asyncio
async def test_past_dates_active_trip_short_circuits_without_provider(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    orch = BuddyOrchestrator(_settings())

    class _ShouldNotCallProvider:
        provider_name = "Should"
        model_name = "not-call"

        async def generate(self, request: Any) -> BuddyProviderResponse:  # noqa: ARG002
            raise AssertionError("provider must not be called for past-dates short-circuit")

    monkeypatch.setattr(orch, "_provider_order", lambda: [_ShouldNotCallProvider()])

    async def fake_build_context(*args: Any, **kwargs: Any) -> SaayroBuddyContext:
        return _build_past_trip_context(trip_id="trip-old")

    monkeypatch.setattr("saayro_api.ai.orchestrator.build_buddy_context", fake_build_context)

    async def fake_get_trip(db: Any, user_id: str, trip_id: str) -> _FakeTrip:
        return _FakeTrip()

    monkeypatch.setattr("saayro_api.ai.orchestrator.get_trip_model_or_404", fake_get_trip)

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id="trip-old",
        message="plan the itinerary",
    )

    assert generation.provider == "mock"
    assert generation.model == "saayro-past-trip"
    assert "past dates" in generation.reply.summary.casefold()
    assert "Refresh with future dates" in generation.reply.options
    assert "Review this old trip" in generation.reply.options
    assert "Open Trip Hub" in generation.reply.options
    hub_action = next(a for a in generation.reply.actions if a.type == "open_trip_hub")
    assert hub_action.payload.get("trip_id") == "trip-old"


@pytest.mark.asyncio
async def test_past_dates_review_option_returns_deterministic_review_entry(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    orch = BuddyOrchestrator(_settings())

    class _ShouldNotCallProvider:
        provider_name = "Should"
        model_name = "not-call"

        async def generate(self, request: Any) -> BuddyProviderResponse:  # noqa: ARG002
            raise AssertionError(
                "provider must not be called for the past-trip review entry deterministic path"
            )

    monkeypatch.setattr(orch, "_provider_order", lambda: [_ShouldNotCallProvider()])

    async def fake_build_context(*args: Any, **kwargs: Any) -> SaayroBuddyContext:
        return _build_past_trip_context(trip_id="trip-old")

    monkeypatch.setattr("saayro_api.ai.orchestrator.build_buddy_context", fake_build_context)

    async def fake_get_trip(db: Any, user_id: str, trip_id: str) -> _FakeTrip:
        return _FakeTrip()

    monkeypatch.setattr("saayro_api.ai.orchestrator.get_trip_model_or_404", fake_get_trip)

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id="trip-old",
        message="Review this old trip",
        active_turn_context={
            "options": [
                "Refresh with future dates",
                "Review this old trip",
                "Open Trip Hub",
            ]
        },
    )

    assert generation.provider == "mock"
    assert generation.model == "saayro-past-trip-review-entry"
    state = generation.reply.planning_state
    assert state["mode"] == "past_trip_review"
    assert state["source_trip_id"] == "trip-old"
    assert "Reuse highlights for a future trip" in generation.reply.options


@pytest.mark.asyncio
async def test_pretrip_overview_guard_blocks_creation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    today = date.today()
    future_start = today + timedelta(days=14)
    future_end = future_start + timedelta(days=3)
    reply = BuddyStructuredReply(
        summary="Creating trip.",
        guidance="ok",
        confidence_label="high",
        scope_class="in_scope_travel",
        actions=[],
        follow_up_question=None,
        tool_hints=[],
        options=[],
        planning_state={},
        trip_draft=BuddyTripDraft(
            title="Bangalore trip",
            destination_city="Bangalore",
            destination_region="Karnataka",
            destination_country="India",
            start_date=future_start.isoformat(),
            end_date=future_end.isoformat(),
            party="family",
            overview="",
            ready=True,
        ),
    )
    orch = BuddyOrchestrator(_settings())
    fake = _FakeProvider(reply)
    monkeypatch.setattr(orch, "_provider_order", lambda: [fake])

    async def fake_build_context(*args: Any, **kwargs: Any) -> SaayroBuddyContext:
        return SaayroBuddyContext(
            user=BuddyUserContext(user_id="user-1", full_name="T", email="t@x.com")
        )

    monkeypatch.setattr("saayro_api.ai.orchestrator.build_buddy_context", fake_build_context)

    async def empty_trips(db: Any, user_id: str) -> list[Any]:
        return []

    monkeypatch.setattr("saayro_api.ai.orchestrator.list_trips", empty_trips)

    created: list[str] = []

    async def fake_create_trip(db: Any, user_id: str, payload: Any) -> _FakeTrip:
        created.append("should-not-happen")
        trip = _FakeTrip()
        trip.id = "should-not-happen"
        return trip

    monkeypatch.setattr("saayro_api.ai.orchestrator.create_trip", fake_create_trip)

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id=None,
        message="Plan a trip to Bangalore for family.",
    )

    assert generation.created_trip_id is None
    assert created == []
    assert generation.model == "saayro-awaiting-overview"
    assert generation.reply.planning_state["mode"] == "awaiting_overview"
    assert "Family-friendly sightseeing" in generation.reply.options


def test_scrub_pretrip_state_overwrites_source_trip_id_with_route_trip_id() -> None:
    state = {
        "mode": "refine_existing_trip",
        "source_trip_id": "other-trip",
    }
    scrubbed = _scrub_pretrip_state_for_trip(state, trip_id="route-trip")
    assert scrubbed["source_trip_id"] == "route-trip"


def test_plan_itinerary_action_type_is_valid() -> None:
    action = BuddyAction(
        id="plan-itinerary-for-trip",
        type="plan_itinerary",
        label="Plan itinerary for this trip",
        payload={"trip_id": "trip-xyz"},
    )
    assert action.type == "plan_itinerary"
    assert action.payload["trip_id"] == "trip-xyz"


# ---------------------------------------------------------------------------
# Guided planning memory / expected-answer continuation tests
# ---------------------------------------------------------------------------


def _future_iso_range(days_offset: int = 30, span: int = 4) -> tuple[str, str]:
    start = date.today() + timedelta(days=days_offset)
    end = start + timedelta(days=span)
    return start.isoformat(), end.isoformat()


class _ShouldNotCall:
    provider_name = "ShouldNotCall"
    model_name = "should-not-call"

    async def generate(self, request: Any) -> BuddyProviderResponse:  # noqa: ARG002
        raise AssertionError("provider must not be called for this deterministic path")


def test_next_missing_field_ordering() -> None:
    from saayro_api.ai.orchestrator import _next_missing_field

    assert _next_missing_field({}) == "destination"
    assert (
        _next_missing_field({"destination_city": "Goa"}) == "dates"
    )
    assert (
        _next_missing_field(
            {"destination_city": "Goa", "start_date": "2026-05-10", "end_date": "2026-05-14"}
        )
        == "party"
    )
    assert (
        _next_missing_field(
            {
                "destination_city": "Goa",
                "start_date": "2026-05-10",
                "end_date": "2026-05-14",
                "party": "couple",
            }
        )
        == "overview"
    )
    assert (
        _next_missing_field(
            {
                "destination_city": "Goa",
                "start_date": "2026-05-10",
                "end_date": "2026-05-14",
                "party": "couple",
                "overview": "relaxed beach break and local food",
            }
        )
        is None
    )


def test_extract_date_range_accepts_iso_and_flags_ambiguous() -> None:
    from saayro_api.ai.continuation import extract_date_range

    result = extract_date_range("Please plan 2026-05-20 to 2026-05-24.")
    assert isinstance(result, tuple)
    assert result[0] == date(2026, 5, 20)
    assert result[1] == date(2026, 5, 24)

    assert extract_date_range("May 24 to May 30") == "ambiguous"
    assert extract_date_range("24/05/2026 to 30/05/2026") == "ambiguous"
    assert extract_date_range("next weekend") == "ambiguous"
    assert extract_date_range("random chat") is None
    assert extract_date_range("") is None


def test_extract_party_handles_aliases() -> None:
    from saayro_api.ai.continuation import extract_party

    assert extract_party("Going with my family next month") == "family"
    assert extract_party("me and my partner") == "couple"
    assert extract_party("Just by myself, nothing fancy") == "solo"
    assert extract_party("with friends") == "friends"
    assert extract_party("it's a business trip") == "business"
    assert extract_party("just chatting") is None


def test_unsupported_options_are_sanitized() -> None:
    from saayro_api.ai.orchestrator import _sanitize_options

    cleaned = _sanitize_options(
        [
            "Goa",
            "Export trip details",
            "Review saved places",
            "Open in Maps",
            "Pick dates",
            "Share export pack",
        ]
    )
    assert "Goa" in cleaned
    assert "Pick dates" in cleaned
    assert all("export" not in o.casefold() for o in cleaned)
    assert all("saved" not in o.casefold() for o in cleaned)
    assert all("map" not in o.casefold() for o in cleaned)


@pytest.mark.asyncio
async def test_iso_date_reply_after_expected_dates_does_not_guardrail(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    orch = BuddyOrchestrator(_settings())
    monkeypatch.setattr(orch, "_provider_order", lambda: [_ShouldNotCall()])

    start, end = _future_iso_range(30, 4)

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id=None,
        message=f"{start} to {end}",
        planning_state={
            "mode": "awaiting_dates",
            "destination_city": "Ranchi",
            "requested_days": 5,
            "expected_answer_type": "dates",
        },
        active_turn_context={
            "expected_answer_type": "dates",
            "mode": "awaiting_dates",
        },
    )

    state = generation.reply.planning_state
    assert state.get("start_date") == start
    assert state.get("end_date") == end
    assert generation.reply.scope_class == "in_scope_travel"
    assert "guardrail" not in generation.reply.summary.casefold()


@pytest.mark.asyncio
async def test_free_text_overview_after_expected_overview_is_accepted(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    orch = BuddyOrchestrator(_settings())
    monkeypatch.setattr(orch, "_provider_order", lambda: [_ShouldNotCall()])

    start, end = _future_iso_range(30, 4)

    async def empty_trips(db: Any, user_id: str) -> list[Any]:
        return []

    monkeypatch.setattr("saayro_api.ai.orchestrator.list_trips", empty_trips)

    created_ids: list[str] = []

    async def fake_create_trip(db: Any, user_id: str, payload: Any) -> _FakeTrip:
        created_ids.append("trip-new")
        trip = _FakeTrip()
        trip.id = "trip-new"
        return trip

    monkeypatch.setattr("saayro_api.ai.orchestrator.create_trip", fake_create_trip)

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id=None,
        message="We want to explore nature and local culture",
        planning_state={
            "mode": "awaiting_overview",
            "destination_city": "Ranchi",
            "destination_region": "Jharkhand",
            "requested_days": 5,
            "start_date": start,
            "end_date": end,
            "party": "family",
            "expected_answer_type": "overview",
        },
        active_turn_context={
            "expected_answer_type": "overview",
            "mode": "awaiting_overview",
        },
    )

    state = generation.reply.planning_state
    assert isinstance(state.get("overview"), str)
    assert state["overview"].startswith("We want to explore nature")  # type: ignore[union-attr]
    assert generation.reply.scope_class == "in_scope_travel"


@pytest.mark.asyncio
async def test_one_shot_multifield_capture_advances_to_overview(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    orch = BuddyOrchestrator(_settings())
    monkeypatch.setattr(orch, "_provider_order", lambda: [_ShouldNotCall()])

    start, end = _future_iso_range(30, 4)

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id=None,
        message=f"Plan a 5 day family trip to Goa {start} to {end}",
        planning_state={
            "mode": "pretrip_create",
            "expected_answer_type": "destination",
        },
        active_turn_context={
            "expected_answer_type": "destination",
            "mode": "pretrip_create",
        },
    )

    state = generation.reply.planning_state
    assert state.get("destination_city") == "Goa"
    assert state.get("start_date") == start
    assert state.get("end_date") == end
    assert state.get("party") == "family"
    assert state.get("expected_answer_type") == "overview"
    assert state.get("next_missing_field") == "overview"


@pytest.mark.asyncio
async def test_past_trip_refresh_offers_custom_dates(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    orch = BuddyOrchestrator(_settings())
    monkeypatch.setattr(orch, "_provider_order", lambda: [_ShouldNotCall()])

    async def fake_build_context(*args: Any, **kwargs: Any) -> SaayroBuddyContext:
        return _build_past_trip_context(trip_id="trip-old")

    monkeypatch.setattr("saayro_api.ai.orchestrator.build_buddy_context", fake_build_context)

    async def fake_get_trip(db: Any, user_id: str, trip_id: str) -> _FakeTrip:
        return _FakeTrip()

    monkeypatch.setattr("saayro_api.ai.orchestrator.get_trip_model_or_404", fake_get_trip)

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id="trip-old",
        message="Refresh with future dates",
        active_turn_context={
            "options": [
                "Refresh with future dates",
                "Review this old trip",
                "Open Trip Hub",
            ]
        },
    )

    assert generation.provider == "mock"
    assert generation.model == "saayro-past-trip-refresh"
    state = generation.reply.planning_state
    assert state["mode"] == "past_trip_refresh"
    assert state["expected_answer_type"] == "dates"
    assert any("custom dates" in o.casefold() for o in generation.reply.options)


@pytest.mark.asyncio
async def test_past_trip_refresh_accepts_iso_without_re_guarding(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    orch = BuddyOrchestrator(_settings())
    monkeypatch.setattr(orch, "_provider_order", lambda: [_ShouldNotCall()])

    async def fake_build_context(*args: Any, **kwargs: Any) -> SaayroBuddyContext:
        return _build_past_trip_context(trip_id="trip-old")

    monkeypatch.setattr("saayro_api.ai.orchestrator.build_buddy_context", fake_build_context)

    async def fake_get_trip(db: Any, user_id: str, trip_id: str) -> _FakeTrip:
        return _FakeTrip()

    monkeypatch.setattr("saayro_api.ai.orchestrator.get_trip_model_or_404", fake_get_trip)

    start, end = _future_iso_range(30, 4)

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id="trip-old",
        message=f"{start} to {end}",
        planning_state={
            "mode": "past_trip_refresh",
            "source_trip_id": "trip-old",
            "destination_city": "Goa",
            "destination_region": "Goa",
            "party": "couple",
            "overview": "Laid-back Goa break.",
            "requested_days": 4,
            "expected_answer_type": "dates",
        },
        active_turn_context={
            "mode": "past_trip_refresh",
            "expected_answer_type": "dates",
        },
    )

    assert generation.model != "saayro-past-trip"
    state = generation.reply.planning_state
    assert state.get("start_date") == start
    assert state.get("end_date") == end


@pytest.mark.asyncio
async def test_let_me_pick_custom_dates_returns_custom_dates_prompt(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    orch = BuddyOrchestrator(_settings())
    monkeypatch.setattr(orch, "_provider_order", lambda: [_ShouldNotCall()])

    async def fake_build_context(*args: Any, **kwargs: Any) -> SaayroBuddyContext:
        return _build_past_trip_context(trip_id="trip-old")

    monkeypatch.setattr("saayro_api.ai.orchestrator.build_buddy_context", fake_build_context)

    async def fake_get_trip(db: Any, user_id: str, trip_id: str) -> _FakeTrip:
        return _FakeTrip()

    monkeypatch.setattr("saayro_api.ai.orchestrator.get_trip_model_or_404", fake_get_trip)

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id="trip-old",
        message="Let me pick custom dates",
        planning_state={
            "mode": "past_trip_refresh",
            "source_trip_id": "trip-old",
            "destination_city": "Goa",
            "party": "couple",
            "expected_answer_type": "dates",
        },
        active_turn_context={
            "mode": "past_trip_refresh",
            "expected_answer_type": "dates",
        },
    )

    assert generation.model == "saayro-custom-dates"
    assert generation.reply.planning_state.get("expected_answer_type") == "dates"


@pytest.mark.asyncio
async def test_refresh_confirmation_creates_new_trip(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    orch = BuddyOrchestrator(_settings())
    monkeypatch.setattr(orch, "_provider_order", lambda: [_ShouldNotCall()])

    async def fake_build_context(*args: Any, **kwargs: Any) -> SaayroBuddyContext:
        return _build_past_trip_context(trip_id="trip-old")

    monkeypatch.setattr("saayro_api.ai.orchestrator.build_buddy_context", fake_build_context)

    async def fake_get_trip(db: Any, user_id: str, trip_id: str) -> _FakeTrip:
        return _FakeTrip()

    monkeypatch.setattr("saayro_api.ai.orchestrator.get_trip_model_or_404", fake_get_trip)

    created_ids: list[str] = []

    async def fake_create_trip(db: Any, user_id: str, payload: Any) -> _FakeTrip:
        created_ids.append("trip-refreshed")
        trip = _FakeTrip()
        trip.id = "trip-refreshed"
        return trip

    monkeypatch.setattr("saayro_api.ai.orchestrator.create_trip", fake_create_trip)

    start, end = _future_iso_range(30, 4)

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id="trip-old",
        message="Create refreshed Goa trip",
        planning_state={
            "mode": "past_trip_refresh_confirm",
            "source_trip_id": "trip-old",
            "destination_city": "Goa",
            "destination_region": "Goa",
            "party": "couple",
            "overview": "Laid-back Goa break.",
            "start_date": start,
            "end_date": end,
            "expected_answer_type": "option",
        },
        active_turn_context={
            "mode": "past_trip_refresh_confirm",
            "options": [
                "Create refreshed Goa trip",
                "Review old trip instead",
                "Cancel",
            ],
        },
    )

    assert created_ids == ["trip-refreshed"]
    assert generation.created_trip_id == "trip-refreshed"


@pytest.mark.asyncio
async def test_provider_options_with_unsupported_labels_are_stripped(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    orch = BuddyOrchestrator(_settings())
    reply = BuddyStructuredReply(
        summary="Next move",
        guidance="Here are your choices",
        confidence_label="medium",
        scope_class="in_scope_travel",
        actions=[],
        follow_up_question=None,
        tool_hints=[],
        options=[
            "Refine pacing",
            "Export trip details",
            "Review saved places",
            "Open in maps",
            "Add food stops",
        ],
        planning_state={"mode": "refine_existing_trip"},
        trip_draft=None,
    )
    fake = _FakeProvider(reply)
    monkeypatch.setattr(orch, "_provider_order", lambda: [fake])

    async def fake_build_context(*args: Any, **kwargs: Any) -> SaayroBuddyContext:
        return SaayroBuddyContext(
            user=BuddyUserContext(user_id="user-1", full_name="T", email="t@x.com")
        )

    monkeypatch.setattr("saayro_api.ai.orchestrator.build_buddy_context", fake_build_context)

    async def fake_get_trip(db: Any, user_id: str, trip_id: str) -> _FakeTrip:
        return _FakeTrip()

    monkeypatch.setattr("saayro_api.ai.orchestrator.get_trip_model_or_404", fake_get_trip)

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id="trip-1",
        message="what next",
        active_turn_context={"options": ["placeholder"]},
    )

    assert "Refine pacing" in generation.reply.options
    assert "Add food stops" in generation.reply.options
    for bad in ("Export trip details", "Review saved places", "Open in maps"):
        assert bad not in generation.reply.options
    stored_options = generation.reply.planning_state.get("options")
    assert isinstance(stored_options, list)
    for bad in ("Export trip details", "Review saved places", "Open in maps"):
        assert bad not in stored_options


@pytest.mark.asyncio
async def test_draft_recovery_ambiguous_message_returns_recovery_options(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    orch = BuddyOrchestrator(_settings())
    monkeypatch.setattr(orch, "_provider_order", lambda: [_ShouldNotCall()])

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id=None,
        message="bro plan my trip",
        planning_state={
            "mode": "awaiting_dates",
            "destination_city": "Ranchi",
            "requested_days": 5,
            "expected_answer_type": "dates",
        },
        active_turn_context={
            "mode": "awaiting_dates",
            "expected_answer_type": "dates",
        },
    )

    assert generation.model == "saayro-draft-recovery"
    labels = " ".join(generation.reply.options).casefold()
    assert "ranchi" in labels
    assert "start new trip" in labels


@pytest.mark.asyncio
async def test_draft_recovery_unambiguous_continue_resumes_next_field(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    orch = BuddyOrchestrator(_settings())
    monkeypatch.setattr(orch, "_provider_order", lambda: [_ShouldNotCall()])

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id=None,
        message="continue",
        planning_state={
            "mode": "awaiting_dates",
            "destination_city": "Ranchi",
            "requested_days": 5,
            "expected_answer_type": "dates",
        },
        active_turn_context={
            "mode": "awaiting_dates",
            "expected_answer_type": "dates",
        },
    )

    state = generation.reply.planning_state
    assert state.get("expected_answer_type") == "dates"
    assert "Ranchi".casefold() in generation.reply.summary.casefold()


@pytest.mark.asyncio
async def test_draft_recovery_start_new_trip_clears_state(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    orch = BuddyOrchestrator(_settings())
    reply = BuddyStructuredReply(
        summary="Let's pick a new destination.",
        guidance="Where are we heading?",
        confidence_label="medium",
        scope_class="in_scope_travel",
        actions=[],
        follow_up_question="Where to?",
        tool_hints=[],
        options=["Goa", "Manali", "Udaipur"],
        planning_state={"mode": "pretrip_create"},
        trip_draft=None,
    )
    fake = _FakeProvider(reply)
    monkeypatch.setattr(orch, "_provider_order", lambda: [fake])

    async def fake_build_context(*args: Any, **kwargs: Any) -> SaayroBuddyContext:
        return SaayroBuddyContext(
            user=BuddyUserContext(user_id="user-1", full_name="T", email="t@x.com")
        )

    monkeypatch.setattr("saayro_api.ai.orchestrator.build_buddy_context", fake_build_context)

    async def empty_trips(db: Any, user_id: str) -> list[Any]:
        return []

    monkeypatch.setattr("saayro_api.ai.orchestrator.list_trips", empty_trips)

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id=None,
        message="Start new trip",
        planning_state={
            "mode": "draft_recovery",
            "destination_city": "Ranchi",
            "requested_days": 5,
            "expected_answer_type": "option",
        },
        active_turn_context={
            "mode": "draft_recovery",
            "options": ["Continue Ranchi trip", "Start new trip", "Open Trip Hub"],
        },
    )

    state = generation.reply.planning_state
    assert state.get("destination_city") != "Ranchi"


@pytest.mark.asyncio
async def test_mock_fallback_with_expected_dates_preserves_state(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = Settings(
        ai_provider="auto",
        ai_gemini_api_key="",
        ai_groq_api_key="",
        ai_ollama_cloud_enabled=False,
        ai_ollama_cloud_api_key="",
        ai_ollama_local_enabled=False,
        ai_enabled=False,
        ai_dev_provider_badge=True,
    )
    orch = BuddyOrchestrator(settings)

    async def fake_build_context(*args: Any, **kwargs: Any) -> SaayroBuddyContext:
        return SaayroBuddyContext(
            user=BuddyUserContext(user_id="user-1", full_name="T", email="t@x.com")
        )

    monkeypatch.setattr("saayro_api.ai.orchestrator.build_buddy_context", fake_build_context)

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id=None,
        message="anything",
        planning_state={
            "mode": "awaiting_dates",
            "destination_city": "Ranchi",
            "requested_days": 5,
            "expected_answer_type": "dates",
        },
        active_turn_context={
            "mode": "awaiting_dates",
            "expected_answer_type": "dates",
            "options": ["2026-05-20 to 2026-05-24"],
        },
    )

    state = generation.reply.planning_state
    assert state.get("destination_city") == "Ranchi"
    assert state.get("expected_answer_type") == "dates"
    assert generation.reply.options


@pytest.mark.asyncio
async def test_mock_fallback_with_expected_overview_preserves_party(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = Settings(
        ai_provider="auto",
        ai_gemini_api_key="",
        ai_groq_api_key="",
        ai_ollama_cloud_enabled=False,
        ai_ollama_cloud_api_key="",
        ai_ollama_local_enabled=False,
        ai_enabled=False,
        ai_dev_provider_badge=True,
    )
    orch = BuddyOrchestrator(settings)

    async def fake_build_context(*args: Any, **kwargs: Any) -> SaayroBuddyContext:
        return SaayroBuddyContext(
            user=BuddyUserContext(user_id="user-1", full_name="T", email="t@x.com")
        )

    monkeypatch.setattr("saayro_api.ai.orchestrator.build_buddy_context", fake_build_context)

    start, end = _future_iso_range(30, 4)

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id=None,
        message="anything",
        planning_state={
            "mode": "awaiting_overview",
            "destination_city": "Ranchi",
            "requested_days": 5,
            "start_date": start,
            "end_date": end,
            "party": "family",
            "expected_answer_type": "overview",
        },
        active_turn_context={
            "mode": "awaiting_overview",
            "expected_answer_type": "overview",
        },
    )

    state = generation.reply.planning_state
    assert state.get("destination_city") == "Ranchi"
    assert state.get("party") == "family"
    assert state.get("expected_answer_type") == "overview"
    assert generation.reply.options


# ---------------------------------------------------------------------------
# Action semantics, post-create cleanup, finalize, refinement memory tests
# ---------------------------------------------------------------------------


def test_resolve_intent_label_mapping() -> None:
    from saayro_api.ai.orchestrator import _resolve_intent

    assert _resolve_intent(matched_option="Review details", message="Review details", prior_mode="pending_confirmation", has_trip_context=False) == "review_details"
    assert _resolve_intent(matched_option="Create Delhi trip", message="Create Delhi trip", prior_mode="pending_confirmation", has_trip_context=False) == "create_trip"
    assert _resolve_intent(matched_option="Create refreshed Goa trip", message="Create refreshed Goa trip", prior_mode="past_trip_refresh_confirm", has_trip_context=True) == "create_refreshed_trip"
    assert _resolve_intent(matched_option="Cancel", message="Cancel", prior_mode="pending_confirmation", has_trip_context=False) == "cancel_trip_creation"
    assert _resolve_intent(matched_option="Cancel", message="Cancel", prior_mode="past_trip_refresh_confirm", has_trip_context=True) == "cancel_refresh"
    assert _resolve_intent(matched_option="Edit details", message="Edit details", prior_mode="pending_confirmation", has_trip_context=False) == "edit_details"
    assert _resolve_intent(matched_option="Edit dates", message="Edit dates", prior_mode="editing_details", has_trip_context=False) == "edit_dates"
    assert _resolve_intent(matched_option="Reuse highlights for a future trip", message="x", prior_mode="past_trip_review", has_trip_context=True) == "reuse_highlights_for_future_trip"
    assert _resolve_intent(matched_option="Review this old trip", message="x", prior_mode=None, has_trip_context=True) == "review_old_trip"
    assert _resolve_intent(matched_option="Refresh with future dates", message="x", prior_mode=None, has_trip_context=True) == "refresh_with_future_dates"
    assert _resolve_intent(matched_option="Open Trip Hub", message="x", prior_mode=None, has_trip_context=True) == "open_trip_hub"
    assert _resolve_intent(matched_option="Start new trip", message="x", prior_mode=None, has_trip_context=False) == "start_new_trip"
    assert _resolve_intent(matched_option="Draft an itinerary", message="x", prior_mode="trip_bound", has_trip_context=True) == "draft_itinerary"


def test_resolve_intent_typed_text_finalize_and_refine() -> None:
    from saayro_api.ai.orchestrator import _resolve_intent

    assert _resolve_intent(matched_option=None, message="done", prior_mode="trip_bound", has_trip_context=True) == "finalize_planning"
    assert _resolve_intent(matched_option=None, message="perfect", prior_mode="trip_bound", has_trip_context=True) == "finalize_planning"
    assert _resolve_intent(matched_option=None, message="looks good", prior_mode="trip_bound", has_trip_context=True) == "finalize_planning"
    assert _resolve_intent(matched_option=None, message="finalize this trip", prior_mode="trip_bound", has_trip_context=True) == "finalize_planning"
    assert _resolve_intent(matched_option=None, message="go ahead and finalize", prior_mode="trip_bound", has_trip_context=True) == "finalize_planning"
    assert _resolve_intent(matched_option=None, message="add Lotus Temple", prior_mode="trip_bound", has_trip_context=True) == "refine_itinerary"
    # Without trip context, finalize/refine do not resolve from typed text
    assert _resolve_intent(matched_option=None, message="done", prior_mode=None, has_trip_context=False) is None
    # Typed text "Create Delhi trip" without active option should NOT resolve to create_trip
    assert _resolve_intent(matched_option=None, message="Create Delhi trip", prior_mode="pending_confirmation", has_trip_context=False) is None


def test_is_finalize_message_helper() -> None:
    from saayro_api.ai.continuation import is_finalize_message

    for positive in ("done", "Done.", "perfect", "looks good", "finalize this trip", "all good", "go ahead and finalize", "we're done"):
        assert is_finalize_message(positive), positive
    for negative in ("continue", "what next", "plan the itinerary", "add Lotus Temple", ""):
        assert not is_finalize_message(negative), negative


def test_is_refine_itinerary_message_helper() -> None:
    from saayro_api.ai.continuation import is_refine_itinerary_message

    for positive in ("Add Lotus Temple", "include a museum visit", "remove Day 3 hike", "make it more relaxed", "swap Day 2 with food stops"):
        assert is_refine_itinerary_message(positive), positive
    for negative in ("done", "what next", "plan the itinerary"):
        assert not is_refine_itinerary_message(negative), negative


@pytest.mark.asyncio
async def test_review_details_does_not_create_trip(monkeypatch: pytest.MonkeyPatch) -> None:
    orch = BuddyOrchestrator(_settings())
    monkeypatch.setattr(orch, "_provider_order", lambda: [_ShouldNotCall()])

    start, end = _future_iso_range(30, 4)

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id=None,
        message="Review details",
        planning_state={
            "mode": "pending_confirmation",
            "destination_city": "Goa",
            "destination_region": "Goa",
            "start_date": start,
            "end_date": end,
            "party": "family",
            "overview": "Relaxed beach week",
            "expected_answer_type": "option",
        },
        active_turn_context={
            "mode": "pending_confirmation",
            "options": ["Create Goa trip", "Review details", "Cancel"],
            "expected_answer_type": "option",
        },
    )

    assert generation.created_trip_id is None
    assert generation.model == "saayro-review-details"
    state = generation.reply.planning_state
    assert state["mode"] == "pending_confirmation"
    assert "Create Goa trip" in generation.reply.options
    assert "Edit details" in generation.reply.options
    assert "Cancel" in generation.reply.options


@pytest.mark.asyncio
async def test_edit_details_returns_field_menu(monkeypatch: pytest.MonkeyPatch) -> None:
    orch = BuddyOrchestrator(_settings())
    monkeypatch.setattr(orch, "_provider_order", lambda: [_ShouldNotCall()])

    start, end = _future_iso_range(30, 4)

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id=None,
        message="Edit details",
        planning_state={
            "mode": "pending_confirmation",
            "destination_city": "Goa",
            "start_date": start,
            "end_date": end,
            "party": "family",
            "overview": "Relaxed beach week",
            "expected_answer_type": "option",
        },
        active_turn_context={
            "mode": "pending_confirmation",
            "options": ["Create Goa trip", "Edit details", "Cancel"],
        },
    )

    assert generation.model == "saayro-edit-details"
    state = generation.reply.planning_state
    assert state["mode"] == "editing_details"
    for label in ("Edit destination", "Edit dates", "Edit party", "Edit overview", "Back to confirm"):
        assert label in generation.reply.options


@pytest.mark.asyncio
async def test_edit_dates_clears_dates_and_re_asks(monkeypatch: pytest.MonkeyPatch) -> None:
    orch = BuddyOrchestrator(_settings())
    monkeypatch.setattr(orch, "_provider_order", lambda: [_ShouldNotCall()])

    start, end = _future_iso_range(30, 4)

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id=None,
        message="Edit dates",
        planning_state={
            "mode": "editing_details",
            "destination_city": "Goa",
            "start_date": start,
            "end_date": end,
            "party": "family",
            "overview": "Relaxed week",
            "requested_days": 4,
            "expected_answer_type": "option",
        },
        active_turn_context={
            "mode": "editing_details",
            "options": ["Edit destination", "Edit dates", "Edit party", "Edit overview", "Back to confirm"],
        },
    )

    assert generation.model == "saayro-edit-dates"
    state = generation.reply.planning_state
    assert state["mode"] == "awaiting_dates"
    assert state["expected_answer_type"] == "dates"
    assert "start_date" not in state or state.get("start_date") in (None, "")
    assert generation.reply.options  # has future date suggestions


@pytest.mark.asyncio
async def test_create_trip_after_pending_creates_once(monkeypatch: pytest.MonkeyPatch) -> None:
    orch = BuddyOrchestrator(_settings())
    monkeypatch.setattr(orch, "_provider_order", lambda: [_ShouldNotCall()])

    async def fake_build_context(*args: Any, **kwargs: Any) -> SaayroBuddyContext:
        return SaayroBuddyContext(
            user=BuddyUserContext(user_id="user-1", full_name="T", email="t@x.com")
        )

    monkeypatch.setattr("saayro_api.ai.orchestrator.build_buddy_context", fake_build_context)

    async def empty_trips(db: Any, user_id: str) -> list[Any]:
        return []

    monkeypatch.setattr("saayro_api.ai.orchestrator.list_trips", empty_trips)

    created_ids: list[str] = []

    async def fake_create_trip(db: Any, user_id: str, payload: Any) -> _FakeTrip:
        created_ids.append("trip-new-1")
        trip = _FakeTrip()
        trip.id = "trip-new-1"
        return trip

    monkeypatch.setattr("saayro_api.ai.orchestrator.create_trip", fake_create_trip)

    start, end = _future_iso_range(30, 4)

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id=None,
        message="Create Goa trip",
        planning_state={
            "mode": "pending_confirmation",
            "destination_city": "Goa",
            "destination_region": "Goa",
            "start_date": start,
            "end_date": end,
            "party": "family",
            "overview": "Relaxed beach week",
            "expected_answer_type": "option",
        },
        active_turn_context={
            "mode": "pending_confirmation",
            "options": ["Create Goa trip", "Review details", "Cancel"],
        },
    )

    assert created_ids == ["trip-new-1"]
    assert generation.created_trip_id == "trip-new-1"
    state = generation.reply.planning_state
    assert state["mode"] == "trip_bound"
    assert state["created_trip_id"] == "trip-new-1"


@pytest.mark.asyncio
async def test_create_trip_again_with_existing_created_trip_id_does_not_duplicate(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    orch = BuddyOrchestrator(_settings())
    monkeypatch.setattr(orch, "_provider_order", lambda: [_ShouldNotCall()])

    async def fake_build_context(*args: Any, **kwargs: Any) -> SaayroBuddyContext:
        return SaayroBuddyContext(
            user=BuddyUserContext(user_id="user-1", full_name="T", email="t@x.com")
        )

    monkeypatch.setattr("saayro_api.ai.orchestrator.build_buddy_context", fake_build_context)

    create_calls: list[str] = []

    async def should_not_create(db: Any, user_id: str, payload: Any) -> _FakeTrip:
        create_calls.append("called")
        raise AssertionError("create_trip must not be called when created_trip_id is set")

    monkeypatch.setattr("saayro_api.ai.orchestrator.create_trip", should_not_create)

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id=None,
        message="Create Goa trip",
        planning_state={
            "mode": "pending_confirmation",
            "destination_city": "Goa",
            "created_trip_id": "trip-existing",
            "expected_answer_type": "option",
        },
        active_turn_context={
            "mode": "pending_confirmation",
            "options": ["Create Goa trip", "Review details", "Cancel"],
        },
    )

    assert create_calls == []
    assert generation.created_trip_id is None
    assert generation.model == "saayro-already-created"
    action_types = {a.type for a in generation.reply.actions}
    assert "plan_itinerary" in action_types
    assert "open_trip_hub" in action_types


@pytest.mark.asyncio
async def test_post_create_state_does_not_trigger_draft_recovery(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """After scrub, mode becomes trip_bound; restart-style messages skip draft recovery."""
    orch = BuddyOrchestrator(_settings())

    reply = BuddyStructuredReply(
        summary="Refining the trip.",
        guidance="Day 1: arrive. Day 2: explore. Day 3: depart.",
        confidence_label="medium",
        scope_class="in_scope_travel",
        actions=[],
        follow_up_question=None,
        tool_hints=[],
        options=["Refine pacing"],
        planning_state={},
        trip_draft=None,
    )
    fake = _FakeProvider(reply)
    monkeypatch.setattr(orch, "_provider_order", lambda: [fake])

    async def fake_build_context(*args: Any, **kwargs: Any) -> SaayroBuddyContext:
        return SaayroBuddyContext(
            user=BuddyUserContext(user_id="user-1", full_name="T", email="t@x.com")
        )

    monkeypatch.setattr("saayro_api.ai.orchestrator.build_buddy_context", fake_build_context)

    async def fake_get_trip(db: Any, user_id: str, trip_id: str) -> _FakeTrip:
        return _FakeTrip()

    monkeypatch.setattr("saayro_api.ai.orchestrator.get_trip_model_or_404", fake_get_trip)

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id="trip-1",
        message="continue",
        planning_state={
            "mode": "trip_bound",
            "source_trip_id": "trip-1",
            "created_trip_id": "trip-1",
            "destination_city": "Delhi",
        },
        active_turn_context={
            "mode": "trip_bound",
            "options": ["Refine pacing"],
        },
    )

    # Should not return the draft-recovery deterministic reply
    assert generation.model != "saayro-draft-recovery"


def test_scrub_pretrip_state_for_trip_rewrites_lifecycle_modes() -> None:
    state = {
        "mode": "awaiting_overview",
        "destination_city": "Delhi",
        "expected_answer_type": "overview",
        "next_missing_field": "overview",
        "current_question": "Pick a vibe.",
    }
    scrubbed = _scrub_pretrip_state_for_trip(state, trip_id="trip-1")
    assert scrubbed["mode"] == "trip_bound"
    assert "expected_answer_type" not in scrubbed
    assert "next_missing_field" not in scrubbed
    assert "current_question" not in scrubbed
    assert scrubbed["source_trip_id"] == "trip-1"


@pytest.mark.asyncio
async def test_cancel_trip_creation_sets_mode_cancelled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    orch = BuddyOrchestrator(_settings())
    monkeypatch.setattr(orch, "_provider_order", lambda: [_ShouldNotCall()])

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id=None,
        message="Cancel",
        planning_state={
            "mode": "pending_confirmation",
            "destination_city": "Goa",
            "expected_answer_type": "option",
        },
        active_turn_context={
            "mode": "pending_confirmation",
            "options": ["Create Goa trip", "Review details", "Cancel"],
        },
    )

    assert generation.model == "saayro-cancelled"
    state = generation.reply.planning_state
    assert state["mode"] == "cancelled"


@pytest.mark.asyncio
async def test_stale_create_after_cancel_returns_reaffirmed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    orch = BuddyOrchestrator(_settings())
    monkeypatch.setattr(orch, "_provider_order", lambda: [_ShouldNotCall()])

    async def should_not_create(db: Any, user_id: str, payload: Any) -> _FakeTrip:
        raise AssertionError("must not create after cancel")

    monkeypatch.setattr("saayro_api.ai.orchestrator.create_trip", should_not_create)

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id=None,
        message="Create Goa trip",
        planning_state={
            "mode": "cancelled",
            "cancelled_scope": "trip_creation",
            "destination_city": "Goa",
        },
        active_turn_context={
            "mode": "cancelled",
            "options": ["Start new trip", "Open Trip Hub"],
        },
    )

    assert generation.model == "saayro-cancellation-reaffirmed"
    assert generation.created_trip_id is None
    state = generation.reply.planning_state
    assert state["mode"] == "cancelled"


@pytest.mark.asyncio
async def test_stale_create_refreshed_after_cancel_returns_reaffirmed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    orch = BuddyOrchestrator(_settings())
    monkeypatch.setattr(orch, "_provider_order", lambda: [_ShouldNotCall()])

    async def fake_build_context(*args: Any, **kwargs: Any) -> SaayroBuddyContext:
        return _build_past_trip_context(trip_id="trip-old")

    monkeypatch.setattr("saayro_api.ai.orchestrator.build_buddy_context", fake_build_context)

    async def fake_get_trip(db: Any, user_id: str, trip_id: str) -> _FakeTrip:
        return _FakeTrip()

    monkeypatch.setattr("saayro_api.ai.orchestrator.get_trip_model_or_404", fake_get_trip)

    async def should_not_create(db: Any, user_id: str, payload: Any) -> _FakeTrip:
        raise AssertionError("must not create after refresh cancel")

    monkeypatch.setattr("saayro_api.ai.orchestrator.create_trip", should_not_create)

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id="trip-old",
        message="Create refreshed Goa trip",
        planning_state={
            "mode": "cancelled",
            "cancelled_scope": "refresh",
            "destination_city": "Goa",
        },
        active_turn_context={
            "mode": "cancelled",
            "options": ["Refresh with future dates", "Review old trip", "Open Trip Hub"],
        },
    )

    assert generation.model == "saayro-cancellation-reaffirmed"
    assert generation.created_trip_id is None
    # past-trip guard must NOT fire either
    assert generation.model != "saayro-past-trip"


@pytest.mark.asyncio
async def test_reuse_highlights_enters_past_trip_refresh(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    orch = BuddyOrchestrator(_settings())
    monkeypatch.setattr(orch, "_provider_order", lambda: [_ShouldNotCall()])

    async def fake_build_context(*args: Any, **kwargs: Any) -> SaayroBuddyContext:
        return _build_past_trip_context(trip_id="trip-old")

    monkeypatch.setattr("saayro_api.ai.orchestrator.build_buddy_context", fake_build_context)

    async def fake_get_trip(db: Any, user_id: str, trip_id: str) -> _FakeTrip:
        return _FakeTrip()

    monkeypatch.setattr("saayro_api.ai.orchestrator.get_trip_model_or_404", fake_get_trip)

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id="trip-old",
        message="Reuse highlights for a future trip",
        planning_state={
            "mode": "past_trip_review",
            "source_trip_id": "trip-old",
            "destination_city": "Goa",
        },
        active_turn_context={
            "mode": "past_trip_review",
            "options": ["Reuse highlights for a future trip", "Open Trip Hub"],
        },
    )

    assert generation.model == "saayro-past-trip-refresh"
    state = generation.reply.planning_state
    assert state["mode"] == "past_trip_refresh"
    assert state["expected_answer_type"] == "dates"


@pytest.mark.asyncio
async def test_past_trip_review_filters_export_saved_map_actions(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    orch = BuddyOrchestrator(_settings())

    reply = BuddyStructuredReply(
        summary="Reviewing the trip.",
        guidance="That was a memorable trip.",
        confidence_label="medium",
        scope_class="in_scope_travel",
        actions=[
            BuddyAction(id="exp", type="share_export_pack", label="Share export pack"),
            BuddyAction(id="sav", type="review_saved_places", label="Review saved places"),
            BuddyAction(id="map", type="open_in_maps", label="Open in maps"),
            BuddyAction(id="hub", type="open_trip_hub", label="Open Trip Hub"),
        ],
        follow_up_question=None,
        tool_hints=[],
        options=[],
        planning_state={"mode": "past_trip_review"},
        trip_draft=None,
    )
    fake = _FakeProvider(reply)
    monkeypatch.setattr(orch, "_provider_order", lambda: [fake])

    async def fake_build_context(*args: Any, **kwargs: Any) -> SaayroBuddyContext:
        return _build_past_trip_context(trip_id="trip-old")

    monkeypatch.setattr("saayro_api.ai.orchestrator.build_buddy_context", fake_build_context)

    async def fake_get_trip(db: Any, user_id: str, trip_id: str) -> _FakeTrip:
        return _FakeTrip()

    monkeypatch.setattr("saayro_api.ai.orchestrator.get_trip_model_or_404", fake_get_trip)

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id="trip-old",
        message="What was memorable?",
        planning_state={"mode": "past_trip_review", "source_trip_id": "trip-old"},
        active_turn_context={"mode": "past_trip_review"},
    )

    types_present = {a.type for a in generation.reply.actions}
    assert "share_export_pack" not in types_present
    assert "review_saved_places" not in types_present
    assert "open_in_maps" not in types_present
    assert "open_trip_hub" in types_present


@pytest.mark.asyncio
async def test_done_in_trip_bound_returns_finalize_reply(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    orch = BuddyOrchestrator(_settings())
    monkeypatch.setattr(orch, "_provider_order", lambda: [_ShouldNotCall()])

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id="trip-1",
        message="done",
        planning_state={"mode": "trip_bound", "source_trip_id": "trip-1"},
        active_turn_context={"mode": "trip_bound"},
    )

    assert generation.model == "saayro-finalized"
    assert "not saved into Trip Hub itinerary cards yet" in generation.reply.summary
    state = generation.reply.planning_state
    assert state["mode"] == "finalized"
    action_types = {a.type for a in generation.reply.actions}
    assert "open_trip_hub" in action_types
    assert "itinerary_refine" in action_types


@pytest.mark.asyncio
async def test_perfect_and_finalize_in_trip_bound_take_finalize_path(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    orch = BuddyOrchestrator(_settings())
    monkeypatch.setattr(orch, "_provider_order", lambda: [_ShouldNotCall()])

    for phrase in ("perfect", "looks good", "go ahead and finalize"):
        generation = await orch.generate(
            db=None,  # type: ignore[arg-type]
            actor=_FakeActor(),  # type: ignore[arg-type]
            trip_id="trip-1",
            message=phrase,
            planning_state={"mode": "trip_bound", "source_trip_id": "trip-1"},
            active_turn_context={"mode": "trip_bound"},
        )
        assert generation.model == "saayro-finalized", phrase


@pytest.mark.asyncio
async def test_refine_with_prior_itinerary_carries_to_provider_and_captures_back(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    orch = BuddyOrchestrator(_settings())

    captured_planning_state: dict[str, Any] = {}

    class _CaptureProvider:
        provider_name = "Capture"
        model_name = "capture-model"

        async def generate(self, request: Any) -> BuddyProviderResponse:
            captured_planning_state.update(request.planning_state)
            new_reply = BuddyStructuredReply(
                summary="Updated itinerary.",
                guidance=(
                    "Added Lotus Temple to Day 2; kept the rest.\n"
                    "Day 1: Arrive in Delhi; explore Connaught Place.\n"
                    "Day 2: Lotus Temple, Humayun's Tomb.\n"
                    "Day 3: Old Delhi food walk."
                ),
                confidence_label="high",
                scope_class="in_scope_travel",
                actions=[],
                follow_up_question=None,
                tool_hints=[],
                options=[],
                planning_state={},
                trip_draft=None,
            )
            return BuddyProviderResponse(
                reply=new_reply, provider="Capture", model="capture-model"
            )

    monkeypatch.setattr(orch, "_provider_order", lambda: [_CaptureProvider()])

    async def fake_build_context(*args: Any, **kwargs: Any) -> SaayroBuddyContext:
        return SaayroBuddyContext(
            user=BuddyUserContext(user_id="user-1", full_name="T", email="t@x.com")
        )

    monkeypatch.setattr("saayro_api.ai.orchestrator.build_buddy_context", fake_build_context)

    async def fake_get_trip(db: Any, user_id: str, trip_id: str) -> _FakeTrip:
        return _FakeTrip()

    monkeypatch.setattr("saayro_api.ai.orchestrator.get_trip_model_or_404", fake_get_trip)

    prior_itinerary = (
        "Day 1: Arrive in Delhi; explore Connaught Place.\n"
        "Day 2: Humayun's Tomb.\n"
        "Day 3: Old Delhi food walk."
    )

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id="trip-1",
        message="Add Lotus Temple to Day 2",
        planning_state={
            "mode": "trip_bound",
            "source_trip_id": "trip-1",
            "last_itinerary_text": prior_itinerary,
            "last_itinerary_summary": "Delhi 3-day plan.",
            "itinerary_revision_count": 1,
        },
        active_turn_context={"mode": "trip_bound"},
    )

    # Provider received prior itinerary and refine flag
    assert captured_planning_state.get("last_itinerary_text") == prior_itinerary
    assert captured_planning_state.get("refine_intent") is True
    assert "Add Lotus Temple to Day 2" in (captured_planning_state.get("requested_changes") or [])[-1]

    # New itinerary text captured back into state
    state = generation.reply.planning_state
    assert "Lotus Temple" in str(state.get("last_itinerary_text") or "")
    assert state.get("itinerary_revision_count") == 2


@pytest.mark.asyncio
async def test_refine_without_prior_itinerary_returns_no_prior_reply(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    orch = BuddyOrchestrator(_settings())
    monkeypatch.setattr(orch, "_provider_order", lambda: [_ShouldNotCall()])

    generation = await orch.generate(
        db=None,  # type: ignore[arg-type]
        actor=_FakeActor(),  # type: ignore[arg-type]
        trip_id="trip-1",
        message="Add Lotus Temple",
        planning_state={"mode": "trip_bound", "source_trip_id": "trip-1"},
        active_turn_context={"mode": "trip_bound"},
    )

    assert generation.model == "saayro-no-prior-itinerary"
    assert "Draft an itinerary" in generation.reply.options
    assert "Cancel" in generation.reply.options
