from __future__ import annotations

import httpx

from saayro_api.ai.prompts import build_provider_prompt, build_system_prompt
from saayro_api.ai.providers._errors import (
    classify_http_error,
    classify_schema_error,
    classify_transport_error,
)
from saayro_api.ai.providers._normalize import parse_structured_reply
from saayro_api.ai.types import BuddyProviderRequest, BuddyProviderResponse, BuddyStructuredReply
from saayro_api.core.errors import ApiException

_RETRY_ON_FALLBACK_STATUS = {400, 404, 422}


class GroqProvider:
    provider_name = "Groq"

    def __init__(
        self,
        *,
        api_key: str,
        model_name: str,
        fallback_model: str,
        timeout_seconds: float,
        base_url: str,
    ) -> None:
        self.api_key = api_key
        self.model_name = model_name
        self.fallback_model = fallback_model
        self.timeout_seconds = timeout_seconds
        self.base_url = base_url.rstrip("/")

    async def generate(self, request: BuddyProviderRequest) -> BuddyProviderResponse:
        if not self.api_key:
            raise ApiException(
                status_code=503,
                code="groq_auth_error",
                message="Groq API key missing.",
                retryable=False,
            )

        try:
            return await self._attempt(request, self.model_name)
        except ApiException as exc:
            if (
                self.fallback_model
                and self.fallback_model != self.model_name
                and self._is_model_specific_error(exc)
            ):
                return await self._attempt(request, self.fallback_model)
            raise

    def _is_model_specific_error(self, exc: ApiException) -> bool:
        if exc.code == "groq_schema_error":
            return True
        return exc.code == "unknown_provider_error" and any(
            str(code) in exc.message for code in _RETRY_ON_FALLBACK_STATUS
        )

    async def _attempt(self, request: BuddyProviderRequest, model_name: str) -> BuddyProviderResponse:
        url = f"{self.base_url}/chat/completions"
        payload = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": build_system_prompt()},
                {"role": "user", "content": build_provider_prompt(request)},
            ],
            "temperature": 0.3,
            "response_format": {"type": "json_object"},
            "stream": False,
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(url, json=payload, headers=headers)
        except httpx.HTTPError as exc:
            raise classify_transport_error(provider="groq", exc=exc) from exc

        if response.status_code >= 400:
            raise classify_http_error(
                provider="groq",
                status_code=response.status_code,
                body_snippet=response.text,
            )

        try:
            data = response.json()
            text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            reply = BuddyStructuredReply.model_validate(parse_structured_reply(text))
        except Exception as exc:  # noqa: BLE001
            raise classify_schema_error(provider="groq", exc=exc) from exc

        return BuddyProviderResponse(reply=reply, provider=self.provider_name, model=model_name)
