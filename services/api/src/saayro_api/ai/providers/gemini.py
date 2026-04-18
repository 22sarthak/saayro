from __future__ import annotations

import httpx

from saayro_api.ai.prompts import build_provider_prompt, build_system_prompt
from saayro_api.ai.providers._normalize import parse_structured_reply
from saayro_api.ai.types import BuddyProviderRequest, BuddyProviderResponse, BuddyStructuredReply
from saayro_api.core.errors import ApiException


class GeminiProvider:
    provider_name = "Gemini"

    def __init__(self, *, api_key: str, model_name: str, timeout_seconds: float, base_url: str) -> None:
        self.api_key = api_key
        self.model_name = model_name
        self.timeout_seconds = timeout_seconds
        self.base_url = base_url.rstrip("/")

    async def generate(self, request: BuddyProviderRequest) -> BuddyProviderResponse:
        if not self.api_key:
            raise ApiException(status_code=503, code="provider_unavailable", message="Gemini API key missing.", retryable=True)

        url = f"{self.base_url}/models/{self.model_name}:generateContent"
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": build_system_prompt()},
                        {"text": build_provider_prompt(request)},
                    ],
                }
            ],
            "generationConfig": {
                "temperature": 0.3,
                "responseMimeType": "application/json",
            },
        }
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            response = await client.post(url, params={"key": self.api_key}, json=payload)
        if response.status_code >= 400:
            raise ApiException(
                status_code=503,
                code="provider_unavailable",
                message=f"Gemini request failed with status {response.status_code}.",
                retryable=response.status_code in {408, 429, 500, 502, 503, 504},
            )
        data = response.json()
        text = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
        )
        reply = BuddyStructuredReply.model_validate(parse_structured_reply(text))
        return BuddyProviderResponse(reply=reply, provider=self.provider_name, model=self.model_name)
