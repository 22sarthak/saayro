from __future__ import annotations

from typing import Protocol

from saayro_api.ai.types import BuddyProviderRequest, BuddyProviderResponse


class AIProvider(Protocol):
    provider_name: str
    model_name: str

    async def generate(self, request: BuddyProviderRequest) -> BuddyProviderResponse:
        ...
