from __future__ import annotations

import json

import httpx

from saayro_api.ai.prompts import build_provider_prompt, build_system_prompt
from saayro_api.ai.types import BuddyProviderRequest, BuddyProviderResponse, BuddyStructuredReply
from saayro_api.core.errors import ApiException


class OllamaProvider:
    provider_name = "Ollama"

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
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            response = await client.post(f"{self.base_url}/api/generate", json=payload)
        if response.status_code >= 400:
            raise ApiException(
                status_code=503,
                code="provider_unavailable",
                message=f"Ollama request failed with status {response.status_code}.",
                retryable=response.status_code in {408, 429, 500, 502, 503, 504},
            )
        data = response.json()
        reply = BuddyStructuredReply.model_validate(json.loads(data.get("response", "{}")))
        return BuddyProviderResponse(reply=reply, provider=self.provider_name, model=self.model_name)
