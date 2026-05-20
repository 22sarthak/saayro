from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Union

KNOWN_INDIA_CITIES: set[str] = {
    "goa",
    "jaipur",
    "delhi",
    "udaipur",
    "mumbai",
    "coorg",
    "bengaluru",
    "bangalore",
    "kolkata",
    "chennai",
    "hyderabad",
    "pune",
    "rishikesh",
    "manali",
    "shimla",
    "agra",
    "varanasi",
    "amritsar",
    "darjeeling",
    "leh",
    "ooty",
    "munnar",
    "kochi",
    "pondicherry",
    "ahmedabad",
    "ranchi",
    "lucknow",
    "indore",
    "bhubaneswar",
}

OPTION_ALIASES: dict[str, str] = {
    "relaxed": "relaxed",
    "calm": "relaxed",
    "slow": "relaxed",
    "balanced": "balanced",
    "moderate": "balanced",
    "fast": "fast-paced",
    "packed": "fast-paced",
    "fast-paced": "fast-paced",
    "fast paced": "fast-paced",
    "focus": "focus",
    "themes": "focus",
    "interests": "focus",
    "activities": "activities",
    "add activities": "activities",
    "remove activities": "activities",
    "timings": "timings",
    "schedule": "timings",
    "adjust time": "timings",
    "separate": "separate",
    "new trip": "separate",
    "new plan": "separate",
    "another trip": "separate",
    "same trip": "add ideas to current",
    "add here": "add ideas to current",
    "open existing": "open existing",
    "existing trip": "open existing",
    "refine existing": "refine existing",
    "create another": "create another",
    "cancel": "cancel",
    "stop": "cancel",
}


def _normalize(text: str) -> str:
    return text.strip().casefold()


CONTINUATION_TOKENS: set[str] = {
    "what next",
    "whats next",
    "what's next",
    "next",
    "continue",
    "go ahead",
    "proceed",
    "keep going",
    "suggest next steps",
    "what should i do now",
    "what should i do next",
    "okay what now",
    "ok what now",
    "what now",
}


def is_continuation_message(message: str) -> bool:
    normalized = _normalize(message)
    if not normalized:
        return False
    if normalized in CONTINUATION_TOKENS:
        return True
    for token in CONTINUATION_TOKENS:
        if normalized.startswith(f"{token} ") or normalized.endswith(f" {token}"):
            return True
        if normalized.startswith(f"{token},") or normalized.startswith(f"{token}?"):
            return True
    return False


def matches_active_option(message: str, active_options: list[str]) -> str | None:
    if not active_options:
        return None
    normalized = _normalize(message)
    if not normalized:
        return None
    for option in active_options:
        if _normalize(option) == normalized:
            return option
    for option in active_options:
        option_norm = _normalize(option)
        if option_norm and option_norm in normalized:
            return option
    for alias, fragment in OPTION_ALIASES.items():
        if alias in normalized:
            for option in active_options:
                if fragment in _normalize(option):
                    return option
    return None


_DESTINATION_PATTERN = re.compile(
    r"(?:plan|trip|travel|visit|go|going|tour).*?\b(?:to|for|in)\s+([A-Za-z][A-Za-z\s\-]{1,30})",
    re.IGNORECASE,
)


def extract_requested_destination(message: str) -> str | None:
    lowered = message.casefold()
    tokens = re.findall(r"[a-zA-Z\-]+", lowered)
    token_set = set(tokens)
    for city in KNOWN_INDIA_CITIES:
        if city in token_set:
            return city.title()
    match = _DESTINATION_PATTERN.search(message)
    if match:
        candidate = match.group(1).strip()
        first_word = candidate.split()[0].strip("-.,") if candidate else ""
        if first_word and first_word.casefold() in KNOWN_INDIA_CITIES:
            return first_word.title()
    return None


@dataclass(frozen=True)
class ParsedDateRange:
    start: date
    end: date


@dataclass(frozen=True)
class AmbiguousDateRange:
    candidates: tuple[tuple[date, date], ...]
    question: str
    reason: str


@dataclass(frozen=True)
class InvalidDateRange:
    reason: str


@dataclass(frozen=True)
class UnsupportedDateRange:
    reason: str


DateParseResult = Union[
    ParsedDateRange, AmbiguousDateRange, InvalidDateRange, UnsupportedDateRange, None
]


_MONTH_INDEX: dict[str, int] = {
    "jan": 1, "january": 1,
    "feb": 2, "february": 2,
    "mar": 3, "march": 3,
    "apr": 4, "april": 4,
    "may": 5,
    "jun": 6, "june": 6,
    "jul": 7, "july": 7,
    "aug": 8, "august": 8,
    "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "dec": 12, "december": 12,
}

_MONTH_NAMES_FOR_DISPLAY: dict[int, str] = {
    1: "January", 2: "February", 3: "March", 4: "April", 5: "May", 6: "June",
    7: "July", 8: "August", 9: "September", 10: "October", 11: "November", 12: "December",
}


_ISO_DATE_RANGE_PATTERN = re.compile(
    r"(\d{4}-\d{2}-\d{2})\s*(?:to|until|-|\u2013|\u2014|,)\s*(\d{4}-\d{2}-\d{2})",
    re.IGNORECASE,
)

_DOT_DATE_RANGE_PATTERN = re.compile(
    r"(\d{4})\.(\d{1,2})\.(\d{1,2})\s*(?:to|until|-|\u2013|\u2014|,)\s*"
    r"(\d{4})\.(\d{1,2})\.(\d{1,2})",
    re.IGNORECASE,
)

_MONTH_NAME_TOKEN = (
    r"jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|"
    r"jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?"
)

# Day-first month-name: "24 May 2026", "24th of May 2026", optional year.
_MONTH_NAME_RANGE_DM = re.compile(
    rf"\b(?P<d1>\d{{1,2}})(?:st|nd|rd|th)?(?:\s+of)?\s+(?P<m1>{_MONTH_NAME_TOKEN})"
    rf"(?:\s*,?\s*(?P<y1>\d{{4}}))?\s*"
    rf"(?:to|until|-|\u2013|\u2014|,)\s*"
    rf"(?P<d2>\d{{1,2}})(?:st|nd|rd|th)?(?:\s+of)?\s+(?P<m2>{_MONTH_NAME_TOKEN})"
    rf"(?:\s*,?\s*(?P<y2>\d{{4}}))?",
    re.IGNORECASE,
)

# Month-first month-name: "May 24 2026", "May 24th, 2026".
_MONTH_NAME_RANGE_MD = re.compile(
    rf"\b(?P<m1>{_MONTH_NAME_TOKEN})\s+(?P<d1>\d{{1,2}})(?:st|nd|rd|th)?"
    rf"(?:\s*,?\s*(?P<y1>\d{{4}}))?\s*"
    rf"(?:to|until|-|\u2013|\u2014|,)\s*"
    rf"(?P<m2>{_MONTH_NAME_TOKEN})\s+(?P<d2>\d{{1,2}})(?:st|nd|rd|th)?"
    rf"(?:\s*,?\s*(?P<y2>\d{{4}}))?",
    re.IGNORECASE,
)

_SLASH_DATE_RANGE_PATTERN = re.compile(
    r"(?<![\d/])(\d{1,2})/(\d{1,2})/(\d{4})\s*(?:to|until|-|\u2013|\u2014|,)\s*"
    r"(\d{1,2})/(\d{1,2})/(\d{4})(?![\d/])",
)

_SLASH_SINGLE_DATE_PATTERN = re.compile(
    r"(?<![\d/])(\d{1,2})/(\d{1,2})/(\d{4})(?![\d/])"
)

# Duration: "from <date-phrase> for <N> days", "starting <date-phrase> for <N> days",
# "<N> days from <date-phrase>", "<N>-day trip from <date-phrase>".
_DURATION_FROM_FOR = re.compile(
    rf"\b(?:from|starting)\s+(?P<phrase>.+?)\s+for\s+(?P<n>\d{{1,2}})\s*(?:day|night)s?\b",
    re.IGNORECASE,
)
_DURATION_NDAYS_FROM = re.compile(
    rf"\b(?P<n>\d{{1,2}})\s*(?:day|night)s?\s*(?:trip\s+)?(?:from|starting)\s+(?P<phrase>.+)$",
    re.IGNORECASE,
)
_DURATION_NDAY_TRIP_FROM = re.compile(
    rf"\b(?P<n>\d{{1,2}})[-\s]+day\s+trip\s+(?:from|starting)\s+(?P<phrase>.+)$",
    re.IGNORECASE,
)


# Single-date helpers used by duration form.
_SINGLE_ISO = re.compile(r"\b(\d{4})-(\d{1,2})-(\d{1,2})\b")
_SINGLE_DOT = re.compile(r"\b(\d{4})\.(\d{1,2})\.(\d{1,2})\b")
_SINGLE_MONTH_NAME_DM = re.compile(
    rf"\b(?P<d>\d{{1,2}})(?:st|nd|rd|th)?(?:\s+of)?\s+(?P<m>{_MONTH_NAME_TOKEN})"
    rf"(?:\s*,?\s*(?P<y>\d{{4}}))?",
    re.IGNORECASE,
)
_SINGLE_MONTH_NAME_MD = re.compile(
    rf"\b(?P<m>{_MONTH_NAME_TOKEN})\s+(?P<d>\d{{1,2}})(?:st|nd|rd|th)?"
    rf"(?:\s*,?\s*(?P<y>\d{{4}}))?",
    re.IGNORECASE,
)


_AMBIGUOUS_DATE_HINTS = (
    r"\d{1,2}/\d{1,2}/\d{2,4}",
    r"\d{4}[./]\d{1,2}[./]\d{1,2}",
    r"\bnext\s+(weekend|week|month|friday|saturday|sunday)\b",
    r"\bthis\s+(weekend|week|month)\b",
    r"\b(in|after)\s+(one|two|three|four|five|\d+)\s+(week|weeks|month|months|day|days)\b",
    r"\bsame\s+duration\b",
    r"\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b",
    r"\b\d{1,2}(?:st|nd|rd|th)\s+(of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)\b",
)
_AMBIGUOUS_DATE_RE = re.compile("|".join(_AMBIGUOUS_DATE_HINTS), re.IGNORECASE)


_RANGE_LENGTH_CAP_DAYS = 30


def _format_human_date(d: date) -> str:
    return f"{d.day} {_MONTH_NAMES_FOR_DISPLAY[d.month]} {d.year}"


def _validate_range(start: date, end: date, today: date) -> DateParseResult:
    if start < today:
        return InvalidDateRange("past")
    if end < start:
        return InvalidDateRange("end_before_start")
    if (end - start).days > _RANGE_LENGTH_CAP_DAYS:
        return UnsupportedDateRange("range_too_long")
    return ParsedDateRange(start=start, end=end)


def _safe_date(year: int, month: int, day: int) -> date | None:
    try:
        return date(year, month, day)
    except ValueError:
        return None


def _infer_year(today: date, month: int, day: int, *, explicit_year: int | None = None) -> int | None:
    if explicit_year is not None:
        return explicit_year
    candidate = _safe_date(today.year, month, day)
    if candidate is not None and candidate >= today:
        return today.year
    return today.year + 1


def _parse_month_name(token: str) -> int | None:
    return _MONTH_INDEX.get(token.casefold())


def _try_parse_iso_range(message: str, today: date) -> DateParseResult:
    match = _ISO_DATE_RANGE_PATTERN.search(message)
    if not match:
        return None
    start = _safe_date(*(int(x) for x in match.group(1).split("-")))
    end = _safe_date(*(int(x) for x in match.group(2).split("-")))
    if start is None or end is None:
        return InvalidDateRange("garbled")
    return _validate_range(start, end, today)


def _try_parse_dot_range(message: str, today: date) -> DateParseResult:
    match = _DOT_DATE_RANGE_PATTERN.search(message)
    if not match:
        return None
    start = _safe_date(int(match.group(1)), int(match.group(2)), int(match.group(3)))
    end = _safe_date(int(match.group(4)), int(match.group(5)), int(match.group(6)))
    if start is None or end is None:
        return InvalidDateRange("garbled")
    return _validate_range(start, end, today)


def _build_month_name_range(
    d1: int, m1: int, y1: int | None,
    d2: int, m2: int, y2: int | None,
    today: date,
) -> DateParseResult:
    # If y2 explicit and y1 missing, propagate.
    if y1 is None and y2 is not None:
        y1 = y2
    # If both missing, infer based on the start.
    if y1 is None:
        inferred_y1 = _infer_year(today, m1, d1)
        if inferred_y1 is None:
            return UnsupportedDateRange("year_inference_unsafe")
        y1 = inferred_y1
        # If y2 missing, copy from y1 then bump if end < start.
        if y2 is None:
            y2 = y1
    elif y2 is None:
        y2 = y1
    start = _safe_date(y1, m1, d1)
    end = _safe_date(y2, m2, d2)
    if start is None or end is None:
        return InvalidDateRange("garbled")
    # Bump end year if end < start and y2 was inferred (caller didn't write y2 explicitly).
    if end < start:
        bumped = _safe_date(y2 + 1, m2, d2)
        if bumped is not None and bumped > start:
            end = bumped
    return _validate_range(start, end, today)


def _try_parse_month_name_range(message: str, today: date) -> DateParseResult:
    for pattern in (_MONTH_NAME_RANGE_DM, _MONTH_NAME_RANGE_MD):
        match = pattern.search(message)
        if match is None:
            continue
        d1 = int(match.group("d1"))
        d2 = int(match.group("d2"))
        m1 = _parse_month_name(match.group("m1"))
        m2 = _parse_month_name(match.group("m2"))
        y1 = int(match.group("y1")) if match.group("y1") else None
        y2 = int(match.group("y2")) if match.group("y2") else None
        if m1 is None or m2 is None:
            continue
        return _build_month_name_range(d1, m1, y1, d2, m2, y2, today)
    return None


def _slash_interpretations(d_a: int, d_b: int, year: int) -> list[date]:
    """Return all valid (date) interpretations of d_a/d_b/year as (DMY, MDY)."""
    results: list[date] = []
    # DMY: d_a=day, d_b=month
    candidate_dmy = _safe_date(year, d_b, d_a)
    if candidate_dmy is not None:
        results.append(candidate_dmy)
    # MDY: d_a=month, d_b=day
    candidate_mdy = _safe_date(year, d_a, d_b)
    if candidate_mdy is not None and candidate_mdy != candidate_dmy:
        results.append(candidate_mdy)
    return results


def _try_parse_slash_range(message: str, today: date) -> DateParseResult:
    match = _SLASH_DATE_RANGE_PATTERN.search(message)
    if match is None:
        # Single-date slash form.
        single = _SLASH_SINGLE_DATE_PATTERN.search(message)
        if single is None:
            return None
        a, b, year = int(single.group(1)), int(single.group(2)), int(single.group(3))
        candidates = _slash_interpretations(a, b, year)
        future_candidates = [c for c in candidates if c >= today]
        if not future_candidates:
            return InvalidDateRange("past")
        if len(future_candidates) == 1:
            return UnsupportedDateRange("single_date_without_end")
        # Both future and distinct \u2192 ambiguous; user gave only one date though.
        return AmbiguousDateRange(
            candidates=tuple((c, c) for c in future_candidates),
            question=f"Did you mean {_format_human_date(future_candidates[0])} or {_format_human_date(future_candidates[1])}?",
            reason="slash_dmy_vs_mdy_single",
        )

    a1, b1, y1, a2, b2, y2 = (int(match.group(i)) for i in range(1, 7))
    starts = _slash_interpretations(a1, b1, y1)
    ends = _slash_interpretations(a2, b2, y2)
    if not starts or not ends:
        return InvalidDateRange("garbled")

    # Build all (start, end) pairs where the same convention is used on both sides.
    # DMY-DMY pair:
    dmy_start = _safe_date(y1, b1, a1)
    dmy_end = _safe_date(y2, b2, a2)
    mdy_start = _safe_date(y1, a1, b1)
    mdy_end = _safe_date(y2, a2, b2)

    pair_dmy: tuple[date, date] | None = (
        (dmy_start, dmy_end) if dmy_start is not None and dmy_end is not None else None
    )
    pair_mdy: tuple[date, date] | None = (
        (mdy_start, mdy_end) if mdy_start is not None and mdy_end is not None else None
    )

    # Collapse pairs that are identical (e.g. 10/10/2026) so the user isn't asked.
    if pair_dmy is not None and pair_mdy is not None and pair_dmy == pair_mdy:
        pair_mdy = None

    candidate_pairs = [p for p in (pair_dmy, pair_mdy) if p is not None]
    if not candidate_pairs:
        return InvalidDateRange("garbled")

    if len(candidate_pairs) == 1:
        start, end = candidate_pairs[0]
        return _validate_range(start, end, today)

    # Two distinct interpretations. Filter out past pairs.
    future_pairs = [(s, e) for (s, e) in candidate_pairs if s >= today]
    if not future_pairs:
        return InvalidDateRange("past")
    if len(future_pairs) == 1:
        start, end = future_pairs[0]
        return _validate_range(start, end, today)
    # Both future and ambiguous: ask clarification with both human-formatted ranges.
    dmy_pair, mdy_pair = pair_dmy, pair_mdy
    assert dmy_pair is not None and mdy_pair is not None
    question = (
        f"Did you mean {_format_human_date(dmy_pair[0])} to {_format_human_date(dmy_pair[1])} "
        f"or {_format_human_date(mdy_pair[0])} to {_format_human_date(mdy_pair[1])}?"
    )
    return AmbiguousDateRange(
        candidates=(dmy_pair, mdy_pair),
        question=question,
        reason="slash_dmy_vs_mdy",
    )


def _parse_single_date_phrase(phrase: str, today: date) -> date | None:
    phrase = phrase.strip().strip(".,;:")
    if not phrase:
        return None
    iso = _SINGLE_ISO.search(phrase)
    if iso:
        return _safe_date(int(iso.group(1)), int(iso.group(2)), int(iso.group(3)))
    dot = _SINGLE_DOT.search(phrase)
    if dot:
        return _safe_date(int(dot.group(1)), int(dot.group(2)), int(dot.group(3)))
    for pattern in (_SINGLE_MONTH_NAME_DM, _SINGLE_MONTH_NAME_MD):
        match = pattern.search(phrase)
        if match is None:
            continue
        day = int(match.group("d"))
        month = _parse_month_name(match.group("m"))
        year_raw = match.group("y")
        if month is None:
            continue
        year = int(year_raw) if year_raw else _infer_year(today, month, day)
        if year is None:
            continue
        return _safe_date(year, month, day)
    return None


def _try_parse_duration_form(message: str, today: date) -> DateParseResult:
    for pattern in (_DURATION_FROM_FOR, _DURATION_NDAY_TRIP_FROM, _DURATION_NDAYS_FROM):
        match = pattern.search(message)
        if match is None:
            continue
        try:
            n_days = int(match.group("n"))
        except (ValueError, IndexError):
            continue
        if not (1 <= n_days <= _RANGE_LENGTH_CAP_DAYS):
            return UnsupportedDateRange("range_too_long")
        phrase = match.group("phrase")
        start = _parse_single_date_phrase(phrase, today)
        if start is None:
            continue
        end = start + timedelta(days=n_days - 1)
        return _validate_range(start, end, today)
    return None


_NUMBER_WORDS: dict[str, int] = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7,
}


def _word_to_int(token: str) -> int | None:
    token = token.casefold().strip()
    if token.isdigit():
        try:
            return int(token)
        except ValueError:
            return None
    return _NUMBER_WORDS.get(token)


def _next_friday(today: date, *, skip_if_today_on_weekend: bool) -> date:
    weekday = today.weekday()  # Mon=0, Fri=4, Sat=5, Sun=6
    if skip_if_today_on_weekend and weekday in (4, 5, 6):
        days_ahead = (4 - weekday) % 7
        if days_ahead == 0:
            days_ahead = 7
        return today + timedelta(days=days_ahead + 7)
    if weekday == 4:
        return today
    days_ahead = (4 - weekday) % 7
    return today + timedelta(days=days_ahead)


def _add_calendar_month(d: date, months: int = 1) -> date:
    new_month = d.month + months
    new_year = d.year + (new_month - 1) // 12
    new_month = ((new_month - 1) % 12) + 1
    # Clamp to last valid day of target month.
    for try_day in (d.day, 28, 29, 30, 31):
        result = _safe_date(new_year, new_month, try_day)
        if result is not None:
            return result
    return d  # unreachable


def _try_relative_phrase(
    message: str,
    *,
    today: date,
    requested_days: int | None,
    prior_start: date | None,
    prior_end: date | None,
) -> DateParseResult:
    low = message.casefold()

    # "same duration next month"
    if re.search(r"\bsame\s+duration\s+next\s+month\b", low):
        if prior_start is not None and prior_end is not None:
            start = _add_calendar_month(prior_start, 1)
            duration = (prior_end - prior_start).days
            end = start + timedelta(days=duration)
            return _validate_range(start, end, today)
        if requested_days is not None:
            anchor = _add_calendar_month(today, 1)
            end = anchor + timedelta(days=requested_days - 1)
            return _validate_range(anchor, end, today)
        return UnsupportedDateRange("same_duration_needs_prior_dates")

    # "next weekend" / "this weekend"
    if re.search(r"\bnext\s+weekend\b", low):
        fri = _next_friday(today, skip_if_today_on_weekend=True)
        return _validate_range(fri, fri + timedelta(days=2), today)
    if re.search(r"\bthis\s+weekend\b", low):
        weekday = today.weekday()
        if weekday in (4, 5):  # Fri or Sat -> today through Sun
            sun = today + timedelta(days=6 - weekday)
            return _validate_range(today, sun, today)
        if weekday == 6:
            return UnsupportedDateRange("weekend_already_partly_past")
        fri = _next_friday(today, skip_if_today_on_weekend=False)
        return _validate_range(fri, fri + timedelta(days=2), today)

    # "in N week(s)" / "after N week(s)" / "in N days"
    weeks_match = re.search(
        r"\b(?:in|after)\s+(?P<n>one|two|three|four|five|six|seven|\d{1,2})\s+(?P<unit>week|weeks|day|days)\b",
        low,
    )
    if weeks_match:
        n = _word_to_int(weeks_match.group("n"))
        if n is None:
            return UnsupportedDateRange("number_word_unknown")
        unit = weeks_match.group("unit")
        delta_days = n * 7 if unit.startswith("week") else n
        start = today + timedelta(days=delta_days)
        if requested_days is None:
            return UnsupportedDateRange("relative_needs_duration")
        end = start + timedelta(days=requested_days - 1)
        return _validate_range(start, end, today)

    # "next month"
    if re.search(r"\bnext\s+month\b", low):
        start = _add_calendar_month(today, 1)
        if requested_days is None:
            return UnsupportedDateRange("relative_needs_duration")
        end = start + timedelta(days=requested_days - 1)
        return _validate_range(start, end, today)

    return None


def extract_date_range(
    message: str,
    *,
    today: date | None = None,
    requested_days: int | None = None,
    prior_start: date | None = None,
    prior_end: date | None = None,
) -> DateParseResult:
    """Parse a date range from the user's message.

    Tries (in order): ISO range, dot-format range, month-name range,
    slash-format range, duration form, relative phrases. Returns a
    ``ParsedDateRange`` on success, ``InvalidDateRange`` for past/garbled
    input, ``AmbiguousDateRange`` for inputs with multiple plausible
    interpretations, ``UnsupportedDateRange`` for date-ish input that this
    pass cannot resolve, or ``None`` when no date-like content exists.
    """
    if not message:
        return None
    today = today or date.today()

    for parser in (
        _try_parse_iso_range,
        _try_parse_dot_range,
        _try_parse_month_name_range,
        _try_parse_slash_range,
        _try_parse_duration_form,
    ):
        result = parser(message, today)
        if result is not None:
            return result

    relative = _try_relative_phrase(
        message,
        today=today,
        requested_days=requested_days,
        prior_start=prior_start,
        prior_end=prior_end,
    )
    if relative is not None:
        return relative

    if _AMBIGUOUS_DATE_RE.search(message):
        return UnsupportedDateRange("date_ish_but_not_parsed")
    return None


_PARTY_ALIASES: tuple[tuple[str, str], ...] = (
    ("with my family", "family"),
    ("my family", "family"),
    ("family trip", "family"),
    ("family", "family"),
    ("kids", "family"),
    ("with kids", "family"),
    ("me and my partner", "couple"),
    ("my partner", "couple"),
    ("with my partner", "couple"),
    ("girlfriend", "couple"),
    ("boyfriend", "couple"),
    ("wife", "couple"),
    ("husband", "couple"),
    ("honeymoon", "couple"),
    ("couple", "couple"),
    ("with friends", "friends"),
    ("friends", "friends"),
    ("group of friends", "friends"),
    ("by myself", "solo"),
    ("all alone", "solo"),
    ("alone", "solo"),
    ("just me", "solo"),
    ("solo", "solo"),
    ("business trip", "business"),
    ("for work", "business"),
    ("work trip", "business"),
    ("business", "business"),
)


def extract_party(message: str) -> str | None:
    if not message:
        return None
    lowered = message.casefold()
    for phrase, canonical in _PARTY_ALIASES:
        if phrase in lowered:
            return canonical
    return None


_RESTART_CONTINUE_PATTERN = re.compile(
    r"^(?:bro\s+|hey\s+|ok\s+|okay\s+)?"
    r"(?:plan|start|resume|continue)\s+(?:my\s+|the\s+)?trip\b"
    r"|\bcontinue\b"
    r"|\bstart\s+planning\b"
    r"|\bare\s+you\s+stuck\b"
    r"|\bwhat\s+happened\b"
    r"|\bgo\s+ahead\b"
    r"|\bresume\b"
    r"|\bsame\s+as\s+before\b"
    r"|\buse\s+(?:the\s+)?same\s+dates\b"
    r"|\buse\s+those\s+dates\b"
    r"|\bsame\s+duration\b(?!\s+next\s+month)",
    re.IGNORECASE,
)


def is_restart_or_continue_message(message: str) -> bool:
    return bool(_RESTART_CONTINUE_PATTERN.search(message or ""))


_UNAMBIGUOUS_RESUME_TOKENS = {
    "continue",
    "go ahead",
    "are you stuck",
    "bro are you stuck",
    "what happened",
    "bro what happened",
    "resume",
    "keep going",
    "same as before",
    "use those dates",
    "use the same dates",
    "same duration",
}


def is_unambiguous_resume_message(message: str) -> bool:
    normalized = _normalize(message)
    if not normalized:
        return False
    if normalized in _UNAMBIGUOUS_RESUME_TOKENS:
        return True
    for token in _UNAMBIGUOUS_RESUME_TOKENS:
        if normalized.startswith(f"{token} ") or normalized.startswith(f"{token}?"):
            return True
    return False


_FINALIZE_TOKENS: set[str] = {
    "done",
    "done with trip planning",
    "done with the trip",
    "done planning",
    "perfect",
    "looks good",
    "all good",
    "finalize",
    "finalize this",
    "finalize this trip",
    "finalize the trip",
    "finalize planning",
    "go ahead and finalize",
    "go ahead and finalize this trip",
    "we are done",
    "we're done",
}


def is_finalize_message(message: str) -> bool:
    normalized = _normalize(message)
    if not normalized:
        return False
    stripped = normalized.rstrip(".!?")
    if stripped in _FINALIZE_TOKENS:
        return True
    for token in _FINALIZE_TOKENS:
        if stripped.startswith(f"{token} ") or stripped.endswith(f" {token}"):
            return True
    return False


_REFINE_PATTERNS: tuple[str, ...] = (
    "add ",
    "include ",
    "remove ",
    "drop ",
    "swap ",
    "replace ",
    "make it ",
    "make this ",
    "more relaxed",
    "more family",
    "less ",
    "extend day",
    "shorten day",
)


def is_refine_itinerary_message(message: str) -> bool:
    normalized = _normalize(message)
    if not normalized:
        return False
    return any(pattern in normalized for pattern in _REFINE_PATTERNS)
