from __future__ import annotations

from saayro_api.ai.types import BuddyScopeDecision, ScopeClass

SENSITIVE_KEYWORDS = {
    "medical",
    "medicine",
    "doctor",
    "visa",
    "immigration",
    "police",
    "arrest",
    "lawsuit",
    "legal",
    "unsafe",
    "danger",
    "emergency",
}
TRAVEL_KEYWORDS = {
    "trip",
    "travel",
    "itinerary",
    "hotel",
    "stay",
    "flight",
    "train",
    "bus",
    "maps",
    "route",
    "export",
    "saved",
    "buddy",
    "day",
    "food",
    "restaurant",
    "destination",
    "jaipur",
    "goa",
    "delhi",
}
PARTIAL_KEYWORDS = {
    "weather",
    "packing",
    "budget",
    "schedule",
    "timing",
    "translation",
    "language",
    "currency",
}
OUT_OF_SCOPE_KEYWORDS = {
    "stock",
    "crypto",
    "code",
    "programming",
    "resume",
    "relationship",
    "therapy",
    "homework",
    "math",
}


def classify_buddy_scope(message: str) -> BuddyScopeDecision:
    lowered = message.casefold()
    words = {word.strip(".,!?") for word in lowered.split()}

    if words & SENSITIVE_KEYWORDS:
        return BuddyScopeDecision(scope_class="sensitive_high_risk", reason="Sensitive or high-risk topic detected.")
    if words & OUT_OF_SCOPE_KEYWORDS:
        return BuddyScopeDecision(scope_class="out_of_scope", reason="Request is outside Saayro travel scope.")
    if words & TRAVEL_KEYWORDS:
        return BuddyScopeDecision(scope_class="in_scope_travel", reason="Travel-specific request detected.")
    if words & PARTIAL_KEYWORDS:
        return BuddyScopeDecision(scope_class="partially_related", reason="Travel-adjacent request detected.")
    if "?" in message and any(token in lowered for token in ("plan", "route", "where", "when")):
        return BuddyScopeDecision(scope_class="partially_related", reason="General question with possible travel relevance.")
    return BuddyScopeDecision(scope_class="out_of_scope", reason="No travel-specific signal found.")


def make_guardrail_summary(scope_class: ScopeClass) -> tuple[str, str]:
    mapping = {
        "in_scope_travel": (
            "Here is the clearest next travel move based on your trip.",
            "I kept this scoped to your itinerary, discovery, handoff, and export decisions.",
        ),
        "partially_related": (
            "I can help if we anchor this to your trip.",
            "Share the destination, day, or travel decision you want to improve and I will keep it practical.",
        ),
        "out_of_scope": (
            "I stay focused on Saayro travel support.",
            "If you want, I can turn this into a trip question such as itinerary pacing, route planning, saved places, or export prep.",
        ),
        "sensitive_high_risk": (
            "I can offer travel-oriented guidance, but this needs careful confirmation.",
            "For safety, legal, medical, or policy-sensitive issues, please verify with official or qualified sources before acting.",
        ),
    }
    return mapping[scope_class]
