from __future__ import annotations

import re

_FallbackOutline = dict[str, list[str]]

OUTLINES: dict[str, _FallbackOutline] = {
    "goa": {
        "short": [
            "Day 1: arrive, settle in, sunset at a North Goa beach.",
            "Day 2: cafés, beach hop, and a quiet dinner near the shack strip.",
        ],
        "standard": [
            "Day 1: arrive, settle in, beach sunset (Baga or Ashwem).",
            "Day 2: North Goa — Fort Aguada, Chapora, café stop, beach time.",
            "Day 3: South Goa or Old Goa depending on pace — Palolem/Colva or Basilica + Se Cathedral.",
            "Day 4: slow checkout, local shopping (Saturday Night Market if timed right), return buffer.",
        ],
        "extended": [
            "Day 1: arrive, settle in, sunset at a North Goa beach.",
            "Day 2: North Goa beaches — Baga, Anjuna, Vagator, Chapora fort at sunset.",
            "Day 3: Old Goa heritage — Basilica of Bom Jesus, Se Cathedral, Fontainhas walk.",
            "Day 4: South Goa — Palolem or Colva; quieter beach day.",
            "Day 5: day cruise on the Mandovi or a spice plantation visit.",
            "Day 6: market day — Saturday Night Market or Anjuna Flea Market.",
            "Day 7: slow checkout, local shopping, return buffer.",
        ],
    },
    "manali": {
        "short": [
            "Day 1: arrive, Mall Road walk, rest for altitude.",
            "Day 2: Hadimba Temple and Old Manali cafés.",
        ],
        "standard": [
            "Day 1: arrive, Mall Road, rest for altitude.",
            "Day 2: Solang Valley or Atal Tunnel depending on season.",
            "Day 3: Old Manali, Hadimba Temple, Manu Temple, cafés.",
            "Day 4: checkout buffer, local shopping on Mall Road.",
        ],
        "extended": [
            "Day 1: arrive, Mall Road, rest for altitude.",
            "Day 2: Solang Valley — adventure sports, viewpoint time.",
            "Day 3: Atal Tunnel + Sissu (weather and road dependent).",
            "Day 4: Old Manali cafés, Manu Temple, riverside walk.",
            "Day 5: Naggar Castle and Roerich Art Gallery day trip.",
            "Day 6: Hadimba Temple, local crafts, hot springs at Vashisht.",
            "Day 7: slow checkout, return buffer with buffer for road conditions.",
        ],
    },
    "udaipur": {
        "short": [
            "Day 1: lakefront arrival, old city walk by Lake Pichola.",
            "Day 2: City Palace and Jagdish Temple, sunset at Ambrai ghat.",
        ],
        "standard": [
            "Day 1: lakefront arrival, old city walk around Lake Pichola.",
            "Day 2: City Palace, Jagdish Temple, evening lake cruise.",
            "Day 3: Sajjangarh Monsoon Palace viewpoint, local food, shopping at Hathi Pol.",
            "Day 4: slow checkout; optional Eklingji or Nagda temple visit nearby.",
        ],
        "extended": [
            "Day 1: lakefront arrival, old city walk.",
            "Day 2: City Palace complex and Jagdish Temple.",
            "Day 3: Sajjangarh Monsoon Palace and Fateh Sagar Lake.",
            "Day 4: Kumbhalgarh fort day trip.",
            "Day 5: Ranakpur Jain Temple day trip.",
            "Day 6: local food trail and shopping at Hathi Pol / Bada Bazaar.",
            "Day 7: slow checkout; optional Chittorgarh side trip on the way out.",
        ],
    },
    "jaipur": {
        "short": [
            "Day 1: arrive, walk the old pink city bazaars.",
            "Day 2: Amber Fort morning, City Palace afternoon.",
        ],
        "standard": [
            "Day 1: arrive, Hawa Mahal photo stop, walk the pink city bazaars.",
            "Day 2: Amber Fort morning, Jaigarh viewpoint, Nahargarh sunset.",
            "Day 3: City Palace, Jantar Mantar, Albert Hall area.",
            "Day 4: slow checkout with a bazaar round (Johari, Bapu, Tripolia).",
        ],
        "extended": [
            "Day 1: arrive, Hawa Mahal, bazaar walk.",
            "Day 2: Amber Fort, Jaigarh, Nahargarh sunset.",
            "Day 3: City Palace, Jantar Mantar, Albert Hall.",
            "Day 4: Chokhi Dhani or local food trail.",
            "Day 5: day trip to Abhaneri stepwell or Ranthambore edge.",
            "Day 6: shopping and block-print workshop.",
            "Day 7: slow checkout with buffer.",
        ],
    },
    "coorg": {
        "short": [
            "Day 1: arrive at the plantations, quiet evening.",
            "Day 2: Abbey Falls, Raja's Seat sunset.",
        ],
        "standard": [
            "Day 1: arrive at the plantations, quiet evening with filter coffee.",
            "Day 2: Abbey Falls, Raja's Seat sunset, Madikeri Fort.",
            "Day 3: Dubare elephant camp or Nisargadhama; plantation walk.",
            "Day 4: slow checkout with a stop at a coffee estate store.",
        ],
        "extended": [
            "Day 1: arrive, settle in at a plantation stay.",
            "Day 2: Abbey Falls, Raja's Seat, Madikeri Fort.",
            "Day 3: Dubare elephant camp and river walk.",
            "Day 4: Nisargadhama island, Golden Temple (Namdroling).",
            "Day 5: Tadiandamol trek (moderate) or a quiet plantation day.",
            "Day 6: local food trail — pandi curry, kadambuttu, filter coffee.",
            "Day 7: slow checkout with a plantation store stop.",
        ],
    },
    "rishikesh": {
        "short": [
            "Day 1: arrive, Ganga Aarti at Triveni Ghat.",
            "Day 2: Ram Jhula and Lakshman Jhula walk, riverside café.",
        ],
        "standard": [
            "Day 1: arrive, Ganga Aarti at Triveni Ghat.",
            "Day 2: Ram Jhula and Lakshman Jhula walk, riverside café, Beatles Ashram visit.",
            "Day 3: yoga or rafting morning, temple stops, quiet evening.",
            "Day 4: slow checkout; optional Neelkanth Mahadev temple drive.",
        ],
        "extended": [
            "Day 1: arrive, Ganga Aarti at Triveni Ghat.",
            "Day 2: Ram Jhula, Lakshman Jhula, Beatles Ashram.",
            "Day 3: rafting or yoga morning; temple evening.",
            "Day 4: Neelkanth Mahadev temple drive.",
            "Day 5: Kunjapuri sunrise viewpoint.",
            "Day 6: quiet riverside day, local café trail.",
            "Day 7: slow checkout.",
        ],
    },
}

_DURATION_PATTERN = re.compile(r"(\d+)\s*(?:day|night|nite|d)s?", re.IGNORECASE)
_WEEKEND_PATTERN = re.compile(r"\bweekend\b", re.IGNORECASE)


def extract_trip_length_days(message: str) -> int | None:
    match = _DURATION_PATTERN.search(message)
    if match:
        try:
            days = int(match.group(1))
        except ValueError:
            return None
        if 1 <= days <= 30:
            return days
        return None
    if _WEEKEND_PATTERN.search(message):
        return 2
    return None


def _pick_bucket(days: int | None) -> str:
    if days is None:
        return "standard"
    if days <= 2:
        return "short"
    if days >= 6:
        return "extended"
    return "standard"


def get_outline(destination: str, days: int | None) -> list[str] | None:
    key = destination.strip().casefold()
    outline = OUTLINES.get(key)
    if outline is None:
        return None
    bucket = _pick_bucket(days)
    lines = outline.get(bucket) or outline.get("standard")
    if not lines:
        return None
    if days is None or bucket == "extended":
        return list(lines)
    return list(lines[:days]) if len(lines) > days else list(lines)


def has_outline(destination: str) -> bool:
    return destination.strip().casefold() in OUTLINES
