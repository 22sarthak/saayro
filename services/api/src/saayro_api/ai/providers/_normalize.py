from __future__ import annotations

import json
from typing import Any

_KNOWN_ACTION_DEFAULTS: dict[str, dict[str, Any]] = {
    "open_trip_hub": {
        "id": "open-trip-hub",
        "type": "open_trip_hub",
        "label": "Open Trip Hub",
        "payload": {},
    },
    "itinerary_refine": {
        "id": "itinerary-refine",
        "type": "itinerary_refine",
        "label": "Refine itinerary",
        "payload": {},
    },
    "optimize-day": {
        "id": "optimize-day",
        "type": "optimize-day",
        "label": "Optimize day",
        "payload": {},
    },
    "share_export_pack": {
        "id": "share-export-pack",
        "type": "share_export_pack",
        "label": "Share Export Pack",
        "payload": {},
    },
    "open-map": {
        "id": "open-map",
        "type": "open-map",
        "label": "Open map",
        "payload": {},
    },
    "open_in_maps": {
        "id": "open-in-maps",
        "type": "open_in_maps",
        "label": "Open in maps",
        "payload": {},
    },
    "review_saved_places": {
        "id": "review-saved-places",
        "type": "review_saved_places",
        "label": "Review saved places",
        "payload": {},
    },
}


def _strip_json_fences(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[: -3]
        cleaned = cleaned.strip()
        if cleaned.startswith("json"):
            cleaned = cleaned[4:].strip()
    return cleaned


def _normalize_actions(raw: Any) -> list[dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    normalized: list[dict[str, Any]] = []
    for item in raw:
        if isinstance(item, dict):
            normalized.append(item)
            continue
        if isinstance(item, str) and item in _KNOWN_ACTION_DEFAULTS:
            normalized.append(dict(_KNOWN_ACTION_DEFAULTS[item]))
    return normalized


def parse_structured_reply(text: str) -> dict[str, Any]:
    cleaned = _strip_json_fences(text)
    data = json.loads(cleaned)
    if isinstance(data, dict) and "actions" in data:
        data["actions"] = _normalize_actions(data.get("actions"))
    return data
