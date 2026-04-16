from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SAAYRO_API_", env_file=".env", extra="ignore")

    app_name: str = "Saayro API"
    app_version: str = "0.1.0"
    env: Literal["development", "test", "staging", "production"] = "development"
    debug: bool = False
    host: str = "127.0.0.1"
    port: int = 8000
    prefix: str = "/v1"
    database_url: str = "sqlite+aiosqlite:///./saayro_api.db"
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000", "http://localhost:8081"])
    demo_user_email: str = "demo@saayro.app"
    demo_user_name: str = "Aarohi Mehta"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @property
    def database_backend(self) -> str:
        return self.database_url.split("://", maxsplit=1)[0]


@lru_cache
def get_settings() -> Settings:
    return Settings()
