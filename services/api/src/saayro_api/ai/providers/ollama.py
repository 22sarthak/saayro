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


class OllamaLocalProvider:
    provider_name = "Ollama Local"

    def __init__(self, *, model_name: str, timeout_seconds: float, base_url: str) -> None:
        self.model_name = model_name
        self.timeout_seconds = timeout_seconds
        self.base_url = base_url.rstrip("/")

    async def generate(self, request: BuddyProviderRequest) -> BuddyProviderResponse:
        payload = {
            "model": self.model_name,
            "prompt": f"{build_system_prompt()}\n\n{build_provider_prompt(request)}",
            "stream": False,
            "format": "json",
            "options": {"temperature": 0.3},
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(f"{self.base_url}/api/generate", json=payload)
        except httpx.HTTPError as exc:
            raise classify_transport_error(provider="ollama_local", exc=exc) from exc

        if response.status_code >= 400:
            raise classify_http_error(
                provider="ollama_local",
                status_code=response.status_code,
                body_snippet=response.text,
            )

        try:
            data = response.json()
            reply = BuddyStructuredReply.model_validate(
                parse_structured_reply(data.get("response", "{}"))
            )
        except Exception as exc:  # noqa: BLE001
            raise classify_schema_error(provider="ollama_local", exc=exc) from exc

        return BuddyProviderResponse(reply=reply, provider=self.provider_name, model=self.model_name)
