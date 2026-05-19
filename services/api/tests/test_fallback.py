from __future__ import annotations

from typing import Any

import pytest

from saayro_api.ai.fallback_outlines import extract_trip_length_days, get_outline
from saayro_api.ai.orchestrator import BuddyOrchestrator
from saayro_api.core.config import Settings


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


def _orchestrator() -> BuddyOrchestrator:
    return BuddyOrchestrator(_settings())


def test_extract_trip_length_days_parses_numeric_days() -> None:
    assert extract_trip_length_days("Plan a 3 day trip to Goa") == 3
    assert extract_trip_length_days("I want 7 nights in Manali") == 7


def test_extract_trip_length_days_handles_weekend() -> None:
    assert extract_trip_length_days("Weekend trip to Goa") == 2


def test_extract_trip_length_days_returns_none_when_absent() -> None:
    assert extract_trip_length_days("Plan something nice") is None


def test_get_outline_returns_short_bucket_for_two_days() -> None:
    outline = get_outline("goa", 2)
    assert outline is not None
    assert len(outline) == 2
    assert "Day 1" in outline[0]


def test_get_outline_returns_extended_bucket_for_seven_days() -> None:
    outline = get_outline("goa", 7)
    assert outline is not None
    assert len(outline) >= 5


def test_get_outline_unknown_destination_returns_none() -> None:
    assert get_outline("atlantis", 3) is None


def test_fallback_outline_reply_for_goa() -> None:
    reply = _orchestrator()._build_fallback_reply(
        reason="providers down",
        message="Plan a 3 day trip to Goa.",
        prior_planning_state={},
        active_turn_context={},
    )

    assert reply.summary.lower().startswith("saayro fallback")
    assert "Day 1" in reply.guidance
    assert reply.trip_draft is None
    assert not any(action.type == "open_trip_hub" for action in reply.actions)
    assert reply.planning_state.get("mode") == "fallback_outline"
    assert reply.planning_state.get("requested_destination") == "Goa"
    assert "Refine pace" in reply.options


def test_fallback_outline_reply_for_manali_weekend() -> None:
    reply = _orchestrator()._build_fallback_reply(
        reason="providers down",
        message="Weekend trip to Manali please.",
        prior_planning_state={},
        active_turn_context={},
    )

    assert "Day 1" in reply.guidance
    assert reply.planning_state.get("requested_destination") == "Manali"


def test_fallback_outline_reply_for_udaipur() -> None:
    reply = _orchestrator()._build_fallback_reply(
        reason="providers down",
        message="Plan a 4 day trip to Udaipur.",
        prior_planning_state={},
        active_turn_context={},
    )

    assert "Udaipur" == reply.planning_state.get("requested_destination")
    assert "Day 1" in reply.guidance
    assert "trip created" not in reply.guidance.lower()
    assert "trip created" not in reply.summary.lower()


def test_fallback_continuation_preserves_planning_state_and_options() -> None:
    prior_state: dict[str, Any] = {
        "mode": "new_trip_planning",
        "requested_destination": "Goa",
        "highlights": ["sunset walk"],
    }
    active = {
        "options": ["Relaxed", "Balanced", "Fast-paced"],
        "current_question": "What pacing feels right?",
        "mode": "new_trip_planning",
        "requested_destination": "Goa",
    }
    reply = _orchestrator()._build_fallback_reply(
        reason="providers down",
        message="Balanced",
        prior_planning_state=prior_state,
        active_turn_context=active,
    )

    assert reply.options == ["Relaxed", "Balanced", "Fast-paced"]
    assert reply.follow_up_question == "What pacing feels right?"
    assert reply.planning_state["mode"] == "new_trip_planning"
    assert reply.planning_state["requested_destination"] == "Goa"
    assert reply.planning_state["highlights"] == ["sunset walk"]
    assert reply.planning_state["options"] == ["Relaxed", "Balanced", "Fast-paced"]


def test_fallback_generic_reply_when_no_destination_and_no_options() -> None:
    reply = _orchestrator()._build_fallback_reply(
        reason="providers down",
        message="Hey, help me plan something.",
        prior_planning_state={},
        active_turn_context={},
    )

    assert reply.planning_state.get("mode") == "fallback_generic"
    assert "Goa" in reply.options
    assert "Manali" in reply.options
    assert reply.trip_draft is None
