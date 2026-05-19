from __future__ import annotations

from datetime import date, timedelta

from saayro_api.ai.orchestrator import (
    _future_date_options,
    _is_itinerary_intent,
    validate_future_draft_dates,
)
from saayro_api.ai.prompts import build_system_prompt
from saayro_api.ai.types import BuddyTripDraft


def test_validate_future_draft_dates_rejects_past_start() -> None:
    draft = BuddyTripDraft(
        destination_city="Goa",
        start_date="2024-09-22",
        end_date="2024-09-25",
        ready=True,
    )
    assert validate_future_draft_dates(draft) is False


def test_validate_future_draft_dates_rejects_end_before_start() -> None:
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    yesterday_ish = date.today().isoformat()
    draft = BuddyTripDraft(
        destination_city="Goa",
        start_date=tomorrow,
        end_date=yesterday_ish,
        ready=True,
    )
    assert validate_future_draft_dates(draft) is False


def test_validate_future_draft_dates_rejects_missing_or_invalid() -> None:
    draft_missing = BuddyTripDraft(destination_city="Goa", ready=True)
    assert validate_future_draft_dates(draft_missing) is False

    draft_garbage = BuddyTripDraft(
        destination_city="Goa",
        start_date="not-a-date",
        end_date="nope",
        ready=True,
    )
    assert validate_future_draft_dates(draft_garbage) is False


def test_validate_future_draft_dates_accepts_today_and_future() -> None:
    today = date.today()
    draft = BuddyTripDraft(
        destination_city="Goa",
        start_date=today.isoformat(),
        end_date=(today + timedelta(days=3)).isoformat(),
        ready=True,
    )
    assert validate_future_draft_dates(draft) is True


def test_future_date_options_are_future_and_respect_user_days() -> None:
    today = date(2026, 4, 19)
    options = _future_date_options(today, user_days=4)

    assert len(options) == 3
    for option in options:
        start_s, _, end_s = option.partition(" to ")
        start = date.fromisoformat(start_s)
        end = date.fromisoformat(end_s)
        assert start > today
        assert (end - start).days == 3


def test_is_itinerary_intent_matches_expected_phrases() -> None:
    assert _is_itinerary_intent("plan the itinerary for the trip") is True
    assert _is_itinerary_intent("make an itinerary") is True
    assert _is_itinerary_intent("plan the trip") is True
    assert _is_itinerary_intent("outline the trip") is True
    assert _is_itinerary_intent("give me a day by day itinerary") is True
    assert _is_itinerary_intent("day-wise schedule please") is True


def test_is_itinerary_intent_rejects_unrelated() -> None:
    assert _is_itinerary_intent("relaxed") is False
    assert _is_itinerary_intent("what's the weather like") is False
    assert _is_itinerary_intent("tell me a joke") is False


def test_is_itinerary_intent_tolerates_common_typos() -> None:
    assert _is_itinerary_intent("Plan the iteinary for this munnar trip") is True
    assert _is_itinerary_intent("give me a detailed itenary") is True
    assert _is_itinerary_intent("make an iteinary please") is True


def test_system_prompt_includes_today_iso() -> None:
    prompt = build_system_prompt(today_iso="2099-01-02")
    assert "2099-01-02" in prompt
    assert "TRIP-BOUND ITINERARY REQUEST RULES" in prompt
    assert "Never emit a date in the past" in prompt


def test_system_prompt_defaults_to_real_today() -> None:
    prompt = build_system_prompt()
    assert date.today().isoformat() in prompt
