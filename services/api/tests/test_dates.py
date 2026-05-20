from __future__ import annotations

from datetime import date, timedelta

from saayro_api.ai.continuation import (
    AmbiguousDateRange,
    InvalidDateRange,
    ParsedDateRange,
    UnsupportedDateRange,
    extract_date_range,
)
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


# ---------------------------------------------------------------------------
# Natural date parser tests
# ---------------------------------------------------------------------------


_TODAY = date(2026, 4, 1)  # Wednesday, well before May; usable across cases.


def _parse(message: str, **kwargs: object) -> object:
    return extract_date_range(message, today=kwargs.pop("today", _TODAY), **kwargs)  # type: ignore[arg-type]


def test_parser_iso_range() -> None:
    result = _parse("2026-05-20 to 2026-05-24")
    assert isinstance(result, ParsedDateRange)
    assert result.start == date(2026, 5, 20)
    assert result.end == date(2026, 5, 24)


def test_parser_iso_range_with_em_dash() -> None:
    result = _parse("2026-05-20 – 2026-05-24")
    assert isinstance(result, ParsedDateRange)
    assert result.start == date(2026, 5, 20)
    assert result.end == date(2026, 5, 24)


def test_parser_dot_format() -> None:
    result = _parse("2026.05.20 to 2026.05.24")
    assert isinstance(result, ParsedDateRange)
    assert result.start == date(2026, 5, 20)
    assert result.end == date(2026, 5, 24)


def test_parser_month_name_with_year_both_sides() -> None:
    for message in (
        "24 May 2026 to 30 May 2026",
        "24th May 2026 to 30th May 2026",
        "24th of May 2026 to 30th of May 2026",
        "May 24 2026 to May 30 2026",
    ):
        result = _parse(message)
        assert isinstance(result, ParsedDateRange), message
        assert result.start == date(2026, 5, 24)
        assert result.end == date(2026, 5, 30)


def test_parser_month_name_year_only_on_second() -> None:
    result = _parse("May 24 to May 30 2026")
    assert isinstance(result, ParsedDateRange)
    assert result.start == date(2026, 5, 24)
    assert result.end == date(2026, 5, 30)


def test_parser_month_name_no_year_future_month_infers_current_year() -> None:
    # Today is 2026-04-01. "24 May to 30 May" -> 2026-05-24/30.
    result = _parse("24 May to 30 May")
    assert isinstance(result, ParsedDateRange)
    assert result.start == date(2026, 5, 24)
    assert result.end == date(2026, 5, 30)


def test_parser_month_name_no_year_past_month_infers_next_year() -> None:
    # Today is 2026-04-01. "24 January to 30 January" -> 2027-01-24/30.
    result = _parse("24 January to 30 January")
    assert isinstance(result, ParsedDateRange)
    assert result.start == date(2027, 1, 24)
    assert result.end == date(2027, 1, 30)


def test_parser_slash_unambiguous_dmy() -> None:
    result = _parse("24/05/2026 to 30/05/2026")
    assert isinstance(result, ParsedDateRange)
    assert result.start == date(2026, 5, 24)
    assert result.end == date(2026, 5, 30)


def test_parser_slash_unambiguous_mdy() -> None:
    result = _parse("05/24/2026 to 05/30/2026")
    assert isinstance(result, ParsedDateRange)
    assert result.start == date(2026, 5, 24)
    assert result.end == date(2026, 5, 30)


def test_parser_slash_ambiguous_both_valid_future() -> None:
    # 07/08/2026 to 09/08/2026 — DMY=7 Aug→9 Aug, MDY=8 Jul→8 Sep; both future.
    result = _parse("07/08/2026 to 09/08/2026")
    assert isinstance(result, AmbiguousDateRange)
    assert result.reason == "slash_dmy_vs_mdy"
    assert len(result.candidates) == 2


def test_parser_slash_one_past_one_future_silently_uses_future() -> None:
    # 02/05/2026: DMY=2 May 2026 (future), MDY=5 Feb 2026 (past for today=2026-04-01).
    result = _parse("02/05/2026 to 06/05/2026")
    assert isinstance(result, ParsedDateRange)
    assert result.start == date(2026, 5, 2)
    assert result.end == date(2026, 5, 6)


def test_parser_slash_ambiguous_single_date_future() -> None:
    # 07/08/2026 → DMY=7 Aug 2026, MDY=8 Jul 2026; both future.
    result = _parse("07/08/2026")
    assert isinstance(result, AmbiguousDateRange)
    assert result.reason == "slash_dmy_vs_mdy_single"
    assert len(result.candidates) == 2


def test_parser_slash_past_returns_invalid() -> None:
    # 02/05/2025 — both interpretations are past for _TODAY=2026-04-01.
    result = _parse("02/05/2025 to 06/05/2025")
    assert isinstance(result, InvalidDateRange)
    assert result.reason == "past"


def test_parser_duration_from_for() -> None:
    result = _parse("from 24 May 2026 for 5 days")
    assert isinstance(result, ParsedDateRange)
    assert result.start == date(2026, 5, 24)
    assert result.end == date(2026, 5, 28)


def test_parser_duration_n_days_from() -> None:
    result = _parse("5 days from May 24")  # year inferred = 2026 (future)
    assert isinstance(result, ParsedDateRange)
    assert result.start == date(2026, 5, 24)
    assert result.end == date(2026, 5, 28)


def test_parser_duration_n_day_trip_from() -> None:
    result = _parse("5 day trip from May 24 2026")
    assert isinstance(result, ParsedDateRange)
    assert result.start == date(2026, 5, 24)
    assert result.end == date(2026, 5, 28)


def test_parser_relative_next_weekend() -> None:
    # _TODAY = 2026-04-01 (Wednesday). Next weekend = upcoming Fri 2026-04-03..Sun 2026-04-05.
    result = _parse("next weekend")
    assert isinstance(result, ParsedDateRange)
    assert result.start.weekday() == 4  # Friday
    assert (result.end - result.start).days == 2


def test_parser_relative_in_two_weeks_with_requested_days() -> None:
    result = _parse("in two weeks", requested_days=5)
    assert isinstance(result, ParsedDateRange)
    expected_start = _TODAY + timedelta(days=14)
    assert result.start == expected_start
    assert (result.end - result.start).days == 4


def test_parser_relative_in_two_weeks_without_requested_days() -> None:
    result = _parse("in two weeks")
    assert isinstance(result, UnsupportedDateRange)
    assert result.reason == "relative_needs_duration"


def test_parser_relative_same_duration_next_month() -> None:
    result = _parse(
        "same duration next month",
        prior_start=date(2026, 4, 10),
        prior_end=date(2026, 4, 14),
    )
    assert isinstance(result, ParsedDateRange)
    assert result.start == date(2026, 5, 10)
    assert result.end == date(2026, 5, 14)


def test_parser_past_iso_returns_invalid() -> None:
    result = _parse("2024-09-22 to 2024-09-25")
    assert isinstance(result, InvalidDateRange)
    assert result.reason == "past"


def test_parser_end_before_start_returns_invalid() -> None:
    result = _parse("2026-05-25 to 2026-05-20")
    assert isinstance(result, InvalidDateRange)
    assert result.reason == "end_before_start"


def test_parser_random_text_returns_none() -> None:
    assert _parse("plan the itinerary") is None
    assert _parse("hello there") is None
