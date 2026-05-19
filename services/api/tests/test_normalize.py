from __future__ import annotations

import json

from saayro_api.ai.providers._normalize import parse_structured_reply


def _base(**overrides: object) -> str:
    payload: dict[str, object] = {
        "summary": "ok",
        "guidance": "ok",
        "confidence_label": "medium",
        "scope_class": "in_scope_travel",
        "actions": [],
        "tool_hints": [],
        "options": [],
    }
    payload.update(overrides)
    return json.dumps(payload)


def test_action_as_string_expands_to_known_default() -> None:
    data = parse_structured_reply(_base(actions=["open_trip_hub"]))
    assert data["actions"] == [
        {"id": "open-trip-hub", "type": "open_trip_hub", "label": "Open Trip Hub", "payload": {}}
    ]


def test_partial_action_dict_is_merged_with_default() -> None:
    data = parse_structured_reply(_base(actions=[{"type": "open_trip_hub"}]))
    assert data["actions"] == [
        {"id": "open-trip-hub", "type": "open_trip_hub", "label": "Open Trip Hub", "payload": {}}
    ]


def test_partial_action_dict_preserves_payload() -> None:
    data = parse_structured_reply(
        _base(actions=[{"type": "open_trip_hub", "payload": {"trip_id": "abc"}}])
    )
    assert data["actions"][0]["payload"] == {"trip_id": "abc"}
    assert data["actions"][0]["id"] == "open-trip-hub"
    assert data["actions"][0]["label"] == "Open Trip Hub"


def test_tool_hints_object_becomes_empty_list() -> None:
    data = parse_structured_reply(_base(tool_hints={}))
    assert data["tool_hints"] == []


def test_options_non_list_becomes_empty_list() -> None:
    data = parse_structured_reply(_base(options="not a list"))
    assert data["options"] == []


def test_confidence_label_high_is_lowercased() -> None:
    data = parse_structured_reply(_base(confidence_label="High"))
    assert data["confidence_label"] == "high"


def test_confidence_label_none_defaults_to_medium() -> None:
    data = parse_structured_reply(_base(confidence_label=None))
    assert data["confidence_label"] == "medium"


def test_confidence_label_invalid_defaults_to_medium() -> None:
    data = parse_structured_reply(_base(confidence_label="confident"))
    assert data["confidence_label"] == "medium"


def test_unknown_action_string_is_dropped() -> None:
    data = parse_structured_reply(_base(actions=["totally_made_up"]))
    assert data["actions"] == []


def test_unknown_action_dict_type_is_dropped() -> None:
    data = parse_structured_reply(_base(actions=[{"type": "totally_made_up", "label": "x"}]))
    assert data["actions"] == []
