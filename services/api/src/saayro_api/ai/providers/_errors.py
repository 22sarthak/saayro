from __future__ import annotations

import json
from typing import Literal

import httpx
from pydantic import ValidationError

from saayro_api.core.errors import ApiException

ProviderKey = Literal["gemini", "groq", "ollama_cloud", "ollama_local"]


def _auth_code(provider: ProviderKey) -> str:
    return f"{provider}_auth_error"


def _rate_limited_code(provider: ProviderKey) -> str:
    return f"{provider}_rate_limited"


def _timeout_code(provider: ProviderKey) -> str:
    if provider == "ollama_local":
        return "ollama_local_timeout"
    return f"{provider}_timeout"


def _schema_code(provider: ProviderKey) -> str:
    return f"{provider}_schema_error"


def _safe_reason(status_code: int, provider: ProviderKey) -> str:
    return f"{provider} request failed with status {status_code}."


def classify_http_error(
    *, provider: ProviderKey, status_code: int, body_snippet: str = ""
) -> ApiException:
    if status_code in (401, 403):
        return ApiException(
            status_code=503,
            code=_auth_code(provider),
            message=f"{provider} authentication rejected.",
            retryable=False,
        )
    if status_code == 429:
        return ApiException(
            status_code=503,
            code=_rate_limited_code(provider),
            message=f"{provider} rate limited.",
            retryable=True,
        )
    if status_code in (408, 504):
        return ApiException(
            status_code=503,
            code=_timeout_code(provider),
            message=f"{provider} upstream timeout ({status_code}).",
            retryable=True,
        )
    truncated = body_snippet[:200] if body_snippet else ""
    message = _safe_reason(status_code, provider)
    if truncated:
        message = f"{message} detail={truncated}"
    return ApiException(
        status_code=503,
        code="unknown_provider_error",
        message=message,
        retryable=status_code in {500, 502, 503},
    )


def classify_transport_error(*, provider: ProviderKey, exc: Exception) -> ApiException:
    if isinstance(exc, (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.WriteTimeout, httpx.PoolTimeout)):
        return ApiException(
            status_code=503,
            code=_timeout_code(provider),
            message=f"{provider} transport timeout.",
            retryable=True,
        )
    if isinstance(exc, httpx.ConnectError):
        if provider == "ollama_local":
            return ApiException(
                status_code=503,
                code="ollama_local_connection_error",
                message="Local Ollama unreachable.",
                retryable=True,
            )
        return ApiException(
            status_code=503,
            code=_timeout_code(provider),
            message=f"{provider} connection error.",
            retryable=True,
        )
    return ApiException(
        status_code=503,
        code="unknown_provider_error",
        message=f"{provider} transport error: {type(exc).__name__}.",
        retryable=True,
    )


def classify_schema_error(*, provider: ProviderKey, exc: Exception) -> ApiException:
    if isinstance(exc, (json.JSONDecodeError, ValidationError, KeyError, TypeError, ValueError)):
        return ApiException(
            status_code=503,
            code=_schema_code(provider),
            message=f"{provider} returned unparsable structured reply.",
            retryable=True,
        )
    return ApiException(
        status_code=503,
        code="provider_schema_error",
        message=f"{provider} schema error: {type(exc).__name__}.",
        retryable=True,
    )
