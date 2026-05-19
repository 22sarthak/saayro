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


class OllamaCloudProvider:
    provider_name = "Ollama Cloud"

    def __init__(
        self, *, api_key: str, model_name: str, timeout_seconds: float, base_url: str
    ) -> None:
        self.api_key = api_key
        self.model_name = model_name
        self.timeout_seconds = timeout_seconds
        self.base_url = base_url.rstrip("/")

    def _generate_url(self) -> str:
        if self.base_url.endswith("/api"):
            return f"{self.base_url}/generate"
        return f"{self.base_url}/api/generate"

    async def generate(self, request: BuddyProviderRequest) -> BuddyProviderResponse:
        if not self.api_key:
            raise ApiException(
                status_code=503,
                code="ollama_cloud_auth_error",
                message="Ollama Cloud API key missing.",
                retryable=False,
            )

        payload = {
            "model": self.model_name,
            "prompt": f"{build_system_prompt()}\n\n{build_provider_prompt(request)}",
            "stream": False,
            "format": "json",
            "options": {"temperature": 0.3},
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(self._generate_url(), json=payload, headers=headers)
        except httpx.HTTPError as exc:
            raise classify_transport_error(provider="ollama_cloud", exc=exc) from exc

        if response.status_code >= 400:
            raise classify_http_error(
                provider="ollama_cloud",
                status_code=response.status_code,
                body_snippet=response.text,
            )

        try:
            data = response.json()
            reply = BuddyStructuredReply.model_validate(
                parse_structured_reply(data.get("response", "{}"))
            )
        except Exception as exc:  # noqa: BLE001
            raise classify_schema_error(provider="ollama_cloud", exc=exc) from exc

        return BuddyProviderResponse(reply=reply, provider=self.provider_name, model=self.model_name)
