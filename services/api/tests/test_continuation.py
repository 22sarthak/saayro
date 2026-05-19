from __future__ import annotations

from saayro_api.ai.classification import classify_buddy_scope
from saayro_api.ai.continuation import (
    extract_requested_destination,
    is_continuation_message,
    matches_active_option,
)


def test_exact_case_insensitive_match() -> None:
    assert matches_active_option("balanced", ["Relaxed", "Balanced", "Fast-paced"]) == "Balanced"
    assert matches_active_option("BALANCED", ["Relaxed", "Balanced", "Fast-paced"]) == "Balanced"


def test_alias_match_routes_to_canonical_option() -> None:
    assert matches_active_option("relaxed", ["Relaxed", "Balanced", "Fast-paced"]) == "Relaxed"
    assert (
        matches_active_option("please go ahead with balanced pace", ["Relaxed", "Balanced", "Fast-paced"])
        == "Balanced"
    )
    assert matches_active_option("I want it as a new separate plan", ["Start a separate Goa trip", "Add ideas to current Udaipur", "Cancel"]) == "Start a separate Goa trip"


def test_no_match_returns_none() -> None:
    assert matches_active_option("tell me a joke", ["Relaxed", "Balanced"]) is None


def test_empty_active_options_returns_none() -> None:
    assert matches_active_option("balanced", []) is None


def test_extract_destination_from_plan_phrase() -> None:
    assert extract_requested_destination("Plan a 4 day trip to Goa") == "Goa"
    assert extract_requested_destination("plan a trip for udaipur") == "Udaipur"


def test_extract_destination_single_token() -> None:
    assert extract_requested_destination("goa") == "Goa"


def test_extract_destination_unknown_returns_none() -> None:
    assert extract_requested_destination("tell me about space travel") is None


def test_extract_destination_ignores_case() -> None:
    assert extract_requested_destination("PLAN A TRIP TO COORG") == "Coorg"


def test_is_continuation_message_matches_expected() -> None:
    assert is_continuation_message("what next") is True
    assert is_continuation_message("What's next?") is True
    assert is_continuation_message("ok what now") is True
    assert is_continuation_message("continue") is True
    assert is_continuation_message("go ahead") is True
    assert is_continuation_message("suggest next steps") is True
    assert is_continuation_message("what should I do now") is True


def test_is_continuation_message_rejects_unrelated() -> None:
    assert is_continuation_message("tell me a joke") is False
    assert is_continuation_message("plan the itinerary") is False
    assert is_continuation_message("") is False


def test_classifier_still_guardrails_what_next_without_context() -> None:
    # Pre-existing classifier behaviour stays intact; orchestrator decides context.
    assert classify_buddy_scope("what next").scope_class == "out_of_scope"
