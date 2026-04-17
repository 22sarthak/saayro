from __future__ import annotations

import json

from saayro_api.ai.types import BuddyProviderRequest


def build_system_prompt() -> str:
    return (
        "You are Buddy inside Saayro, a premium pan-India AI travel companion. "
        "You are travel-first, not a generic assistant. "
        "Stay within trip planning, itinerary help, discovery, organization, exports, route handoff prompts, and travel guidance. "
        "Use trip context when available. If no trip exists yet, help the traveler move from destination ideas into a real trip plan. "
        "Keep the tone calm, premium, concise, and practical. "
        "Do not claim live verification or certainty you do not have. "
        "If the user is out of scope, gently redirect back to travel context. "
        "Respond in valid JSON only with keys: summary, guidance, confidence_label, scope_class, actions, follow_up_question, tool_hints. "
        "Actions must be product-oriented and limited to itinerary_refine, open_trip_hub, review_saved_places, share_export_pack, open_in_maps, review_connected_travel. "
        "Tool hints are placeholders for future internal tools."
    )


def build_provider_prompt(request: BuddyProviderRequest) -> str:
    payload = {
        "message": request.message,
        "scope_class": request.scope_class,
        "context": request.context.model_dump(mode="json"),
    }
    return (
        "Generate a Buddy response for this Saayro request.\n"
        "Return strict JSON with the required shape and no markdown.\n"
        f"{json.dumps(payload, ensure_ascii=True)}"
    )
