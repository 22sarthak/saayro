from __future__ import annotations

import logging
import re
from datetime import date, timedelta
from typing import Literal, cast

from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from saayro_api.ai.classification import classify_buddy_scope, make_guardrail_summary
from saayro_api.ai.config import provider_badge_enabled
from saayro_api.ai.context import build_buddy_context
from saayro_api.ai.continuation import (
    extract_date_range,
    extract_party,
    extract_requested_destination,
    is_continuation_message,
    is_finalize_message,
    is_refine_itinerary_message,
    is_restart_or_continue_message,
    is_unambiguous_resume_message,
    matches_active_option,
)
from saayro_api.ai.fallback_outlines import extract_trip_length_days, get_outline
from saayro_api.ai.providers.base import AIProvider
from saayro_api.ai.providers.gemini import GeminiProvider
from saayro_api.ai.providers.groq import GroqProvider
from saayro_api.ai.providers.ollama import OllamaLocalProvider
from saayro_api.ai.providers.ollama_cloud import OllamaCloudProvider
from saayro_api.ai.types import (
    BuddyAction,
    BuddyConversationTurn,
    BuddyDevMetadata,
    BuddyPersistedGeneration,
    BuddyProviderRequest,
    BuddyStructuredReply,
    BuddyTripContext,
    BuddyTripDraft,
    ToolHint,
)
from saayro_api.core.config import Settings
from saayro_api.core.errors import ApiException
from saayro_api.schemas.auth import SessionActor
from saayro_api.schemas.trips import TripCreate, TripListItem, UserPreferencesSchema
from saayro_api.services.trips import create_trip, get_trip_model_or_404, list_trips

logger = logging.getLogger(__name__)

_ITINERARY_INTENT_PATTERN = re.compile(
    r"\b(plan|make|build|outline|draft|generate|give\s+me)\b.*\b(?:itiner|iteinar|itenar)"
    r"|\bfull\s+(?:itinerary|iteinary|itenary)\b"
    r"|\bday\s*(?:-|\s)\s*by\s*(?:-|\s)\s*day\b"
    r"|\bday\s*(?:-|\s)\s*wise\b"
    r"|\bplan\s+the\s+trip\b"
    r"|\boutline\s+the\s+trip\b",
    re.IGNORECASE,
)

_DETAILED_ITINERARY_PATTERN = re.compile(
    r"\b(?:detailed|in\s+detail|more\s+detail|deep\s+dive)\b",
    re.IGNORECASE,
)


def _is_detailed_itinerary_request(message: str) -> bool:
    return bool(_DETAILED_ITINERARY_PATTERN.search(message or ""))


def _normalize_day_lines(guidance: str) -> str:
    if not guidance:
        return guidance
    rewritten = re.sub(r"(?<!\n)\s*(Day\s+\d+\s*:)", r"\n\1", guidance)
    return rewritten.strip()


_TRIP_BOUND_ACTION_TYPES: frozenset[str] = frozenset(
    {
        "itinerary_refine",
        "open_trip_hub",
        "open_in_maps",
        "review_saved_places",
        "share_export_pack",
        "review_connected_travel",
        "plan_itinerary",
    }
)


def _enrich_actions_with_trip_id(
    actions: list[BuddyAction], trip_id: str
) -> list[BuddyAction]:
    enriched: list[BuddyAction] = []
    for action in actions:
        if action.type not in _TRIP_BOUND_ACTION_TYPES:
            enriched.append(action)
            continue
        payload = dict(action.payload or {})
        existing_tid = payload.get("trip_id")
        if not isinstance(existing_tid, str) or not existing_tid or existing_tid != trip_id:
            payload["trip_id"] = trip_id
        enriched.append(action.model_copy(update={"payload": payload}))
    return enriched


_PAST_TRIP_OPTIONS: tuple[str, ...] = (
    "Refresh with future dates",
    "Review this old trip",
    "Open Trip Hub",
)


_UNSUPPORTED_OPTION_PATTERNS: tuple[str, ...] = (
    "export",
    "share export",
    "export pack",
    "saved place",
    "saved",
    "open in map",
    "open in maps",
    "open map",
    "open route",
    "route handoff",
)


def _is_unsupported_option(label: str) -> bool:
    low = label.casefold()
    return any(pattern in low for pattern in _UNSUPPORTED_OPTION_PATTERNS)


def _sanitize_options(options: list[str]) -> list[str]:
    return [option for option in options if not _is_unsupported_option(option)]


_PRETRIP_FIELD_KEYS: tuple[str, ...] = (
    "destination_city",
    "destination_region",
    "requested_days",
    "start_date",
    "end_date",
    "party",
    "overview",
)


def _is_empty(value: object) -> bool:
    if value is None:
        return True
    if isinstance(value, str) and not value.strip():
        return True
    if isinstance(value, list) and not value:
        return True
    return False


def _merge_planning_state(
    server_known: dict[str, object], provider_returned: dict[str, object] | None
) -> dict[str, object]:
    """Merge provider-returned planning_state into server-known state.

    Server-known non-empty values win; the provider may only fill keys the
    server did not already set. This protects destination/dates/party/overview
    and the route trip_id from being silently overwritten.
    """
    merged: dict[str, object] = dict(server_known)
    if not provider_returned:
        return merged
    for key, value in provider_returned.items():
        if _is_empty(value):
            continue
        if key in merged and not _is_empty(merged[key]):
            continue
        merged[key] = value
    return merged


def _capture_fields_from_message(
    message: str, *, expected_answer_type: str | None = None
) -> dict[str, object]:
    """Extract planning fields from a user message."""
    captured: dict[str, object] = {}
    destination = extract_requested_destination(message)
    if destination:
        captured["destination_city"] = destination
    days = extract_trip_length_days(message)
    if days is not None:
        captured["requested_days"] = days
    date_range = extract_date_range(message)
    if isinstance(date_range, tuple):
        start, end = date_range
        if start >= date.today() and end >= start:
            captured["start_date"] = start.isoformat()
            captured["end_date"] = end.isoformat()
    party = extract_party(message)
    if party:
        captured["party"] = party
    if expected_answer_type == "overview":
        stripped = (message or "").strip()
        if len(stripped) >= 10 and not is_continuation_message(stripped):
            captured["overview"] = stripped
    return captured


def _next_missing_field(
    state: dict[str, object],
) -> Literal["destination", "dates", "party", "overview"] | None:
    if _is_empty(state.get("destination_city")):
        return "destination"
    start = state.get("start_date")
    end = state.get("end_date")
    if _is_empty(start) or _is_empty(end):
        return "dates"
    if _is_empty(state.get("party")):
        return "party"
    overview = state.get("overview")
    if _is_empty(overview) or (isinstance(overview, str) and len(overview.strip()) < 10):
        return "overview"
    return None


_FIELD_TO_EXPECTED: dict[str, str] = {
    "destination": "destination",
    "dates": "dates",
    "party": "party",
    "overview": "overview",
}


def _expected_for_field(field: str) -> str:
    return _FIELD_TO_EXPECTED.get(field, "destination")


_CUSTOM_DATES_ALIASES: tuple[str, ...] = (
    "let me pick custom dates",
    "pick custom dates",
    "custom dates",
    "enter my own dates",
    "type my own dates",
)


def _is_custom_dates_choice(message: str) -> bool:
    lowered = message.casefold().strip()
    return any(alias in lowered for alias in _CUSTOM_DATES_ALIASES)


def _is_itinerary_intent(message: str) -> bool:
    return bool(_ITINERARY_INTENT_PATTERN.search(message or ""))


BuddyIntent = Literal[
    "review_details",
    "create_trip",
    "cancel_trip_creation",
    "edit_details",
    "edit_destination",
    "edit_dates",
    "edit_party",
    "edit_overview",
    "back_to_confirm",
    "create_refreshed_trip",
    "cancel_refresh",
    "reuse_highlights_for_future_trip",
    "review_old_trip",
    "refresh_with_future_dates",
    "finalize_planning",
    "refine_itinerary",
    "open_trip_hub",
    "start_new_trip",
    "draft_itinerary",
]


_PRETRIP_LIFECYCLE_MODES: frozenset[str] = frozenset(
    {
        "pretrip_create",
        "awaiting_dates",
        "awaiting_party",
        "awaiting_overview",
        "pending_confirmation",
        "editing_details",
        "draft_recovery",
        "new_trip_planning",
    }
)


_PAST_TRIP_REVIEW_BANNED_ACTION_TYPES: frozenset[str] = frozenset(
    {"share_export_pack", "review_saved_places", "open_in_maps"}
)


def _sanitize_actions_for_past_review(
    actions: list[BuddyAction], *, mode: str | None
) -> list[BuddyAction]:
    if mode != "past_trip_review":
        return actions
    return [a for a in actions if a.type not in _PAST_TRIP_REVIEW_BANNED_ACTION_TYPES]


_BANNED_PAST_REVIEW_TEXT_PATTERNS: tuple[str, ...] = (
    "export",
    "archive",
    "saved place",
    "open in map",
)


def _strip_banned_review_text(text: str) -> str:
    if not text:
        return text
    cleaned = text
    lowered = cleaned.casefold()
    if any(pat in lowered for pat in _BANNED_PAST_REVIEW_TEXT_PATTERNS):
        sentences = re.split(r"(?<=[.!?])\s+", cleaned)
        kept = [
            s
            for s in sentences
            if not any(pat in s.casefold() for pat in _BANNED_PAST_REVIEW_TEXT_PATTERNS)
        ]
        cleaned = " ".join(kept).strip()
    return cleaned


def _resolve_intent(
    *,
    matched_option: str | None,
    message: str,
    prior_mode: str | None,
    has_trip_context: bool,
) -> BuddyIntent | None:
    """Map a clicked option label or typed text to a canonical BuddyIntent.

    Label-based matches always win when matched_option is present. Typed-text
    aliases are limited to safe intents that cannot trigger writes (finalize,
    refine).
    """
    if matched_option is not None:
        low = matched_option.casefold().strip()
        if "review details" in low:
            return "review_details"
        if low.startswith("edit "):
            if "destination" in low:
                return "edit_destination"
            if "date" in low:
                return "edit_dates"
            if "party" in low:
                return "edit_party"
            if "overview" in low:
                return "edit_overview"
            if "details" in low:
                return "edit_details"
        if "back to confirm" in low:
            return "back_to_confirm"
        if "create refreshed" in low:
            return "create_refreshed_trip"
        if low.startswith("create ") and " trip" in low:
            return "create_trip"
        if "reuse highlights" in low:
            return "reuse_highlights_for_future_trip"
        if "review this old trip" in low or "review old trip" in low:
            return "review_old_trip"
        if "refresh with future dates" in low:
            return "refresh_with_future_dates"
        if "open trip hub" in low:
            return "open_trip_hub"
        if "start new trip" in low or "start a new trip" in low:
            return "start_new_trip"
        if "draft an itinerary" in low or "draft itinerary" in low:
            return "draft_itinerary"
        if low.startswith("cancel"):
            if prior_mode == "past_trip_refresh_confirm":
                return "cancel_refresh"
            return "cancel_trip_creation"
        return None
    if has_trip_context and is_finalize_message(message):
        return "finalize_planning"
    if has_trip_context and is_refine_itinerary_message(message):
        return "refine_itinerary"
    # Stale-create detection: typed-text "Create … trip" / "Create refreshed …"
    # only resolves when prior_mode is cancelled, so the handler can return the
    # cancellation-reaffirmed reply without triggering a real create.
    if prior_mode == "cancelled":
        low = message.casefold().strip()
        if low.startswith("create refreshed"):
            return "create_refreshed_trip"
        if low.startswith("create ") and " trip" in low:
            return "create_trip"
    return None


def _future_date_options(today: date, user_days: int | None) -> list[str]:
    span_days = max(user_days or 4, 2) - 1
    windows = [14, 35, 63]
    options: list[str] = []
    for offset in windows:
        start = today + timedelta(days=offset)
        end = start + timedelta(days=span_days)
        options.append(f"{start.isoformat()} to {end.isoformat()}")
    return options


def _parse_iso_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        return None


def validate_future_draft_dates(draft: BuddyTripDraft) -> bool:
    start = _parse_iso_date(draft.start_date)
    end = _parse_iso_date(draft.end_date)
    if start is None or end is None:
        return False
    if start < date.today():
        return False
    if end < start:
        return False
    return True


class BuddyOrchestrator:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def generate(
        self,
        *,
        db: AsyncSession,
        actor: SessionActor,
        trip_id: str | None,
        message: str,
        history: list[BuddyConversationTurn] | None = None,
        planning_state: dict[str, object] | None = None,
        active_turn_context: dict[str, object] | None = None,
    ) -> BuddyPersistedGeneration:
        planning_state = dict(planning_state) if planning_state else {}
        active_turn_context = active_turn_context or {}

        prior_expected_raw = planning_state.get("expected_answer_type")
        prior_expected = prior_expected_raw if isinstance(prior_expected_raw, str) else None
        captured_fields = _capture_fields_from_message(
            message, expected_answer_type=prior_expected
        )
        for key, value in captured_fields.items():
            if _is_empty(planning_state.get(key)):
                planning_state[key] = value

        active_options_raw = active_turn_context.get("options")
        active_options: list[str] = (
            [o for o in active_options_raw if isinstance(o, str)]
            if isinstance(active_options_raw, list)
            else []
        )
        prior_mode_raw = active_turn_context.get("mode")
        prior_mode = prior_mode_raw if isinstance(prior_mode_raw, str) else None
        if prior_mode is None:
            planning_mode_raw = planning_state.get("mode")
            prior_mode = planning_mode_raw if isinstance(planning_mode_raw, str) else None
        matched_option = matches_active_option(message, active_options) if active_options else None

        effective_trip_id = trip_id
        skip_duplicate_check = False

        intent = _resolve_intent(
            matched_option=matched_option,
            message=message,
            prior_mode=prior_mode,
            has_trip_context=effective_trip_id is not None,
        )

        refine_intent = intent == "refine_itinerary" and effective_trip_id is not None

        if intent is not None:
            intent_reply = await self._handle_intent(
                intent=intent,
                db=db,
                actor=actor,
                effective_trip_id=effective_trip_id,
                planning_state=planning_state,
                prior_mode=prior_mode,
                message=message,
            )
            if intent_reply is not None:
                return intent_reply

        if matched_option is not None:
            matched_lower = matched_option.casefold()
            if prior_mode == "disambiguate_existing_trip":
                match_raw = active_turn_context.get("existing_trip_match")
                if isinstance(match_raw, dict):
                    match_id = match_raw.get("id")
                    match_title = match_raw.get("title")
                    match_destination = match_raw.get("destination_city")
                    if (
                        isinstance(match_id, str)
                        and isinstance(match_title, str)
                        and isinstance(match_destination, str)
                    ):
                        if "open existing" in matched_lower or "refine existing" in matched_lower:
                            return self._open_existing_trip_reply(
                                match_id=match_id,
                                match_title=match_title,
                                match_destination=match_destination,
                                refine="refine" in matched_lower,
                            )
                        if "create another" in matched_lower:
                            skip_duplicate_check = True
            elif prior_mode == "disambiguate_trip_context":
                requested_raw = active_turn_context.get("requested_destination")
                requested = requested_raw if isinstance(requested_raw, str) else None
                if "start a separate" in matched_lower and requested:
                    effective_trip_id = None
                    planning_state = {
                        **planning_state,
                        "mode": "new_trip_planning",
                        "requested_destination": requested,
                    }
                    message = f"Plan a trip to {requested}."
                elif "add ideas to current" in matched_lower:
                    planning_state = {**planning_state, "mode": "refine_existing_trip"}
                elif matched_lower.startswith("cancel"):
                    return self._simple_ack_reply(
                        "Got it — cancelled. What would you like to work on next?"
                    )
            elif prior_mode == "draft_recovery":
                recovery_reply = self._handle_draft_recovery_option(
                    matched_lower, planning_state
                )
                if recovery_reply is not None:
                    return recovery_reply
                if "start new trip" in matched_lower:
                    planning_state = {"mode": "pretrip_create"}
                    message = "Plan a new trip."
            elif prior_mode == "past_trip_refresh_confirm":
                confirm_reply = await self._handle_refresh_confirmation(
                    db=db,
                    actor=actor,
                    matched_option=matched_option,
                    planning_state=planning_state,
                )
                if confirm_reply is not None:
                    return confirm_reply

        draft_recovery_reply = self._maybe_handle_draft_recovery(message, planning_state)
        if draft_recovery_reply is not None:
            return draft_recovery_reply

        expected_answer_reply = self._maybe_handle_expected_answer(
            message=message,
            planning_state=planning_state,
            captured_fields=captured_fields,
            matched_option=matched_option,
            prior_mode=prior_mode,
            effective_trip_id=effective_trip_id,
        )
        if expected_answer_reply is not None:
            return expected_answer_reply

        continuation_context = bool(
            effective_trip_id is not None
            or active_options
            or (
                isinstance(prior_mode, str)
                and prior_mode
                in {
                    "refine_existing_trip",
                    "fallback_outline",
                    "awaiting_dates",
                    "awaiting_party",
                    "awaiting_overview",
                    "past_trip_refresh",
                }
            )
        )
        is_continuation = is_continuation_message(message) and continuation_context

        last_guidance_raw = active_turn_context.get("last_guidance")
        last_guidance = last_guidance_raw if isinstance(last_guidance_raw, str) else ""

        if (
            is_continuation
            and effective_trip_id is not None
            and "Day 1:" in last_guidance
        ):
            return self._build_itinerary_continuation_reply(effective_trip_id)

        if matched_option is not None:
            scope_class: Literal["in_scope_travel"] = "in_scope_travel"
        elif is_continuation:
            scope_class = "in_scope_travel"
        elif prior_mode in {
            "past_trip_refresh",
            "past_trip_refresh_confirm",
            "pretrip_create",
            "awaiting_dates",
            "awaiting_party",
            "awaiting_overview",
        } and not _is_empty(planning_state.get("destination_city")):
            scope_class = "in_scope_travel"
        else:
            scope = classify_buddy_scope(message)
            if scope.scope_class != "in_scope_travel":
                return self._guardrail_reply(scope.scope_class)
            scope_class = "in_scope_travel"

        if (
            effective_trip_id is not None
            and prior_mode != "disambiguate_trip_context"
            and matched_option is None
        ):
            requested_dest = extract_requested_destination(message)
            if requested_dest:
                trip = await get_trip_model_or_404(db, actor.user_id, effective_trip_id)
                if trip.destination_city.casefold() != requested_dest.casefold():
                    return self._build_trip_context_disambiguation_reply(
                        current_title=trip.title,
                        current_trip_id=effective_trip_id,
                        requested_destination=requested_dest,
                    )

        if (
            effective_trip_id is None
            and not skip_duplicate_check
            and prior_mode != "disambiguate_existing_trip"
        ):
            requested_dest = extract_requested_destination(message)
            if requested_dest:
                existing = await self._find_existing_trip(db, actor.user_id, requested_dest)
                if existing is not None:
                    return self._build_existing_trip_disambiguation_reply(
                        match_id=existing.id,
                        match_title=existing.title,
                        match_destination=existing.destination_city,
                    )

        context = await build_buddy_context(db, user_id=actor.user_id, trip_id=effective_trip_id)

        state_mode_raw = planning_state.get("mode")
        state_mode = state_mode_raw if isinstance(state_mode_raw, str) else None
        past_trip_guard_bypassed = state_mode in {
            "past_trip_refresh",
            "past_trip_refresh_confirm",
            "past_trip_review",
        }

        past_trip_review = state_mode == "past_trip_review"
        if (
            not past_trip_guard_bypassed
            and effective_trip_id is not None
            and context.trip is not None
            and context.trip.start_date < date.today()
        ):
            chose_review = (
                matched_option is not None and "review this old trip" in matched_option.casefold()
            )
            chose_refresh = (
                matched_option is not None and "refresh with future dates" in matched_option.casefold()
            )
            chose_hub = (
                matched_option is not None and "open trip hub" == matched_option.casefold()
            )
            if chose_hub:
                return self._open_trip_hub_reply(
                    trip_id=effective_trip_id, trip_title=context.trip.title
                )
            if chose_refresh:
                return self._build_past_trip_refresh_reply(
                    trip_id=effective_trip_id, trip=context.trip
                )
            if chose_review:
                seeded_state: dict[str, object] = dict(planning_state)
                seeded_state["destination_city"] = context.trip.destination_city
                return self._build_past_trip_review_entry_reply(
                    trip_id=effective_trip_id,
                    planning_state=seeded_state,
                )
            return self._build_past_trip_reply(
                trip_id=effective_trip_id, trip_title=context.trip.title
            )

        if not self.settings.ai_enabled:
            return self._mock_reply(
                provider="mock",
                model="saayro-mock",
                fallback_used=False,
                reason="AI is disabled in this environment.",
                message=message,
                prior_planning_state=planning_state,
                active_turn_context=active_turn_context,
                trip_id=effective_trip_id,
            )

        request_state: dict[str, object] = dict(planning_state or {})
        itinerary_turn = effective_trip_id is not None and _is_itinerary_intent(message)
        if refine_intent:
            itinerary_turn = True
            request_state["itinerary_intent"] = True
            request_state["refine_intent"] = True
            existing_raw = request_state.get("requested_changes")
            existing_changes: list[str] = (
                [c for c in existing_raw if isinstance(c, str)]
                if isinstance(existing_raw, list)
                else []
            )
            existing_changes.append(message[:200])
            request_state["requested_changes"] = existing_changes[-10:]
        if itinerary_turn:
            request_state["itinerary_intent"] = True
            if _is_detailed_itinerary_request(message):
                request_state["itinerary_detail"] = "detailed"
        if past_trip_review:
            request_state["mode"] = "past_trip_review"

        request = BuddyProviderRequest(
            message=message,
            context=context,
            scope_class=scope_class,
            conversation_history=history or [],
            planning_state=request_state,
        )
        provider_order = self._provider_order()
        last_error: ApiException | None = None
        for index, provider in enumerate(provider_order):
            try:
                result = await provider.generate(request)
                reply = result.reply
                created_trip_id: str | None = None
                if effective_trip_id is not None and reply.trip_draft is not None:
                    reply = reply.model_copy(update={"trip_draft": None})
                if itinerary_turn:
                    reply = self._post_process_itinerary_reply(reply)
                if effective_trip_id is None and reply.trip_draft is not None and reply.trip_draft.ready:
                    if not validate_future_draft_dates(reply.trip_draft):
                        return self._build_date_clarification_reply(
                            draft=reply.trip_draft,
                            user_days=extract_trip_length_days(message),
                        )
                    overview_text = (reply.trip_draft.overview or "").strip()
                    if len(overview_text) < 10:
                        return self._build_trip_overview_clarification_reply(draft=reply.trip_draft)
                    if not skip_duplicate_check:
                        dest = reply.trip_draft.destination_city or ""
                        existing = await self._find_existing_trip(db, actor.user_id, dest) if dest else None
                        if existing is not None:
                            return self._build_existing_trip_disambiguation_reply(
                                match_id=existing.id,
                                match_title=existing.title,
                                match_destination=existing.destination_city,
                            )
                    created_trip_id = await self._try_create_trip_from_draft(
                        db=db,
                        actor=actor,
                        draft=reply.trip_draft,
                    )
                    if created_trip_id is not None:
                        reply = self._mutate_reply_after_trip_created(reply, created_trip_id)
                    else:
                        reply = reply.model_copy(update={"trip_draft": None})

                reply = self._stamp_planning_state(
                    reply=reply,
                    trip_id_for_state=effective_trip_id if created_trip_id is None else created_trip_id,
                    prior_planning_state=planning_state,
                )

                if itinerary_turn and effective_trip_id is not None and reply.guidance and "Day 1:" in reply.guidance:
                    final_state: dict[str, object] = dict(reply.planning_state or {})
                    final_state["last_itinerary_text"] = reply.guidance
                    final_state["last_itinerary_summary"] = reply.summary
                    prior_count_raw = planning_state.get("itinerary_revision_count")
                    prior_count = prior_count_raw if isinstance(prior_count_raw, int) else 0
                    final_state["itinerary_revision_count"] = prior_count + 1
                    if refine_intent:
                        rc_raw = request_state.get("requested_changes")
                        final_state["requested_changes"] = list(rc_raw) if isinstance(rc_raw, list) else []
                    elif "requested_changes" in planning_state:
                        rc_raw = planning_state.get("requested_changes")
                        final_state["requested_changes"] = list(rc_raw) if isinstance(rc_raw, list) else []
                    reply = reply.model_copy(update={"planning_state": final_state})

                trip_id_for_enrichment = created_trip_id or effective_trip_id
                if trip_id_for_enrichment is not None and reply.actions:
                    reply = reply.model_copy(
                        update={
                            "actions": _enrich_actions_with_trip_id(
                                reply.actions, trip_id_for_enrichment
                            )
                        }
                    )

                reply = reply.model_copy(
                    update={
                        "dev_metadata": BuddyDevMetadata(
                            provider=result.provider,
                            model=result.model,
                            fallback_used=index > 0,
                        )
                        if provider_badge_enabled(self.settings)
                        else None
                    }
                )
                if index > 0:
                    logger.warning("Buddy provider fallback succeeded with %s after primary failure.", result.provider)
                return BuddyPersistedGeneration(
                    reply=reply,
                    provider=result.provider,
                    model=result.model,
                    fallback_used=index > 0,
                    created_trip_id=created_trip_id,
                )
            except ApiException as exc:
                last_error = exc
                logger.warning(
                    "Buddy provider failed: provider=%s model=%s category=%s reason=%s",
                    getattr(provider, "provider_name", "unknown"),
                    getattr(provider, "model_name", "unknown"),
                    exc.code,
                    exc.message,
                )
                continue
            except Exception as exc:  # noqa: BLE001
                logger.exception(
                    "Unexpected Buddy provider failure: provider=%s error=%s",
                    getattr(provider, "provider_name", "unknown"),
                    type(exc).__name__,
                )
                last_error = ApiException(
                    status_code=503,
                    code="unknown_provider_error",
                    message="AI provider failed.",
                    retryable=True,
                )
                continue

        reason = last_error.message if last_error is not None else "AI providers unavailable."
        logger.warning("Buddy falling back to deterministic outline: %s", reason)
        return self._mock_reply(
            provider="mock",
            model="saayro-fallback",
            fallback_used=len(provider_order) > 0,
            reason=reason,
            message=message,
            prior_planning_state=planning_state,
            active_turn_context=active_turn_context,
            trip_id=effective_trip_id,
        )

    async def _find_existing_trip(
        self, db: AsyncSession, user_id: str, destination: str
    ) -> TripListItem | None:
        if not destination:
            return None
        target = destination.casefold()
        trips = await list_trips(db, user_id)
        for trip in trips:
            if trip.destination_city.casefold() == target:
                return trip
            if target in trip.title.casefold():
                return trip
        return None

    def _stamp_planning_state(
        self,
        *,
        reply: BuddyStructuredReply,
        trip_id_for_state: str | None,
        prior_planning_state: dict[str, object],
    ) -> BuddyStructuredReply:
        # When a trip was just created this turn, _mutate_reply_after_trip_created
        # has already produced a clean planning_state. Don't merge stale prior
        # state back over it.
        reply_state = reply.planning_state if isinstance(reply.planning_state, dict) else {}
        reply_mode_raw = reply_state.get("mode")
        reply_mode = reply_mode_raw if isinstance(reply_mode_raw, str) else None
        if reply_state.get("created_trip_id") and reply_mode == "trip_bound":
            sanitized_options = _sanitize_options(list(reply.options))
            sanitized_actions = _sanitize_actions_for_past_review(
                list(reply.actions), mode=reply_mode
            )
            return reply.model_copy(
                update={
                    "planning_state": dict(reply_state),
                    "options": sanitized_options,
                    "actions": sanitized_actions,
                }
            )

        server_truth = dict(prior_planning_state) if prior_planning_state else {}
        if trip_id_for_state is not None:
            server_truth["source_trip_id"] = trip_id_for_state
        state = _merge_planning_state(server_truth, reply.planning_state)
        prior_mode = (
            prior_planning_state.get("mode") if isinstance(prior_planning_state, dict) else None
        )
        default_mode = "refine_existing_trip" if trip_id_for_state is not None else "pretrip_create"
        state.setdefault("mode", prior_mode if isinstance(prior_mode, str) else default_mode)
        state["current_question"] = reply.follow_up_question
        sanitized_options = _sanitize_options(list(reply.options))
        state["options"] = sanitized_options
        next_field = _next_missing_field(state)
        if next_field is not None and trip_id_for_state is None:
            state.setdefault("next_missing_field", next_field)
            state.setdefault("expected_answer_type", _expected_for_field(next_field))

        state_mode_raw = state.get("mode")
        mode_for_actions = state_mode_raw if isinstance(state_mode_raw, str) else None
        sanitized_actions = _sanitize_actions_for_past_review(
            list(reply.actions), mode=mode_for_actions
        )
        if mode_for_actions == "past_trip_review":
            cleaned_summary = _strip_banned_review_text(reply.summary)
            cleaned_guidance = _strip_banned_review_text(reply.guidance)
            return reply.model_copy(
                update={
                    "planning_state": state,
                    "options": sanitized_options,
                    "actions": sanitized_actions,
                    "summary": cleaned_summary or reply.summary,
                    "guidance": cleaned_guidance,
                }
            )
        return reply.model_copy(
            update={
                "planning_state": state,
                "options": sanitized_options,
                "actions": sanitized_actions,
            }
        )

    async def _try_create_trip_from_draft(
        self,
        *,
        db: AsyncSession,
        actor: SessionActor,
        draft: BuddyTripDraft,
    ) -> str | None:
        if not validate_future_draft_dates(draft):
            logger.warning("Buddy trip_draft has past or invalid dates; not creating trip.")
            return None
        try:
            payload = TripCreate(
                title=draft.title or f"{draft.destination_city} trip",
                destination_city=draft.destination_city or "",
                destination_region=draft.destination_region or "",
                destination_country=draft.destination_country or "India",
                start_date=date.fromisoformat(draft.start_date) if draft.start_date else cast("date", None),
                end_date=date.fromisoformat(draft.end_date) if draft.end_date else cast("date", None),
                party=draft.party or "",
                overview=draft.overview or "",
                highlights=draft.highlights,
                preferences=UserPreferencesSchema(),
            )
        except (ValidationError, ValueError, TypeError) as exc:
            logger.warning("Buddy trip_draft validation failed; not creating trip: %s", exc)
            return None

        try:
            trip = await create_trip(db, actor.user_id, payload)
        except ApiException as exc:
            logger.warning("Buddy trip creation rejected by service: %s", exc.message)
            return None
        return trip.id

    def _build_date_clarification_reply(
        self,
        *,
        draft: BuddyTripDraft,
        user_days: int | None = None,
    ) -> BuddyPersistedGeneration:
        destination = draft.destination_city or "that destination"
        today = date.today()
        options = _future_date_options(today, user_days)
        summary = (
            f"Those dates look past or invalid. Pick a future range so I can create the {destination} trip."
        )
        planning_state: dict[str, object] = {
            "mode": "awaiting_dates",
            "requested_destination": destination,
            "current_question": summary,
            "options": list(options),
        }
        reply = BuddyStructuredReply(
            summary=summary,
            guidance=f"All dates must be {today.isoformat()} or later.",
            confidence_label="high",
            scope_class="in_scope_travel",
            actions=[],
            follow_up_question=summary,
            tool_hints=[],
            options=options,
            planning_state=planning_state,
            trip_draft=None,
            dev_metadata=BuddyDevMetadata(
                provider="mock", model="saayro-dates", fallback_used=False
            )
            if provider_badge_enabled(self.settings)
            else None,
        )
        return BuddyPersistedGeneration(
            reply=reply, provider="mock", model="saayro-dates", fallback_used=False
        )

    def _post_process_itinerary_reply(self, reply: BuddyStructuredReply) -> BuddyStructuredReply:
        guidance = _normalize_day_lines(reply.guidance)
        filtered_actions = [a for a in reply.actions if a.type != "open_in_maps"]
        if not filtered_actions:
            filtered_actions = [
                BuddyAction(id="refine-relaxed", type="itinerary_refine", label="Make it more relaxed"),
                BuddyAction(id="refine-food", type="itinerary_refine", label="Add food stops"),
                BuddyAction(id="refine-nature", type="itinerary_refine", label="Add local experiences"),
            ]
        return reply.model_copy(update={"guidance": guidance, "actions": filtered_actions})

    def _build_itinerary_continuation_reply(self, trip_id: str) -> BuddyPersistedGeneration:
        options = [
            "Make this itinerary more relaxed",
            "Add food stops",
            "Add nature viewpoints",
            "Open Trip Hub",
        ]
        summary = "Here are useful next moves for this itinerary."
        guidance = (
            "Pick a refinement or jump to Trip Hub. Nothing is saved yet — "
            "Buddy will keep the text itinerary until you confirm it."
        )
        planning_state: dict[str, object] = {
            "mode": "refine_existing_trip",
            "source_trip_id": trip_id,
            "current_question": summary,
            "options": list(options),
        }
        base_actions = [
            BuddyAction(id="refine-relaxed", type="itinerary_refine", label="Make it more relaxed"),
            BuddyAction(id="refine-food", type="itinerary_refine", label="Add food stops"),
            BuddyAction(id="refine-nature", type="itinerary_refine", label="Add local experiences"),
            BuddyAction(id="continuation-open-hub", type="open_trip_hub", label="Open Trip Hub"),
        ]
        reply = BuddyStructuredReply(
            summary=summary,
            guidance=guidance,
            confidence_label="high",
            scope_class="in_scope_travel",
            actions=_enrich_actions_with_trip_id(base_actions, trip_id),
            follow_up_question=summary,
            tool_hints=[],
            options=options,
            planning_state=planning_state,
            trip_draft=None,
            dev_metadata=BuddyDevMetadata(
                provider="mock", model="saayro-continuation", fallback_used=False
            )
            if provider_badge_enabled(self.settings)
            else None,
        )
        return BuddyPersistedGeneration(
            reply=reply, provider="mock", model="saayro-continuation", fallback_used=False
        )

    def _mutate_reply_after_trip_created(self, reply: BuddyStructuredReply, trip_id: str) -> BuddyStructuredReply:
        city = reply.trip_draft.destination_city if reply.trip_draft else "trip"
        confirm_action = BuddyAction(
            id="open-created-trip",
            type="open_trip_hub",
            label=f"Open {city} trip in Trip Hub",
            payload={"trip_id": trip_id},
        )
        plan_action = BuddyAction(
            id="plan-itinerary-for-trip",
            type="plan_itinerary",
            label="Plan itinerary for this trip",
            payload={"trip_id": trip_id},
        )
        confirmation_line = "Trip created in Trip Hub."
        guidance = reply.guidance if reply.guidance else ""
        guidance = f"{guidance} {confirmation_line}".strip()
        actions = [
            action
            for action in reply.actions
            if action.type not in {"open_trip_hub", "plan_itinerary"}
        ]
        actions.append(confirm_action)
        actions.append(plan_action)
        clean_state: dict[str, object] = {
            "mode": "trip_bound",
            "source_trip_id": trip_id,
            "created_trip_id": trip_id,
            "destination_city": city if isinstance(city, str) else None,
            "current_question": None,
            "options": [],
            "expected_answer_type": None,
            "next_missing_field": None,
        }
        return reply.model_copy(
            update={
                "guidance": guidance,
                "actions": _enrich_actions_with_trip_id(actions, trip_id),
                "options": [],
                "follow_up_question": None,
                "planning_state": clean_state,
            }
        )

    def _build_gemini(self) -> GeminiProvider:
        return GeminiProvider(
            api_key=self.settings.ai_gemini_api_key,
            model_name=self.settings.ai_gemini_model,
            timeout_seconds=self.settings.ai_timeout_seconds,
            base_url=self.settings.ai_gemini_base_url,
        )

    def _build_groq(self) -> GroqProvider:
        return GroqProvider(
            api_key=self.settings.ai_groq_api_key,
            model_name=self.settings.ai_groq_model,
            fallback_model=self.settings.ai_groq_fallback_model,
            timeout_seconds=self.settings.ai_timeout_seconds,
            base_url=self.settings.ai_groq_base_url,
        )

    def _build_ollama_cloud(self) -> OllamaCloudProvider:
        return OllamaCloudProvider(
            api_key=self.settings.ai_ollama_cloud_api_key,
            model_name=self.settings.ai_ollama_cloud_model,
            timeout_seconds=self.settings.ai_timeout_seconds,
            base_url=self.settings.ai_ollama_cloud_base_url,
        )

    def _build_ollama_local(self) -> OllamaLocalProvider:
        return OllamaLocalProvider(
            model_name=self.settings.ai_ollama_local_model,
            timeout_seconds=self.settings.ai_timeout_seconds,
            base_url=self.settings.ai_ollama_local_base_url,
        )

    def _provider_order(self) -> list[AIProvider]:
        choice = self.settings.ai_provider
        if choice == "gemini":
            return [self._build_gemini()]
        if choice == "groq":
            return [self._build_groq()]
        if choice == "ollama_cloud":
            return [self._build_ollama_cloud()]
        if choice == "ollama_local":
            return [self._build_ollama_local()]
        if choice == "mock":
            return []

        chain: list[AIProvider] = []
        if self.settings.ai_gemini_api_key:
            chain.append(self._build_gemini())
        if self.settings.ai_groq_api_key:
            chain.append(self._build_groq())
        if (
            self.settings.ai_ollama_cloud_enabled
            and self.settings.ai_ollama_cloud_api_key
        ):
            chain.append(self._build_ollama_cloud())
        if self.settings.ai_ollama_local_enabled:
            chain.append(self._build_ollama_local())
        return chain

    def _guardrail_reply(self, scope_class: str) -> BuddyPersistedGeneration:
        summary, guidance = make_guardrail_summary(scope_class)  # type: ignore[arg-type]
        action_type = cast(
            "Literal['itinerary_refine', 'open_trip_hub']",
            "open_trip_hub" if scope_class == "out_of_scope" else "itinerary_refine",
        )
        action_label = "Open Trip Hub" if scope_class == "out_of_scope" else "Refine this itinerary"
        reply = BuddyStructuredReply(
            summary=summary,
            guidance=guidance,
            confidence_label="medium",
            scope_class=scope_class,  # type: ignore[arg-type]
            actions=[BuddyAction(id=f"{scope_class}-action", type=action_type, label=action_label)],
            follow_up_question="Which trip decision should we tighten next?",
            tool_hints=[ToolHint(tool="scope_guardrail", reason="Guardrail redirect applied.")],
            dev_metadata=BuddyDevMetadata(provider="mock", model="saayro-guardrail", fallback_used=False)
            if provider_badge_enabled(self.settings)
            else None,
        )
        return BuddyPersistedGeneration(reply=reply, provider="mock", model="saayro-guardrail", fallback_used=False)

    def _build_trip_context_disambiguation_reply(
        self, *, current_title: str, current_trip_id: str, requested_destination: str
    ) -> BuddyPersistedGeneration:
        options = [
            f"Start a separate {requested_destination} trip",
            f"Add ideas to current {current_title}",
            "Cancel",
        ]
        summary = (
            f"Should I start this as a separate {requested_destination} trip, "
            f"or add ideas to your current {current_title}?"
        )
        planning_state: dict[str, object] = {
            "mode": "disambiguate_trip_context",
            "requested_destination": requested_destination,
            "source_trip_id": current_trip_id,
            "current_question": summary,
            "options": list(options),
        }
        reply = BuddyStructuredReply(
            summary=summary,
            guidance="Pick the one that matches your intent — I'll keep the other context safe.",
            confidence_label="high",
            scope_class="in_scope_travel",
            actions=[],
            follow_up_question=summary,
            tool_hints=[],
            options=options,
            planning_state=planning_state,
            trip_draft=None,
            dev_metadata=BuddyDevMetadata(
                provider="mock", model="saayro-disambiguation", fallback_used=False
            )
            if provider_badge_enabled(self.settings)
            else None,
        )
        return BuddyPersistedGeneration(
            reply=reply, provider="mock", model="saayro-disambiguation", fallback_used=False
        )

    def _build_existing_trip_disambiguation_reply(
        self, *, match_id: str, match_title: str, match_destination: str
    ) -> BuddyPersistedGeneration:
        options = [
            f"Open existing {match_destination} trip",
            f"Refine existing {match_destination} trip",
            f"Create another {match_destination} trip",
        ]
        summary = (
            f"I found an existing {match_destination} trip. "
            "Should I open/refine that trip, or create another?"
        )
        planning_state: dict[str, object] = {
            "mode": "disambiguate_existing_trip",
            "requested_destination": match_destination,
            "existing_trip_match": {
                "id": match_id,
                "title": match_title,
                "destination_city": match_destination,
            },
            "current_question": summary,
            "options": list(options),
        }
        reply = BuddyStructuredReply(
            summary=summary,
            guidance="I won't create a duplicate without your say-so.",
            confidence_label="high",
            scope_class="in_scope_travel",
            actions=[],
            follow_up_question=summary,
            tool_hints=[],
            options=options,
            planning_state=planning_state,
            trip_draft=None,
            dev_metadata=BuddyDevMetadata(
                provider="mock", model="saayro-disambiguation", fallback_used=False
            )
            if provider_badge_enabled(self.settings)
            else None,
        )
        return BuddyPersistedGeneration(
            reply=reply, provider="mock", model="saayro-disambiguation", fallback_used=False
        )

    def _open_existing_trip_reply(
        self, *, match_id: str, match_title: str, match_destination: str, refine: bool
    ) -> BuddyPersistedGeneration:
        action = BuddyAction(
            id="open-existing-trip",
            type="open_trip_hub",
            label=f"Open {match_title}",
            payload={"trip_id": match_id},
        )
        if refine:
            summary = f"Let's refine your existing {match_destination} trip."
            guidance = "Open it in Trip Hub to continue refinement there."
        else:
            summary = f"Opening your existing {match_destination} trip."
            guidance = "Use the button to jump in."
        reply = BuddyStructuredReply(
            summary=summary,
            guidance=guidance,
            confidence_label="high",
            scope_class="in_scope_travel",
            actions=[action],
            follow_up_question=None,
            tool_hints=[],
            options=[],
            planning_state={"mode": "general"},
            trip_draft=None,
            dev_metadata=BuddyDevMetadata(
                provider="mock", model="saayro-disambiguation", fallback_used=False
            )
            if provider_badge_enabled(self.settings)
            else None,
        )
        return BuddyPersistedGeneration(
            reply=reply, provider="mock", model="saayro-disambiguation", fallback_used=False
        )

    def _build_past_trip_reply(
        self, *, trip_id: str, trip_title: str
    ) -> BuddyPersistedGeneration:
        options = list(_PAST_TRIP_OPTIONS)
        summary = (
            f"{trip_title} has past dates. Should I refresh it with future dates "
            "or treat it as an old trip review?"
        )
        guidance = "I won't fabricate upcoming dates for a past trip."
        base_actions = [
            BuddyAction(
                id="past-trip-open-hub",
                type="open_trip_hub",
                label="Open Trip Hub",
                payload={"trip_id": trip_id},
            ),
        ]
        planning_state: dict[str, object] = {
            "mode": "past_trip_clarification",
            "source_trip_id": trip_id,
            "current_question": summary,
            "options": list(options),
        }
        reply = BuddyStructuredReply(
            summary=summary,
            guidance=guidance,
            confidence_label="high",
            scope_class="in_scope_travel",
            actions=_enrich_actions_with_trip_id(base_actions, trip_id),
            follow_up_question=summary,
            tool_hints=[],
            options=options,
            planning_state=planning_state,
            trip_draft=None,
            dev_metadata=BuddyDevMetadata(
                provider="mock", model="saayro-past-trip", fallback_used=False
            )
            if provider_badge_enabled(self.settings)
            else None,
        )
        return BuddyPersistedGeneration(
            reply=reply, provider="mock", model="saayro-past-trip", fallback_used=False
        )

    def _open_trip_hub_reply(
        self, *, trip_id: str, trip_title: str
    ) -> BuddyPersistedGeneration:
        summary = f"Opening {trip_title} in Trip Hub."
        action = BuddyAction(
            id="past-trip-open-hub",
            type="open_trip_hub",
            label=f"Open {trip_title} in Trip Hub",
            payload={"trip_id": trip_id},
        )
        reply = BuddyStructuredReply(
            summary=summary,
            guidance="",
            confidence_label="high",
            scope_class="in_scope_travel",
            actions=[action],
            follow_up_question=None,
            tool_hints=[],
            options=[],
            planning_state={"mode": "general", "source_trip_id": trip_id},
            trip_draft=None,
            dev_metadata=BuddyDevMetadata(
                provider="mock", model="saayro-past-trip", fallback_used=False
            )
            if provider_badge_enabled(self.settings)
            else None,
        )
        return BuddyPersistedGeneration(
            reply=reply, provider="mock", model="saayro-past-trip", fallback_used=False
        )

    def _build_trip_overview_clarification_reply(
        self, *, draft: BuddyTripDraft
    ) -> BuddyPersistedGeneration:
        destination = draft.destination_city or "your trip"
        options = [
            "Food + cafés + city culture",
            "Family-friendly sightseeing",
            "Tech / city exploration",
            "Relaxed local experiences",
        ]
        summary = f"What kind of trip should {destination} be?"
        guidance = (
            "Pick the shape that fits so I can frame the itinerary correctly before "
            "creating the trip."
        )
        planning_state: dict[str, object] = {
            "mode": "awaiting_overview",
            "requested_destination": destination,
            "current_question": summary,
            "options": list(options),
        }
        reply = BuddyStructuredReply(
            summary=summary,
            guidance=guidance,
            confidence_label="high",
            scope_class="in_scope_travel",
            actions=[],
            follow_up_question=summary,
            tool_hints=[],
            options=options,
            planning_state=planning_state,
            trip_draft=None,
            dev_metadata=BuddyDevMetadata(
                provider="mock", model="saayro-awaiting-overview", fallback_used=False
            )
            if provider_badge_enabled(self.settings)
            else None,
        )
        return BuddyPersistedGeneration(
            reply=reply,
            provider="mock",
            model="saayro-awaiting-overview",
            fallback_used=False,
        )

    def _maybe_handle_draft_recovery(
        self, message: str, planning_state: dict[str, object]
    ) -> BuddyPersistedGeneration | None:
        if not is_restart_or_continue_message(message):
            return None
        if planning_state.get("created_trip_id"):
            return None
        state_mode_raw = planning_state.get("mode")
        state_mode = state_mode_raw if isinstance(state_mode_raw, str) else None
        draft_modes = {
            "pretrip_create",
            "awaiting_dates",
            "awaiting_party",
            "awaiting_overview",
            "past_trip_refresh",
            "new_trip_planning",
        }
        if state_mode not in draft_modes:
            return None
        destination_raw = planning_state.get("destination_city")
        destination = destination_raw if isinstance(destination_raw, str) else None
        has_any_field = any(
            not _is_empty(planning_state.get(key)) for key in _PRETRIP_FIELD_KEYS
        )
        if not has_any_field or not destination:
            return None
        if is_unambiguous_resume_message(message):
            return self._build_resume_reply(
                planning_state=planning_state, destination=destination
            )
        return self._build_draft_recovery_reply(
            planning_state=planning_state, destination=destination
        )

    def _handle_draft_recovery_option(
        self, matched_lower: str, planning_state: dict[str, object]
    ) -> BuddyPersistedGeneration | None:
        destination_raw = planning_state.get("destination_city")
        destination = destination_raw if isinstance(destination_raw, str) else None
        if "continue" in matched_lower and destination:
            return self._build_resume_reply(
                planning_state=planning_state, destination=destination
            )
        if "open trip hub" in matched_lower:
            return self._open_trips_index_reply()
        return None

    def _maybe_handle_expected_answer(
        self,
        *,
        message: str,
        planning_state: dict[str, object],
        captured_fields: dict[str, object],
        matched_option: str | None,
        prior_mode: str | None,
        effective_trip_id: str | None,
    ) -> BuddyPersistedGeneration | None:
        expected_raw = planning_state.get("expected_answer_type")
        expected = expected_raw if isinstance(expected_raw, str) else None
        if expected is None:
            return None

        if expected == "dates":
            if matched_option is not None and _is_custom_dates_choice(matched_option):
                return self._build_custom_dates_reply(planning_state=planning_state)
            if _is_custom_dates_choice(message):
                return self._build_custom_dates_reply(planning_state=planning_state)
            date_range = extract_date_range(message)
            if isinstance(date_range, tuple):
                start, end = date_range
                if start < date.today():
                    return self._build_date_clarification_from_state(planning_state)
                if end < start:
                    return self._build_date_clarification_from_state(planning_state)
                return self._build_dates_accepted_reply(
                    planning_state=planning_state,
                    effective_trip_id=effective_trip_id,
                )
            if matched_option is not None:
                option_range = extract_date_range(matched_option)
                if isinstance(option_range, tuple):
                    start, end = option_range
                    if start >= date.today() and end >= start:
                        planning_state["start_date"] = start.isoformat()
                        planning_state["end_date"] = end.isoformat()
                        return self._build_dates_accepted_reply(
                            planning_state=planning_state,
                            effective_trip_id=effective_trip_id,
                        )
            if date_range == "ambiguous":
                return self._build_ambiguous_date_reply(planning_state=planning_state)
            return None

        if expected == "party":
            if "party" in captured_fields:
                return self._build_party_accepted_reply(
                    planning_state=planning_state,
                    effective_trip_id=effective_trip_id,
                )
            if matched_option is not None and (
                captured := extract_party(matched_option)
            ) is not None:
                planning_state["party"] = captured
                return self._build_party_accepted_reply(
                    planning_state=planning_state,
                    effective_trip_id=effective_trip_id,
                )
            return None

        if expected == "overview":
            if "overview" in captured_fields:
                return self._build_overview_accepted_reply(
                    planning_state=planning_state,
                    effective_trip_id=effective_trip_id,
                )
            if matched_option is not None:
                planning_state["overview"] = matched_option
                return self._build_overview_accepted_reply(
                    planning_state=planning_state,
                    effective_trip_id=effective_trip_id,
                )
            return None

        if expected == "destination":
            if "destination_city" in captured_fields:
                return self._build_resume_reply(
                    planning_state=planning_state,
                    destination=str(captured_fields["destination_city"]),
                )
            return None

        return None

    def _build_dates_accepted_reply(
        self,
        *,
        planning_state: dict[str, object],
        effective_trip_id: str | None,
    ) -> BuddyPersistedGeneration:
        next_field = _next_missing_field(planning_state)
        destination_raw = planning_state.get("destination_city")
        destination = (
            destination_raw if isinstance(destination_raw, str) and destination_raw else "your trip"
        )
        if planning_state.get("mode") == "past_trip_refresh":
            if next_field in (None, "overview") and _is_empty(planning_state.get("overview")):
                planning_state["mode"] = "past_trip_refresh"
                return self._build_refresh_overview_reply(planning_state=planning_state)
            if next_field is None:
                return self._build_refresh_confirm_reply(
                    planning_state=planning_state, destination=destination
                )
        if next_field == "party":
            planning_state["mode"] = "awaiting_party"
            return self._build_party_clarification_reply(
                planning_state=planning_state, destination=destination
            )
        if next_field == "overview":
            planning_state["mode"] = "awaiting_overview"
            return self._build_overview_clarification_reply_from_state(
                planning_state=planning_state, destination=destination
            )
        return self._build_resume_reply(
            planning_state=planning_state, destination=destination
        )

    def _build_party_accepted_reply(
        self,
        *,
        planning_state: dict[str, object],
        effective_trip_id: str | None,
    ) -> BuddyPersistedGeneration:
        destination_raw = planning_state.get("destination_city")
        destination = (
            destination_raw if isinstance(destination_raw, str) and destination_raw else "your trip"
        )
        next_field = _next_missing_field(planning_state)
        if planning_state.get("mode") == "past_trip_refresh":
            if next_field is None:
                return self._build_refresh_confirm_reply(
                    planning_state=planning_state, destination=destination
                )
            if next_field == "overview":
                return self._build_refresh_overview_reply(planning_state=planning_state)
        if next_field == "overview":
            planning_state["mode"] = "awaiting_overview"
            return self._build_overview_clarification_reply_from_state(
                planning_state=planning_state, destination=destination
            )
        return self._build_resume_reply(
            planning_state=planning_state, destination=destination
        )

    def _build_overview_accepted_reply(
        self,
        *,
        planning_state: dict[str, object],
        effective_trip_id: str | None,
    ) -> BuddyPersistedGeneration:
        destination_raw = planning_state.get("destination_city")
        destination = (
            destination_raw if isinstance(destination_raw, str) and destination_raw else "your trip"
        )
        if planning_state.get("mode") == "past_trip_refresh":
            return self._build_refresh_confirm_reply(
                planning_state=planning_state, destination=destination
            )
        next_field = _next_missing_field(planning_state)
        if next_field is None:
            planning_state["mode"] = "pretrip_create"
            return self._build_resume_reply(
                planning_state=planning_state,
                destination=destination,
                summary_override=(
                    f"Ready to create your {destination} trip — confirm and I'll set it up."
                ),
            )
        return self._build_resume_reply(
            planning_state=planning_state, destination=destination
        )

    def _build_party_clarification_reply(
        self,
        *,
        planning_state: dict[str, object],
        destination: str,
    ) -> BuddyPersistedGeneration:
        options = ["Solo", "Couple", "Family", "Friends", "Business"]
        summary = f"Who's going on the {destination} trip?"
        guidance = "Pick the party shape so pacing and suggestions match."
        planning_state["mode"] = "awaiting_party"
        planning_state["expected_answer_type"] = "party"
        planning_state["next_missing_field"] = "party"
        planning_state["current_question"] = summary
        planning_state["options"] = list(options)
        reply = self._deterministic_reply(
            summary=summary,
            guidance=guidance,
            options=options,
            planning_state=planning_state,
            model="saayro-awaiting-party",
        )
        return BuddyPersistedGeneration(
            reply=reply, provider="mock", model="saayro-awaiting-party", fallback_used=False
        )

    def _build_overview_clarification_reply_from_state(
        self,
        *,
        planning_state: dict[str, object],
        destination: str,
    ) -> BuddyPersistedGeneration:
        options = [
            "Food + cafés + city culture",
            "Family-friendly sightseeing",
            "Tech / city exploration",
            "Relaxed local experiences",
        ]
        summary = f"What kind of trip should {destination} be?"
        guidance = (
            "Pick the shape that fits so I can frame the itinerary correctly before "
            "creating the trip."
        )
        planning_state["mode"] = "awaiting_overview"
        planning_state["expected_answer_type"] = "overview"
        planning_state["next_missing_field"] = "overview"
        planning_state["current_question"] = summary
        planning_state["options"] = list(options)
        reply = self._deterministic_reply(
            summary=summary,
            guidance=guidance,
            options=options,
            planning_state=planning_state,
            model="saayro-awaiting-overview",
        )
        return BuddyPersistedGeneration(
            reply=reply,
            provider="mock",
            model="saayro-awaiting-overview",
            fallback_used=False,
        )

    def _build_resume_reply(
        self,
        *,
        planning_state: dict[str, object],
        destination: str,
        summary_override: str | None = None,
    ) -> BuddyPersistedGeneration:
        next_field = _next_missing_field(planning_state)
        if next_field == "dates":
            days_raw = planning_state.get("requested_days")
            days = days_raw if isinstance(days_raw, int) else None
            options = _future_date_options(date.today(), days) + ["Let me pick custom dates"]
            summary = (
                summary_override
                or f"I still have your {destination} trip draft in progress. I need your dates."
            )
            guidance = "Pick one of these future ranges or type your own ISO range."
            planning_state["mode"] = "awaiting_dates"
            planning_state["expected_answer_type"] = "dates"
            planning_state["next_missing_field"] = "dates"
            planning_state["current_question"] = summary
            planning_state["options"] = list(options)
            reply = self._deterministic_reply(
                summary=summary,
                guidance=guidance,
                options=options,
                planning_state=planning_state,
                model="saayro-resume-dates",
            )
            return BuddyPersistedGeneration(
                reply=reply, provider="mock", model="saayro-resume-dates", fallback_used=False
            )
        if next_field == "party":
            return self._build_party_clarification_reply(
                planning_state=planning_state, destination=destination
            )
        if next_field == "overview":
            return self._build_overview_clarification_reply_from_state(
                planning_state=planning_state, destination=destination
            )
        if next_field == "destination":
            summary = summary_override or "Where should we plan the trip?"
            guidance = "Share the city you'd like to explore."
            planning_state["mode"] = "pretrip_create"
            planning_state["expected_answer_type"] = "destination"
            planning_state["next_missing_field"] = "destination"
            planning_state["current_question"] = summary
            planning_state["options"] = []
            reply = self._deterministic_reply(
                summary=summary,
                guidance=guidance,
                options=[],
                planning_state=planning_state,
                model="saayro-resume-destination",
            )
            return BuddyPersistedGeneration(
                reply=reply,
                provider="mock",
                model="saayro-resume-destination",
                fallback_used=False,
            )
        summary = (
            summary_override
            or f"Your {destination} draft is complete. Shall I create the trip now?"
        )
        options = [f"Create {destination} trip", "Review details", "Cancel"]
        planning_state["mode"] = "pending_confirmation"
        planning_state["expected_answer_type"] = "option"
        planning_state["next_missing_field"] = None
        planning_state["current_question"] = summary
        planning_state["options"] = list(options)
        reply = self._deterministic_reply(
            summary=summary,
            guidance="Confirm to create the trip shell.",
            options=options,
            planning_state=planning_state,
            model="saayro-resume-ready",
        )
        return BuddyPersistedGeneration(
            reply=reply, provider="mock", model="saayro-resume-ready", fallback_used=False
        )

    def _build_draft_recovery_reply(
        self, *, planning_state: dict[str, object], destination: str
    ) -> BuddyPersistedGeneration:
        options = [f"Continue {destination} trip", "Start new trip", "Open Trip Hub"]
        summary = (
            f"I still have your {destination} trip draft in progress. "
            "Continue that or start a new trip?"
        )
        planning_state = dict(planning_state)
        planning_state["mode"] = "draft_recovery"
        planning_state["expected_answer_type"] = "option"
        planning_state["current_question"] = summary
        planning_state["options"] = list(options)
        reply = self._deterministic_reply(
            summary=summary,
            guidance="Pick one — I won't drop the draft without your say-so.",
            options=options,
            planning_state=planning_state,
            model="saayro-draft-recovery",
        )
        return BuddyPersistedGeneration(
            reply=reply, provider="mock", model="saayro-draft-recovery", fallback_used=False
        )

    def _build_custom_dates_reply(
        self, *, planning_state: dict[str, object]
    ) -> BuddyPersistedGeneration:
        summary = "Sure — enter your preferred dates, like 2026-05-10 to 2026-05-13."
        guidance = "Type an ISO range. I need the start and end in YYYY-MM-DD form."
        planning_state["expected_answer_type"] = "dates"
        planning_state["next_missing_field"] = "dates"
        planning_state["current_question"] = summary
        planning_state["options"] = []
        reply = self._deterministic_reply(
            summary=summary,
            guidance=guidance,
            options=[],
            planning_state=planning_state,
            model="saayro-custom-dates",
        )
        return BuddyPersistedGeneration(
            reply=reply, provider="mock", model="saayro-custom-dates", fallback_used=False
        )

    def _build_ambiguous_date_reply(
        self, *, planning_state: dict[str, object]
    ) -> BuddyPersistedGeneration:
        summary = (
            "I can read ISO ranges like 2026-05-10 to 2026-05-13 right now. "
            "Could you type it in that shape?"
        )
        guidance = "Stick to YYYY-MM-DD on both sides and separate with 'to'."
        planning_state["expected_answer_type"] = "dates"
        planning_state["next_missing_field"] = "dates"
        planning_state["current_question"] = summary
        planning_state["options"] = []
        reply = self._deterministic_reply(
            summary=summary,
            guidance=guidance,
            options=[],
            planning_state=planning_state,
            model="saayro-ambiguous-dates",
        )
        return BuddyPersistedGeneration(
            reply=reply, provider="mock", model="saayro-ambiguous-dates", fallback_used=False
        )

    def _build_date_clarification_from_state(
        self, planning_state: dict[str, object]
    ) -> BuddyPersistedGeneration:
        destination_raw = planning_state.get("destination_city")
        destination = (
            destination_raw if isinstance(destination_raw, str) and destination_raw else "your trip"
        )
        days_raw = planning_state.get("requested_days")
        days = days_raw if isinstance(days_raw, int) else None
        options = _future_date_options(date.today(), days) + ["Let me pick custom dates"]
        summary = (
            f"Those dates look past or invalid. Pick a future range so I can continue "
            f"your {destination} plan."
        )
        planning_state["expected_answer_type"] = "dates"
        planning_state["next_missing_field"] = "dates"
        planning_state["current_question"] = summary
        planning_state["options"] = list(options)
        reply = self._deterministic_reply(
            summary=summary,
            guidance=f"All dates must be {date.today().isoformat()} or later.",
            options=options,
            planning_state=planning_state,
            model="saayro-dates",
        )
        return BuddyPersistedGeneration(
            reply=reply, provider="mock", model="saayro-dates", fallback_used=False
        )

    def _build_past_trip_refresh_reply(
        self, *, trip_id: str, trip: BuddyTripContext
    ) -> BuddyPersistedGeneration:
        duration_days = (trip.end_date - trip.start_date).days + 1
        options = _future_date_options(date.today(), duration_days) + ["Let me pick custom dates"]
        summary = (
            f"Refreshing your {trip.title}. Pick future dates or enter a custom range."
        )
        guidance = (
            f"I'll keep {trip.destination_city}, party={trip.party or 'unspecified'}, "
            "and any highlights from the old trip unless you tell me otherwise."
        )
        planning_state: dict[str, object] = {
            "mode": "past_trip_refresh",
            "source_trip_id": trip_id,
            "destination_city": trip.destination_city,
            "destination_region": trip.destination_region,
            "party": trip.party or None,
            "overview": trip.overview or None,
            "requested_days": duration_days,
            "expected_answer_type": "dates",
            "next_missing_field": "dates",
            "current_question": summary,
            "options": list(options),
        }
        reply = self._deterministic_reply(
            summary=summary,
            guidance=guidance,
            options=options,
            planning_state=planning_state,
            model="saayro-past-trip-refresh",
        )
        return BuddyPersistedGeneration(
            reply=reply,
            provider="mock",
            model="saayro-past-trip-refresh",
            fallback_used=False,
        )

    def _build_refresh_overview_reply(
        self, *, planning_state: dict[str, object]
    ) -> BuddyPersistedGeneration:
        destination_raw = planning_state.get("destination_city")
        destination = (
            destination_raw if isinstance(destination_raw, str) and destination_raw else "your trip"
        )
        options = [
            "Food + cafés + city culture",
            "Family-friendly sightseeing",
            "Relaxed local experiences",
            "Keep the old trip's goal",
        ]
        summary = f"What kind of trip should the refreshed {destination} trip be?"
        guidance = "Pick one so I can frame the itinerary correctly before creating the refreshed trip."
        planning_state["expected_answer_type"] = "overview"
        planning_state["next_missing_field"] = "overview"
        planning_state["current_question"] = summary
        planning_state["options"] = list(options)
        reply = self._deterministic_reply(
            summary=summary,
            guidance=guidance,
            options=options,
            planning_state=planning_state,
            model="saayro-refresh-overview",
        )
        return BuddyPersistedGeneration(
            reply=reply,
            provider="mock",
            model="saayro-refresh-overview",
            fallback_used=False,
        )

    def _build_refresh_confirm_reply(
        self, *, planning_state: dict[str, object], destination: str
    ) -> BuddyPersistedGeneration:
        start = planning_state.get("start_date")
        end = planning_state.get("end_date")
        start_str = start if isinstance(start, str) else "?"
        end_str = end if isinstance(end, str) else "?"
        summary = (
            f"Create a refreshed {destination} trip with {start_str} to {end_str}?"
        )
        options = [
            f"Create refreshed {destination} trip",
            "Review old trip instead",
            "Cancel",
        ]
        planning_state["mode"] = "past_trip_refresh_confirm"
        planning_state["expected_answer_type"] = "option"
        planning_state["next_missing_field"] = None
        planning_state["current_question"] = summary
        planning_state["options"] = list(options)
        reply = self._deterministic_reply(
            summary=summary,
            guidance="Confirm to create a new trip — I won't overwrite the old one.",
            options=options,
            planning_state=planning_state,
            model="saayro-refresh-confirm",
        )
        return BuddyPersistedGeneration(
            reply=reply,
            provider="mock",
            model="saayro-refresh-confirm",
            fallback_used=False,
        )

    async def _handle_refresh_confirmation(
        self,
        *,
        db: AsyncSession,
        actor: SessionActor,
        matched_option: str,
        planning_state: dict[str, object],
    ) -> BuddyPersistedGeneration | None:
        matched_lower = matched_option.casefold()
        if "cancel" in matched_lower:
            return self._simple_ack_reply(
                "Got it — cancelled the refresh. The old trip is untouched."
            )
        if "review old trip" in matched_lower:
            source_raw = planning_state.get("source_trip_id")
            source_id = source_raw if isinstance(source_raw, str) else None
            if source_id is None:
                return self._simple_ack_reply(
                    "I lost the link to the old trip. Reopen it from Trip Hub to review."
                )
            summary = "Reviewing the old trip as a historical record."
            options = ["Open Trip Hub", "Start a new trip"]
            review_state: dict[str, object] = {
                "mode": "past_trip_review",
                "source_trip_id": source_id,
                "current_question": summary,
                "options": list(options),
            }
            reply = self._deterministic_reply(
                summary=summary,
                guidance=(
                    "The dates are in the past; I'll treat this as a review, "
                    "not an upcoming plan."
                ),
                options=options,
                planning_state=review_state,
                model="saayro-past-trip-review",
            )
            return BuddyPersistedGeneration(
                reply=reply,
                provider="mock",
                model="saayro-past-trip-review",
                fallback_used=False,
            )
        if "create refreshed" in matched_lower:
            draft = self._refresh_draft_from_state(planning_state)
            if draft is None:
                return self._simple_ack_reply(
                    "Some details went missing — could you confirm dates and destination again?"
                )
            if not validate_future_draft_dates(draft):
                return self._build_date_clarification_from_state(planning_state)
            try:
                created_id = await self._try_create_trip_from_draft(
                    db=db, actor=actor, draft=draft
                )
            except ApiException as exc:  # noqa: BLE001
                logger.warning("Refresh trip creation failed: %s", exc.message)
                return self._simple_ack_reply(
                    "I could not create the refreshed trip. Try again from Trip Hub."
                )
            if created_id is None:
                return self._simple_ack_reply(
                    "I could not create the refreshed trip. Try again from Trip Hub."
                )
            destination = draft.destination_city or "your trip"
            summary = (
                f"Refreshed {destination} trip created from {draft.start_date} "
                f"to {draft.end_date}."
            )
            confirm_action = BuddyAction(
                id="open-refreshed-trip",
                type="open_trip_hub",
                label=f"Open refreshed {destination} trip",
                payload={"trip_id": created_id},
            )
            plan_action = BuddyAction(
                id="plan-refreshed-itinerary",
                type="plan_itinerary",
                label="Plan itinerary for this trip",
                payload={"trip_id": created_id},
            )
            reply = BuddyStructuredReply(
                summary=summary,
                guidance="Use the buttons to open it or start planning the itinerary.",
                confidence_label="high",
                scope_class="in_scope_travel",
                actions=_enrich_actions_with_trip_id(
                    [confirm_action, plan_action], created_id
                ),
                follow_up_question=None,
                tool_hints=[],
                options=[],
                planning_state={
                    "mode": "refine_existing_trip",
                    "source_trip_id": created_id,
                },
                trip_draft=None,
                dev_metadata=BuddyDevMetadata(
                    provider="mock", model="saayro-refresh-created", fallback_used=False
                )
                if provider_badge_enabled(self.settings)
                else None,
            )
            return BuddyPersistedGeneration(
                reply=reply,
                provider="mock",
                model="saayro-refresh-created",
                fallback_used=False,
                created_trip_id=created_id,
            )
        return None

    def _refresh_draft_from_state(
        self, planning_state: dict[str, object]
    ) -> BuddyTripDraft | None:
        destination_raw = planning_state.get("destination_city")
        if not isinstance(destination_raw, str) or not destination_raw:
            return None
        start_raw = planning_state.get("start_date")
        end_raw = planning_state.get("end_date")
        if not isinstance(start_raw, str) or not isinstance(end_raw, str):
            return None
        party_raw = planning_state.get("party")
        overview_raw = planning_state.get("overview")
        region_raw = planning_state.get("destination_region")
        return BuddyTripDraft(
            title=f"{destination_raw} refreshed trip",
            destination_city=destination_raw,
            destination_region=region_raw if isinstance(region_raw, str) else None,
            destination_country="India",
            start_date=start_raw,
            end_date=end_raw,
            party=party_raw if isinstance(party_raw, str) and party_raw else "solo",
            overview=overview_raw if isinstance(overview_raw, str) and overview_raw else "Refreshed trip plan.",
            highlights=[],
            ready=True,
        )

    async def _handle_intent(
        self,
        *,
        intent: BuddyIntent,
        db: AsyncSession,
        actor: SessionActor,
        effective_trip_id: str | None,
        planning_state: dict[str, object],
        prior_mode: str | None,
        message: str,
    ) -> BuddyPersistedGeneration | None:
        state_mode = planning_state.get("mode")
        is_cancelled = state_mode == "cancelled"

        if intent == "finalize_planning" and effective_trip_id is not None:
            return self._build_finalize_reply(trip_id=effective_trip_id)

        if intent == "refine_itinerary" and effective_trip_id is not None:
            if not planning_state.get("last_itinerary_text"):
                return self._build_no_prior_itinerary_reply(trip_id=effective_trip_id)
            return None  # Fall through to provider with refine_intent flagged

        if intent == "review_old_trip" and effective_trip_id is not None:
            return self._build_past_trip_review_entry_reply(
                trip_id=effective_trip_id,
                planning_state=planning_state,
            )

        if intent == "reuse_highlights_for_future_trip" and effective_trip_id is not None:
            context = await build_buddy_context(
                db, user_id=actor.user_id, trip_id=effective_trip_id
            )
            if context.trip is None:
                return None
            return self._build_past_trip_refresh_reply(
                trip_id=effective_trip_id, trip=context.trip
            )

        if intent == "review_details" and prior_mode in {"pretrip_create", "pending_confirmation", "editing_details"}:
            return self._build_review_details_reply(planning_state=planning_state)

        if intent == "edit_details" and prior_mode in {"pretrip_create", "pending_confirmation", "editing_details"}:
            return self._build_edit_details_reply(planning_state=planning_state)

        if intent in ("edit_destination", "edit_dates", "edit_party", "edit_overview"):
            return self._build_edit_field_reply(intent=intent, planning_state=planning_state)

        if intent == "back_to_confirm":
            destination = planning_state.get("destination_city")
            destination_str = destination if isinstance(destination, str) and destination else "your trip"
            return self._build_resume_reply(
                planning_state=planning_state, destination=destination_str
            )

        if intent == "cancel_trip_creation" and prior_mode in {"pretrip_create", "pending_confirmation", "editing_details"}:
            return self._build_cancelled_reply(scope="trip_creation")

        if intent == "create_trip" and prior_mode in {"pretrip_create", "pending_confirmation", "editing_details", "cancelled"}:
            if is_cancelled:
                return self._build_cancellation_reaffirmed_reply(scope="trip_creation")
            return await self._handle_pending_create(
                db=db, actor=actor, planning_state=planning_state
            )

        if intent == "create_refreshed_trip":
            if is_cancelled:
                return self._build_cancellation_reaffirmed_reply(scope="refresh")
            # If we still have past_trip_refresh_confirm context, fall through to existing handler.
            if prior_mode == "past_trip_refresh_confirm":
                # Existing matched_option path will call _handle_refresh_confirmation.
                return None
            return None

        if intent == "open_trip_hub":
            if effective_trip_id is not None:
                return self._open_trip_hub_reply_for_trip_id(effective_trip_id)
            return self._open_trips_index_reply()

        if intent == "start_new_trip":
            return self._build_start_new_trip_reply()

        if intent == "draft_itinerary" and effective_trip_id is not None:
            # Let normal itinerary path handle this; signal via message rewrite.
            return None

        return None

    def _build_review_details_reply(
        self, *, planning_state: dict[str, object]
    ) -> BuddyPersistedGeneration:
        destination_raw = planning_state.get("destination_city")
        destination = destination_raw if isinstance(destination_raw, str) and destination_raw else "your trip"
        start = planning_state.get("start_date")
        end = planning_state.get("end_date")
        party = planning_state.get("party")
        overview = planning_state.get("overview")
        lines = [
            f"Destination: {destination}",
            f"Dates: {start if isinstance(start, str) else '—'} to {end if isinstance(end, str) else '—'}",
            f"Party: {party if isinstance(party, str) and party else '—'}",
            f"Goal: {overview if isinstance(overview, str) and overview else '—'}",
        ]
        guidance = "\n".join(lines)
        summary = f"Here's your {destination} trip draft so far. Create it, edit, or cancel."
        options = [f"Create {destination} trip", "Edit details", "Cancel"]
        new_state = dict(planning_state)
        new_state["mode"] = "pending_confirmation"
        new_state["expected_answer_type"] = "option"
        new_state["next_missing_field"] = None
        new_state["current_question"] = summary
        new_state["options"] = list(options)
        reply = self._deterministic_reply(
            summary=summary,
            guidance=guidance,
            options=options,
            planning_state=new_state,
            model="saayro-review-details",
        )
        return BuddyPersistedGeneration(
            reply=reply, provider="mock", model="saayro-review-details", fallback_used=False
        )

    def _build_edit_details_reply(
        self, *, planning_state: dict[str, object]
    ) -> BuddyPersistedGeneration:
        options = [
            "Edit destination",
            "Edit dates",
            "Edit party",
            "Edit overview",
            "Back to confirm",
        ]
        summary = "Which detail should we change?"
        new_state = dict(planning_state)
        new_state["mode"] = "editing_details"
        new_state["expected_answer_type"] = "option"
        new_state["next_missing_field"] = None
        new_state["current_question"] = summary
        new_state["options"] = list(options)
        reply = self._deterministic_reply(
            summary=summary,
            guidance="Pick the field you want to change. Other fields stay as they are.",
            options=options,
            planning_state=new_state,
            model="saayro-edit-details",
        )
        return BuddyPersistedGeneration(
            reply=reply, provider="mock", model="saayro-edit-details", fallback_used=False
        )

    def _build_edit_field_reply(
        self, *, intent: BuddyIntent, planning_state: dict[str, object]
    ) -> BuddyPersistedGeneration:
        new_state = dict(planning_state)
        if intent == "edit_destination":
            new_state.pop("destination_city", None)
            new_state.pop("destination_region", None)
            new_state["mode"] = "pretrip_create"
            new_state["expected_answer_type"] = "destination"
            new_state["next_missing_field"] = "destination"
            summary = "Which destination should we plan instead?"
            options: list[str] = []
            model = "saayro-edit-destination"
        elif intent == "edit_dates":
            new_state.pop("start_date", None)
            new_state.pop("end_date", None)
            new_state["mode"] = "awaiting_dates"
            new_state["expected_answer_type"] = "dates"
            new_state["next_missing_field"] = "dates"
            days_raw = new_state.get("requested_days")
            days = days_raw if isinstance(days_raw, int) else None
            options = _future_date_options(date.today(), days) + ["Let me pick custom dates"]
            summary = "What dates should we use instead?"
            model = "saayro-edit-dates"
        elif intent == "edit_party":
            new_state.pop("party", None)
            new_state["mode"] = "awaiting_party"
            new_state["expected_answer_type"] = "party"
            new_state["next_missing_field"] = "party"
            options = ["solo", "couple", "family", "friends"]
            summary = "Who is travelling?"
            model = "saayro-edit-party"
        else:  # edit_overview
            new_state.pop("overview", None)
            new_state["mode"] = "awaiting_overview"
            new_state["expected_answer_type"] = "overview"
            new_state["next_missing_field"] = "overview"
            options = []
            summary = "What's the new vibe or focus for this trip?"
            model = "saayro-edit-overview"
        new_state["current_question"] = summary
        new_state["options"] = list(options)
        reply = self._deterministic_reply(
            summary=summary,
            guidance="Type your answer; other details stay saved.",
            options=options,
            planning_state=new_state,
            model=model,
        )
        return BuddyPersistedGeneration(
            reply=reply, provider="mock", model=model, fallback_used=False
        )

    def _build_cancelled_reply(self, *, scope: str) -> BuddyPersistedGeneration:
        if scope == "refresh":
            summary = "Cancelled the refresh. The old trip is untouched."
            options = ["Refresh with future dates", "Review old trip", "Open Trip Hub"]
        else:
            summary = "Cancelled. Start a new trip when you're ready."
            options = ["Start new trip", "Open Trip Hub"]
        state: dict[str, object] = {
            "mode": "cancelled",
            "cancelled_scope": scope,
            "current_question": summary,
            "options": list(options),
            "expected_answer_type": "option",
        }
        reply = self._deterministic_reply(
            summary=summary,
            guidance="Pick an option below.",
            options=options,
            planning_state=state,
            model="saayro-cancelled",
        )
        return BuddyPersistedGeneration(
            reply=reply, provider="mock", model="saayro-cancelled", fallback_used=False
        )

    def _build_cancellation_reaffirmed_reply(self, *, scope: str) -> BuddyPersistedGeneration:
        if scope == "refresh":
            summary = "That refresh was cancelled. Start a new refresh?"
            options = ["Refresh with future dates", "Review old trip", "Open Trip Hub"]
        else:
            summary = "That draft was cancelled. Start a new trip?"
            options = ["Start new trip", "Open Trip Hub"]
        state: dict[str, object] = {
            "mode": "cancelled",
            "cancelled_scope": scope,
            "current_question": summary,
            "options": list(options),
            "expected_answer_type": "option",
        }
        reply = self._deterministic_reply(
            summary=summary,
            guidance="The earlier action is no longer active.",
            options=options,
            planning_state=state,
            model="saayro-cancellation-reaffirmed",
        )
        return BuddyPersistedGeneration(
            reply=reply,
            provider="mock",
            model="saayro-cancellation-reaffirmed",
            fallback_used=False,
        )

    def _build_already_created_reply(
        self, *, trip_id: str, destination: str
    ) -> BuddyPersistedGeneration:
        summary = (
            f"This {destination} trip is already in Trip Hub. "
            "Continue planning the itinerary or open Trip Hub?"
        )
        actions = [
            BuddyAction(
                id="plan-itinerary-for-trip",
                type="plan_itinerary",
                label="Plan itinerary for this trip",
                payload={"trip_id": trip_id},
            ),
            BuddyAction(
                id="open-existing-trip",
                type="open_trip_hub",
                label=f"Open {destination} in Trip Hub",
                payload={"trip_id": trip_id},
            ),
        ]
        state: dict[str, object] = {
            "mode": "trip_bound",
            "source_trip_id": trip_id,
            "created_trip_id": trip_id,
            "destination_city": destination,
            "current_question": None,
            "options": [],
            "expected_answer_type": None,
            "next_missing_field": None,
        }
        reply = BuddyStructuredReply(
            summary=summary,
            guidance="",
            confidence_label="high",
            scope_class="in_scope_travel",
            actions=_enrich_actions_with_trip_id(actions, trip_id),
            follow_up_question=None,
            tool_hints=[],
            options=[],
            planning_state=state,
            trip_draft=None,
            dev_metadata=BuddyDevMetadata(
                provider="mock", model="saayro-already-created", fallback_used=False
            )
            if provider_badge_enabled(self.settings)
            else None,
        )
        return BuddyPersistedGeneration(
            reply=reply, provider="mock", model="saayro-already-created", fallback_used=False
        )

    async def _handle_pending_create(
        self,
        *,
        db: AsyncSession,
        actor: SessionActor,
        planning_state: dict[str, object],
    ) -> BuddyPersistedGeneration | None:
        created_raw = planning_state.get("created_trip_id")
        destination_raw = planning_state.get("destination_city")
        destination = destination_raw if isinstance(destination_raw, str) and destination_raw else "your trip"
        if isinstance(created_raw, str) and created_raw:
            return self._build_already_created_reply(
                trip_id=created_raw, destination=destination
            )
        if isinstance(destination_raw, str) and destination_raw:
            existing = await self._find_existing_trip(db, actor.user_id, destination_raw)
            if existing is not None:
                return self._build_already_created_reply(
                    trip_id=existing.id, destination=existing.destination_city
                )
        draft = self._refresh_draft_from_state(planning_state)
        if draft is None:
            return self._simple_ack_reply(
                "Some details went missing — let's review them again."
            )
        if not validate_future_draft_dates(draft):
            return self._build_date_clarification_from_state(planning_state)
        try:
            created_id = await self._try_create_trip_from_draft(
                db=db, actor=actor, draft=draft
            )
        except ApiException as exc:  # noqa: BLE001
            logger.warning("Pending create failed: %s", exc.message)
            return self._simple_ack_reply(
                "I could not create the trip. Try again from Trip Hub."
            )
        if created_id is None:
            return self._simple_ack_reply(
                "I could not create the trip. Try again from Trip Hub."
            )
        # Build a reply that goes through _mutate_reply_after_trip_created so we
        # get consistent post-create state stamping and trip-hub/plan-itinerary
        # action wiring.
        base_reply = BuddyStructuredReply(
            summary=f"Creating your {draft.destination_city} trip.",
            guidance="",
            confidence_label="high",
            scope_class="in_scope_travel",
            actions=[],
            follow_up_question=None,
            tool_hints=[],
            options=[],
            planning_state={},
            trip_draft=draft,
        )
        reply = self._mutate_reply_after_trip_created(base_reply, created_id)
        reply = reply.model_copy(
            update={
                "dev_metadata": BuddyDevMetadata(
                    provider="mock", model="saayro-create-trip", fallback_used=False
                )
                if provider_badge_enabled(self.settings)
                else None
            }
        )
        return BuddyPersistedGeneration(
            reply=reply,
            provider="mock",
            model="saayro-create-trip",
            fallback_used=False,
            created_trip_id=created_id,
        )

    def _build_past_trip_review_entry_reply(
        self, *, trip_id: str, planning_state: dict[str, object]
    ) -> BuddyPersistedGeneration:
        destination_raw = planning_state.get("destination_city")
        destination = destination_raw if isinstance(destination_raw, str) and destination_raw else "this trip"
        summary = (
            f"Reviewing {destination} as a historical record. "
            "These dates are in the past."
        )
        guidance = (
            "Reflect on what was memorable. When you're ready, you can reuse "
            "the highlights for a future trip."
        )
        options = ["Reuse highlights for a future trip", "Open Trip Hub"]
        state: dict[str, object] = dict(planning_state)
        state["mode"] = "past_trip_review"
        state["source_trip_id"] = trip_id
        state["current_question"] = summary
        state["options"] = list(options)
        state["expected_answer_type"] = "option"
        state["next_missing_field"] = None
        actions = [
            BuddyAction(
                id="past-trip-review-open-hub",
                type="open_trip_hub",
                label="Open Trip Hub",
                payload={"trip_id": trip_id},
            ),
        ]
        reply = BuddyStructuredReply(
            summary=summary,
            guidance=guidance,
            confidence_label="high",
            scope_class="in_scope_travel",
            actions=_enrich_actions_with_trip_id(actions, trip_id),
            follow_up_question=summary,
            tool_hints=[],
            options=options,
            planning_state=state,
            trip_draft=None,
            dev_metadata=BuddyDevMetadata(
                provider="mock", model="saayro-past-trip-review-entry", fallback_used=False
            )
            if provider_badge_enabled(self.settings)
            else None,
        )
        return BuddyPersistedGeneration(
            reply=reply,
            provider="mock",
            model="saayro-past-trip-review-entry",
            fallback_used=False,
        )

    def _build_finalize_reply(self, *, trip_id: str) -> BuddyPersistedGeneration:
        summary = (
            "Great — this is your working itinerary for now. "
            "It is not saved into Trip Hub itinerary cards yet."
        )
        guidance = "You can reopen Buddy on this trip anytime to keep refining."
        actions = [
            BuddyAction(
                id="finalize-open-hub",
                type="open_trip_hub",
                label="Open Trip Hub",
                payload={"trip_id": trip_id},
            ),
            BuddyAction(
                id="finalize-refine-later",
                type="itinerary_refine",
                label="Refine later",
                payload={"trip_id": trip_id},
            ),
            BuddyAction(
                id="finalize-start-new",
                type="open_trip_hub",
                label="Start new trip",
                payload={},
            ),
        ]
        state: dict[str, object] = {
            "mode": "finalized",
            "source_trip_id": trip_id,
            "created_trip_id": trip_id,
            "current_question": None,
            "options": [],
            "expected_answer_type": None,
            "next_missing_field": None,
        }
        reply = BuddyStructuredReply(
            summary=summary,
            guidance=guidance,
            confidence_label="high",
            scope_class="in_scope_travel",
            actions=actions,
            follow_up_question=None,
            tool_hints=[],
            options=[],
            planning_state=state,
            trip_draft=None,
            dev_metadata=BuddyDevMetadata(
                provider="mock", model="saayro-finalized", fallback_used=False
            )
            if provider_badge_enabled(self.settings)
            else None,
        )
        return BuddyPersistedGeneration(
            reply=reply, provider="mock", model="saayro-finalized", fallback_used=False
        )

    def _open_trip_hub_reply_for_trip_id(self, trip_id: str) -> BuddyPersistedGeneration:
        action = BuddyAction(
            id="open-trip-from-intent",
            type="open_trip_hub",
            label="Open Trip Hub",
            payload={"trip_id": trip_id},
        )
        reply = BuddyStructuredReply(
            summary="Opening this trip in Trip Hub.",
            guidance="",
            confidence_label="high",
            scope_class="in_scope_travel",
            actions=[action],
            follow_up_question=None,
            tool_hints=[],
            options=[],
            planning_state={"mode": "trip_bound", "source_trip_id": trip_id},
            trip_draft=None,
            dev_metadata=BuddyDevMetadata(
                provider="mock", model="saayro-open-trip", fallback_used=False
            )
            if provider_badge_enabled(self.settings)
            else None,
        )
        return BuddyPersistedGeneration(
            reply=reply, provider="mock", model="saayro-open-trip", fallback_used=False
        )

    def _build_start_new_trip_reply(self) -> BuddyPersistedGeneration:
        action = BuddyAction(
            id="start-new-trip",
            type="open_trip_hub",
            label="Create new trip",
            payload={},
        )
        reply = BuddyStructuredReply(
            summary="Let's start a fresh trip. Where to?",
            guidance="Tell me a destination, dates, party, and a one-line goal.",
            confidence_label="high",
            scope_class="in_scope_travel",
            actions=[action],
            follow_up_question="Where should we plan this new trip?",
            tool_hints=[],
            options=[],
            planning_state={
                "mode": "pretrip_create",
                "expected_answer_type": "destination",
                "next_missing_field": "destination",
            },
            trip_draft=None,
            dev_metadata=BuddyDevMetadata(
                provider="mock", model="saayro-start-new-trip", fallback_used=False
            )
            if provider_badge_enabled(self.settings)
            else None,
        )
        return BuddyPersistedGeneration(
            reply=reply, provider="mock", model="saayro-start-new-trip", fallback_used=False
        )

    def _build_no_prior_itinerary_reply(
        self, *, trip_id: str
    ) -> BuddyPersistedGeneration:
        summary = "I don't have a prior itinerary to refine. Want me to draft one first?"
        options = ["Draft an itinerary", "Cancel"]
        state: dict[str, object] = {
            "mode": "trip_bound",
            "source_trip_id": trip_id,
            "current_question": summary,
            "options": list(options),
            "expected_answer_type": "option",
        }
        reply = self._deterministic_reply(
            summary=summary,
            guidance="A clean draft gives us something to refine.",
            options=options,
            planning_state=state,
            model="saayro-no-prior-itinerary",
        )
        return BuddyPersistedGeneration(
            reply=reply,
            provider="mock",
            model="saayro-no-prior-itinerary",
            fallback_used=False,
        )

    def _deterministic_reply(
        self,
        *,
        summary: str,
        guidance: str,
        options: list[str],
        planning_state: dict[str, object],
        model: str,
    ) -> BuddyStructuredReply:
        sanitized = _sanitize_options(list(options))
        state = dict(planning_state)
        state["options"] = list(sanitized)
        return BuddyStructuredReply(
            summary=summary,
            guidance=guidance,
            confidence_label="high",
            scope_class="in_scope_travel",
            actions=[],
            follow_up_question=summary,
            tool_hints=[],
            options=sanitized,
            planning_state=state,
            trip_draft=None,
            dev_metadata=BuddyDevMetadata(
                provider="mock", model=model, fallback_used=False
            )
            if provider_badge_enabled(self.settings)
            else None,
        )

    def _open_trips_index_reply(self) -> BuddyPersistedGeneration:
        action = BuddyAction(
            id="open-trips-index",
            type="open_trip_hub",
            label="Open Trip Hub",
        )
        reply = BuddyStructuredReply(
            summary="Opening Trip Hub.",
            guidance="",
            confidence_label="high",
            scope_class="in_scope_travel",
            actions=[action],
            follow_up_question=None,
            tool_hints=[],
            options=[],
            planning_state={"mode": "general"},
            trip_draft=None,
            dev_metadata=BuddyDevMetadata(
                provider="mock", model="saayro-open-trips", fallback_used=False
            )
            if provider_badge_enabled(self.settings)
            else None,
        )
        return BuddyPersistedGeneration(
            reply=reply, provider="mock", model="saayro-open-trips", fallback_used=False
        )

    def _simple_ack_reply(self, summary: str) -> BuddyPersistedGeneration:
        reply = BuddyStructuredReply(
            summary=summary,
            guidance="",
            confidence_label="medium",
            scope_class="in_scope_travel",
            actions=[],
            follow_up_question=None,
            tool_hints=[],
            options=[],
            planning_state={"mode": "general"},
            trip_draft=None,
            dev_metadata=BuddyDevMetadata(
                provider="mock", model="saayro-disambiguation", fallback_used=False
            )
            if provider_badge_enabled(self.settings)
            else None,
        )
        return BuddyPersistedGeneration(
            reply=reply, provider="mock", model="saayro-disambiguation", fallback_used=False
        )

    def _mock_reply(
        self,
        *,
        provider: str,
        model: str,
        fallback_used: bool,
        reason: str,
        message: str = "",
        prior_planning_state: dict[str, object] | None = None,
        active_turn_context: dict[str, object] | None = None,
        trip_id: str | None = None,
    ) -> BuddyPersistedGeneration:
        reply = self._build_fallback_reply(
            reason=reason,
            message=message,
            prior_planning_state=prior_planning_state or {},
            active_turn_context=active_turn_context or {},
        )
        if trip_id is not None and reply.actions:
            reply = reply.model_copy(
                update={"actions": _enrich_actions_with_trip_id(reply.actions, trip_id)}
            )
        reply = reply.model_copy(
            update={
                "dev_metadata": BuddyDevMetadata(
                    provider=provider, model=model, fallback_used=fallback_used
                )
                if provider_badge_enabled(self.settings)
                else None,
            }
        )
        return BuddyPersistedGeneration(
            reply=reply, provider=provider, model=model, fallback_used=fallback_used
        )

    def _build_fallback_reply(
        self,
        *,
        reason: str,
        message: str,
        prior_planning_state: dict[str, object],
        active_turn_context: dict[str, object],
    ) -> BuddyStructuredReply:
        active_options_raw = active_turn_context.get("options")
        active_options: list[str] = (
            [o for o in active_options_raw if isinstance(o, str)]
            if isinstance(active_options_raw, list)
            else []
        )

        expected_raw = prior_planning_state.get("expected_answer_type") if prior_planning_state else None
        if not isinstance(expected_raw, str):
            expected_raw = active_turn_context.get("expected_answer_type")
        expected = expected_raw if isinstance(expected_raw, str) else None

        if expected in {"dates", "party", "overview", "destination"}:
            return self._fallback_expected_answer_reply(
                reason=reason,
                expected=expected,
                prior_planning_state=prior_planning_state,
                active_options=active_options,
            )

        if active_options:
            return self._fallback_continuation_reply(
                reason=reason,
                prior_planning_state=prior_planning_state,
                active_turn_context=active_turn_context,
                active_options=active_options,
            )

        destination = extract_requested_destination(message) if message else None
        if destination:
            days = extract_trip_length_days(message)
            outline = get_outline(destination, days)
            if outline is not None:
                return self._fallback_outline_reply(
                    reason=reason,
                    destination=destination,
                    days=days,
                    outline=outline,
                    prior_planning_state=prior_planning_state,
                )

        return self._fallback_generic_reply(
            reason=reason,
            prior_planning_state=prior_planning_state,
        )

    def _fallback_expected_answer_reply(
        self,
        *,
        reason: str,
        expected: str,
        prior_planning_state: dict[str, object],
        active_options: list[str],
    ) -> BuddyStructuredReply:
        state: dict[str, object] = dict(prior_planning_state)
        destination_raw = state.get("destination_city")
        destination = destination_raw if isinstance(destination_raw, str) and destination_raw else None
        dest_label = destination or "your trip"

        if expected == "dates":
            days_raw = state.get("requested_days")
            days = days_raw if isinstance(days_raw, int) else None
            sanitized_active = _sanitize_options(list(active_options))
            has_custom = any("custom dates" in o.casefold() for o in sanitized_active)
            base_options = sanitized_active if sanitized_active else _future_date_options(date.today(), days)
            if not has_custom:
                base_options = list(base_options) + ["Let me pick custom dates"]
            summary = (
                f"Saayro fallback — I still have your {dest_label} trip draft. "
                "Pick a future date window or type an ISO range like 2026-05-10 to 2026-05-13."
            )
            question = f"Which dates should I use for {dest_label}?"
            state["mode"] = "awaiting_dates"
            state["current_question"] = question
            state["options"] = list(base_options)
            state["expected_answer_type"] = "dates"
            state["next_missing_field"] = "dates"
            return BuddyStructuredReply(
                summary=summary,
                guidance="Your destination, party, and overview stay saved while I re-ask for dates.",
                confidence_label="low",
                scope_class="in_scope_travel",
                actions=[],
                follow_up_question=question,
                tool_hints=[ToolHint(tool="provider_fallback", reason=reason)],
                options=list(base_options),
                planning_state=state,
                trip_draft=None,
            )

        if expected == "party":
            options = ["solo", "couple", "family", "friends"]
            summary = (
                f"Saayro fallback — keeping your {dest_label} draft intact. "
                "Who is travelling?"
            )
            question = f"Who is travelling on the {dest_label} trip?"
            state["mode"] = "awaiting_party"
            state["current_question"] = question
            state["options"] = list(options)
            state["expected_answer_type"] = "party"
            state["next_missing_field"] = "party"
            return BuddyStructuredReply(
                summary=summary,
                guidance="Destination and dates stay saved while I re-ask for the party.",
                confidence_label="low",
                scope_class="in_scope_travel",
                actions=[],
                follow_up_question=question,
                tool_hints=[ToolHint(tool="provider_fallback", reason=reason)],
                options=options,
                planning_state=state,
                trip_draft=None,
            )

        if expected == "overview":
            options = [
                "Relaxed with nature and local food",
                "Cultural sights and markets",
                "Adventure and outdoors",
                "A mix of everything",
            ]
            summary = (
                f"Saayro fallback — {dest_label} draft is saved. "
                "Give me one line on what this trip is about."
            )
            question = f"How should this {dest_label} trip feel — what's the vibe or focus?"
            state["mode"] = "awaiting_overview"
            state["current_question"] = question
            state["options"] = list(options)
            state["expected_answer_type"] = "overview"
            state["next_missing_field"] = "overview"
            return BuddyStructuredReply(
                summary=summary,
                guidance="Destination, dates, and party stay saved while I re-ask for the overview.",
                confidence_label="low",
                scope_class="in_scope_travel",
                actions=[],
                follow_up_question=question,
                tool_hints=[ToolHint(tool="provider_fallback", reason=reason)],
                options=options,
                planning_state=state,
                trip_draft=None,
            )

        options = ["Goa", "Manali", "Udaipur", "Jaipur", "Coorg", "Rishikesh"]
        question = "Which destination should we anchor this trip to?"
        state["mode"] = "pretrip_create"
        state["current_question"] = question
        state["options"] = list(options)
        state["expected_answer_type"] = "destination"
        state["next_missing_field"] = "destination"
        return BuddyStructuredReply(
            summary="Saayro fallback — live AI is unavailable right now. Pick a destination to anchor the plan.",
            guidance="I can outline Goa, Manali, Udaipur, Jaipur, Coorg, or Rishikesh immediately.",
            confidence_label="low",
            scope_class="in_scope_travel",
            actions=[],
            follow_up_question=question,
            tool_hints=[ToolHint(tool="provider_fallback", reason=reason)],
            options=options,
            planning_state=state,
            trip_draft=None,
        )

    def _fallback_outline_reply(
        self,
        *,
        reason: str,
        destination: str,
        days: int | None,
        outline: list[str],
        prior_planning_state: dict[str, object],
    ) -> BuddyStructuredReply:
        day_count = days or len(outline)
        header = (
            "Saayro fallback plan — live AI is unavailable right now, "
            "but here is a practical starting outline."
        )
        guidance = "\n".join(outline)
        state: dict[str, object] = dict(prior_planning_state)
        state["mode"] = "fallback_outline"
        state["requested_destination"] = destination
        state["current_question"] = f"Want to lock this as {day_count} days, or adjust the length?"
        options = ["Refine pace", "Change duration", "Pick a different destination"]
        state["options"] = list(options)
        return BuddyStructuredReply(
            summary=header,
            guidance=guidance,
            confidence_label="low",
            scope_class="in_scope_travel",
            actions=[],
            follow_up_question=f"Want to lock this as {day_count} days, or adjust the length?",
            tool_hints=[ToolHint(tool="provider_fallback", reason=reason)],
            options=options,
            planning_state=state,
            trip_draft=None,
        )

    def _fallback_continuation_reply(
        self,
        *,
        reason: str,
        prior_planning_state: dict[str, object],
        active_turn_context: dict[str, object],
        active_options: list[str],
    ) -> BuddyStructuredReply:
        state: dict[str, object] = dict(prior_planning_state)
        prior_mode = active_turn_context.get("mode")
        if isinstance(prior_mode, str):
            state["mode"] = prior_mode
        requested = active_turn_context.get("requested_destination")
        if isinstance(requested, str):
            state["requested_destination"] = requested
        existing_match = active_turn_context.get("existing_trip_match")
        if isinstance(existing_match, dict):
            state["existing_trip_match"] = existing_match
        current_question_raw = active_turn_context.get("current_question")
        question = (
            current_question_raw
            if isinstance(current_question_raw, str) and current_question_raw
            else "Live AI is momentarily unavailable — which of these should I go with?"
        )
        sanitized = _sanitize_options(list(active_options))
        state["current_question"] = question
        state["options"] = list(sanitized)
        return BuddyStructuredReply(
            summary="Saayro fallback — live AI paused for a moment; your planning context is preserved.",
            guidance="Pick one of the options below so we keep moving without losing what we've collected.",
            confidence_label="low",
            scope_class="in_scope_travel",
            actions=[],
            follow_up_question=question,
            tool_hints=[ToolHint(tool="provider_fallback", reason=reason)],
            options=list(sanitized),
            planning_state=state,
            trip_draft=None,
        )

    def _fallback_generic_reply(
        self,
        *,
        reason: str,
        prior_planning_state: dict[str, object],
    ) -> BuddyStructuredReply:
        state: dict[str, object] = dict(prior_planning_state)
        state.setdefault("mode", "fallback_generic")
        options = [
            "Goa",
            "Manali",
            "Udaipur",
            "Jaipur",
            "Coorg",
            "Rishikesh",
        ]
        question = "Which destination should I outline while the live model path is unavailable?"
        state["current_question"] = question
        state["options"] = list(options)
        return BuddyStructuredReply(
            summary=(
                "Saayro fallback — live AI is unavailable right now. "
                "Pick a destination and I'll sketch a practical starting outline."
            ),
            guidance="I can outline Goa, Manali, Udaipur, Jaipur, Coorg, or Rishikesh immediately without the live model.",
            confidence_label="low",
            scope_class="in_scope_travel",
            actions=[],
            follow_up_question=question,
            tool_hints=[ToolHint(tool="provider_fallback", reason=reason)],
            options=options,
            planning_state=state,
            trip_draft=None,
        )


def build_buddy_orchestrator(settings: Settings) -> BuddyOrchestrator:
    return BuddyOrchestrator(settings)
