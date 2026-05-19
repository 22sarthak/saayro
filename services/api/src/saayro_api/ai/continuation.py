from __future__ import annotations

import re
from datetime import date
from typing import Literal

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


_ISO_DATE_RANGE_PATTERN = re.compile(
    r"(\d{4}-\d{2}-\d{2})\s*(?:to|-|\u2013|\u2014)\s*(\d{4}-\d{2}-\d{2})",
    re.IGNORECASE,
)
_AMBIGUOUS_DATE_HINTS = (
    r"\d{1,2}/\d{1,2}/\d{2,4}",
    r"\d{4}[./]\d{1,2}[./]\d{1,2}",
    r"\bnext\s+(weekend|week|month|friday|saturday|sunday)\b",
    r"\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b",
    r"\b\d{1,2}(?:st|nd|rd|th)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b",
)
_AMBIGUOUS_DATE_RE = re.compile("|".join(_AMBIGUOUS_DATE_HINTS), re.IGNORECASE)


def extract_date_range(
    message: str,
) -> tuple[date, date] | Literal["ambiguous"] | None:
    """Parse a date range from the user's message.

    Returns a `(start, end)` tuple for ISO ranges, `"ambiguous"` when the
    message looks date-ish but uses a format this pass does not support,
    or `None` when there is no date-like content.
    """
    if not message:
        return None
    match = _ISO_DATE_RANGE_PATTERN.search(message)
    if match:
        try:
            start = date.fromisoformat(match.group(1))
            end = date.fromisoformat(match.group(2))
        except ValueError:
            return "ambiguous"
        return start, end
    if _AMBIGUOUS_DATE_RE.search(message):
        return "ambiguous"
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
    r"|\bresume\b",
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
