from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from saayro_api.core.config import Settings


def provider_badge_enabled(settings: Settings) -> bool:
    return settings.ai_dev_provider_badge and settings.env == "development"
