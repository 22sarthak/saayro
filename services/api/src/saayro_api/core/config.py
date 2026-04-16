from __future__ import annotations

from functools import lru_cache
from typing import Annotated, Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SAAYRO_API_", env_file=".env", extra="ignore")

    app_name: str = "Saayro API"
    app_version: str = "0.1.0"
    env: Literal["development", "test", "staging", "production"] = "development"
    debug: bool = False
    host: str = "127.0.0.1"
    port: int = 8000
    prefix: str = "/v1"
    database_url: str = "postgresql+asyncpg://postgres:postgres@127.0.0.1:5433/saayro"
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://localhost:8081"]
    )
    demo_user_email: str = "demo@saayro.app"
    demo_user_name: str = "Aarohi Mehta"
    auth_session_cookie_name: str = "saayro_session"
    auth_session_ttl_hours: int = 24 * 14
    auth_refresh_ttl_hours: int = 24 * 30
    auth_cookie_secure: bool = False
    auth_google_web_client_id: str = ""
    auth_google_mobile_client_ids: Annotated[list[str], NoDecode] = Field(default_factory=list)
    otp_enabled: bool = False
    otp_provider: str = "provider-ready"
    web_app_url: str = "http://localhost:3000"
    google_connector_client_id: str = ""
    google_connector_client_secret: str = ""
    google_connector_redirect_uri: str = "http://127.0.0.1:8000/v1/connections/google/callback"
    google_connector_state_secret: str = "change-me"
    google_connector_gmail_scope: str = "https://www.googleapis.com/auth/gmail.readonly"
    google_connector_calendar_scope: str = "https://www.googleapis.com/auth/calendar.events.readonly"
    google_connector_auth_url: str = "https://accounts.google.com/o/oauth2/v2/auth"
    google_connector_token_url: str = "https://oauth2.googleapis.com/token"
    google_connector_sync_window_days: int = 365
    ai_enabled: bool = True
    ai_provider: Literal["auto", "gemini", "ollama", "mock"] = "auto"
    ai_gemini_api_key: str = ""
    ai_gemini_model: str = "gemini-2.5-flash"
    ai_gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta"
    ai_ollama_base_url: str = "http://127.0.0.1:11434"
    ai_ollama_model: str = "llama3"
    ai_timeout_seconds: float = 20.0
    ai_dev_provider_badge: bool = True

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @field_validator("auth_google_mobile_client_ids", mode="before")
    @classmethod
    def split_mobile_client_ids(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @property
    def database_backend(self) -> str:
        return self.database_url.split("://", maxsplit=1)[0]


@lru_cache
def get_settings() -> Settings:
    return Settings()
