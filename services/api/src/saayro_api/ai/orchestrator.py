from __future__ import annotations

import logging
from typing import Literal, cast

from sqlalchemy.ext.asyncio import AsyncSession

from saayro_api.ai.classification import classify_buddy_scope, make_guardrail_summary
from saayro_api.ai.config import provider_badge_enabled
from saayro_api.ai.context import build_buddy_context
from saayro_api.ai.providers.base import AIProvider
from saayro_api.ai.providers.gemini import GeminiProvider
from saayro_api.ai.providers.ollama import OllamaProvider
from saayro_api.ai.types import (
    BuddyAction,
    BuddyDevMetadata,
    BuddyPersistedGeneration,
    BuddyProviderRequest,
    BuddyStructuredReply,
    ToolHint,
)
from saayro_api.core.config import Settings
from saayro_api.core.errors import ApiException
from saayro_api.schemas.auth import SessionActor

logger = logging.getLogger(__name__)


class BuddyOrchestrator:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def generate(
        self,
        *,
        db: AsyncSession,
        actor: SessionActor,
        trip_id: str,
        message: str,
    ) -> BuddyPersistedGeneration:
        context = await build_buddy_context(db, user_id=actor.user_id, trip_id=trip_id)
        scope = classify_buddy_scope(message)
        if scope.scope_class != "in_scope_travel":
            return self._guardrail_reply(scope.scope_class)

        if not self.settings.ai_enabled:
            return self._mock_reply("mock", "saayro-mock", False, "AI is disabled in this environment.")

        request = BuddyProviderRequest(message=message, context=context, scope_class=scope.scope_class)
        provider_order = self._provider_order()
        last_error: ApiException | None = None
        for index, provider in enumerate(provider_order):
            try:
                result = await provider.generate(request)
                reply = result.reply.model_copy(
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
                )
            except ApiException as exc:
                last_error = exc
                logger.warning(
                    "Buddy provider %s failed: %s",
                    getattr(provider, "provider_name", "unknown"),
                    exc.message,
                )
                continue
            except Exception as exc:  # noqa: BLE001
                logger.exception("Unexpected Buddy provider failure: %s", exc)
                last_error = ApiException(
                    status_code=503,
                    code="provider_unavailable",
                    message="AI provider failed.",
                    retryable=True,
                )
                continue

        reason = last_error.message if last_error is not None else "AI providers unavailable."
        logger.warning("Buddy falling back to mock response: %s", reason)
        return self._mock_reply("mock", "saayro-mock", len(provider_order) > 1, reason)

    def _provider_order(self) -> list[AIProvider]:
        gemini = GeminiProvider(
            api_key=self.settings.ai_gemini_api_key,
            model_name=self.settings.ai_gemini_model,
            timeout_seconds=self.settings.ai_timeout_seconds,
            base_url=self.settings.ai_gemini_base_url,
        )
        ollama = OllamaProvider(
            model_name=self.settings.ai_ollama_model,
            timeout_seconds=self.settings.ai_timeout_seconds,
            base_url=self.settings.ai_ollama_base_url,
        )
        if self.settings.ai_provider == "gemini":
            return [gemini]
        if self.settings.ai_provider == "ollama":
            return [ollama]
        if self.settings.ai_provider == "mock":
            return []
        return [gemini, ollama]

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

    def _mock_reply(self, provider: str, model: str, fallback_used: bool, reason: str) -> BuddyPersistedGeneration:
        reply = BuddyStructuredReply(
            summary="I can still help keep the trip moving, even while the live model path is unavailable.",
            guidance="Use this as a calm fallback for itinerary refinement, exports, route handoff, or saved-place review.",
            confidence_label="medium",
            scope_class="in_scope_travel",
            actions=[
                BuddyAction(id="fallback-itinerary", type="itinerary_refine", label="Refine this itinerary"),
                BuddyAction(id="fallback-export", type="share_export_pack", label="Share Export Pack"),
            ],
            follow_up_question="Do you want to improve pacing, route handoff, or what gets shared?",
            tool_hints=[ToolHint(tool="provider_fallback", reason=reason)],
            dev_metadata=BuddyDevMetadata(provider=provider, model=model, fallback_used=fallback_used)
            if provider_badge_enabled(self.settings)
            else None,
        )
        return BuddyPersistedGeneration(reply=reply, provider=provider, model=model, fallback_used=fallback_used)


def build_buddy_orchestrator(settings: Settings) -> BuddyOrchestrator:
    return BuddyOrchestrator(settings)
