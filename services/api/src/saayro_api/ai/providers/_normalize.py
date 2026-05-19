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


def _normalize_action_dict(item: dict[str, Any]) -> dict[str, Any] | None:
    raw_type = item.get("type")
    if not isinstance(raw_type, str) or raw_type not in _KNOWN_ACTION_DEFAULTS:
        return None
    default = _KNOWN_ACTION_DEFAULTS[raw_type]
    merged = dict(default)
    raw_id = item.get("id")
    if isinstance(raw_id, str) and raw_id:
        merged["id"] = raw_id
    raw_label = item.get("label")
    if isinstance(raw_label, str) and raw_label:
        merged["label"] = raw_label
    raw_payload = item.get("payload")
    merged["payload"] = raw_payload if isinstance(raw_payload, dict) else {}
    return merged


def _normalize_actions(raw: Any) -> list[dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    normalized: list[dict[str, Any]] = []
    for item in raw:
        if isinstance(item, dict):
            merged = _normalize_action_dict(item)
            if merged is not None:
                normalized.append(merged)
            continue
        if isinstance(item, str) and item in _KNOWN_ACTION_DEFAULTS:
            normalized.append(dict(_KNOWN_ACTION_DEFAULTS[item]))
    return normalized


def _normalize_tool_hints(raw: Any) -> list[dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    return [item for item in raw if isinstance(item, dict)]


def _normalize_options(raw: Any) -> list[str]:
    if not isinstance(raw, list):
        return []
    return [item for item in raw if isinstance(item, str)]


_ALLOWED_CONFIDENCE_LABELS = {"low", "medium", "high"}


def _normalize_confidence_label(raw: Any) -> str:
    if isinstance(raw, str):
        candidate = raw.strip().lower()
        if candidate in _ALLOWED_CONFIDENCE_LABELS:
            return candidate
    return "medium"


def parse_structured_reply(text: str) -> dict[str, Any]:
    cleaned = _strip_json_fences(text)
    data = json.loads(cleaned)
    if isinstance(data, dict):
        if "actions" in data:
            data["actions"] = _normalize_actions(data.get("actions"))
        data["tool_hints"] = _normalize_tool_hints(data.get("tool_hints"))
        if "options" in data:
            data["options"] = _normalize_options(data.get("options"))
        data["confidence_label"] = _normalize_confidence_label(data.get("confidence_label"))
    return data
