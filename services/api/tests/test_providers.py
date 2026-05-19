from __future__ import annotations

import json
from typing import Any

import httpx
import pytest

from saayro_api.ai.orchestrator import BuddyOrchestrator
from saayro_api.ai.providers.groq import GroqProvider
from saayro_api.ai.providers.ollama_cloud import OllamaCloudProvider
from saayro_api.ai.types import BuddyProviderRequest, BuddyUserContext, SaayroBuddyContext
from saayro_api.core.config import Settings
from saayro_api.core.errors import ApiException


VALID_REPLY_JSON = json.dumps(
    {
        "summary": "Sample summary.",
        "guidance": "Sample guidance.",
        "confidence_label": "medium",
        "scope_class": "in_scope_travel",
        "actions": [],
        "follow_up_question": None,
        "tool_hints": [],
        "options": [],
        "planning_state": {},
    }
)


def _build_request() -> BuddyProviderRequest:
    context = SaayroBuddyContext(
        user=BuddyUserContext(user_id="u1", full_name="Tester", email="t@x.com"),
    )
    return BuddyProviderRequest(
        message="Plan a 3 day trip to Goa.",
        context=context,
        scope_class="in_scope_travel",
        conversation_history=[],
        planning_state={},
    )


class _FakeResponse:
    def __init__(self, status_code: int, payload: dict[str, Any] | str) -> None:
        self.status_code = status_code
        self._payload = payload
        self.text = json.dumps(payload) if isinstance(payload, dict) else payload

    def json(self) -> Any:
        if isinstance(self._payload, dict):
            return self._payload
        return json.loads(self._payload)


class _FakeAsyncClient:
    def __init__(self, *, responses: list[_FakeResponse] | None = None, exc: Exception | None = None) -> None:
        self._responses = list(responses or [])
        self._exc = exc
        self.calls: list[dict[str, Any]] = []

    async def __aenter__(self) -> "_FakeAsyncClient":
        return self

    async def __aexit__(self, *args: Any) -> None:
        return None

    async def post(self, url: str, *, json: dict[str, Any] | None = None, headers: dict[str, str] | None = None) -> _FakeResponse:
        self.calls.append({"url": url, "json": json, "headers": headers or {}})
        if self._exc is not None:
            raise self._exc
        if not self._responses:
            raise AssertionError("No fake response queued.")
        return self._responses.pop(0)


def _install_client(monkeypatch: pytest.MonkeyPatch, module_path: str, fake: _FakeAsyncClient) -> None:
    def _factory(*args: Any, **kwargs: Any) -> _FakeAsyncClient:
        return fake

    monkeypatch.setattr(f"{module_path}.httpx.AsyncClient", _factory)


async def test_groq_success_returns_structured_reply(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = _FakeAsyncClient(
        responses=[_FakeResponse(200, {"choices": [{"message": {"content": VALID_REPLY_JSON}}]})]
    )
    _install_client(monkeypatch, "saayro_api.ai.providers.groq", fake)

    provider = GroqProvider(
        api_key="k",
        model_name="llama-3.3-70b-versatile",
        fallback_model="llama-3.1-8b-instant",
        timeout_seconds=5.0,
        base_url="https://api.groq.com/openai/v1",
    )
    result = await provider.generate(_build_request())

    assert result.provider == "Groq"
    assert result.model == "llama-3.3-70b-versatile"
    assert fake.calls[0]["url"] == "https://api.groq.com/openai/v1/chat/completions"
    assert fake.calls[0]["headers"]["Authorization"] == "Bearer k"


async def test_groq_retries_fallback_model_on_400(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = _FakeAsyncClient(
        responses=[
            _FakeResponse(400, {"error": "model not supported"}),
            _FakeResponse(200, {"choices": [{"message": {"content": VALID_REPLY_JSON}}]}),
        ]
    )
    _install_client(monkeypatch, "saayro_api.ai.providers.groq", fake)

    provider = GroqProvider(
        api_key="k",
        model_name="primary",
        fallback_model="backup",
        timeout_seconds=5.0,
        base_url="https://api.groq.com/openai/v1",
    )
    result = await provider.generate(_build_request())

    assert result.model == "backup"
    assert len(fake.calls) == 2
    assert fake.calls[0]["json"]["model"] == "primary"
    assert fake.calls[1]["json"]["model"] == "backup"


async def test_groq_rate_limited_does_not_retry_fallback(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = _FakeAsyncClient(
        responses=[_FakeResponse(429, {"error": "rate limited"})]
    )
    _install_client(monkeypatch, "saayro_api.ai.providers.groq", fake)

    provider = GroqProvider(
        api_key="k",
        model_name="primary",
        fallback_model="backup",
        timeout_seconds=5.0,
        base_url="https://api.groq.com/openai/v1",
    )

    with pytest.raises(ApiException) as exc_info:
        await provider.generate(_build_request())

    assert exc_info.value.code == "groq_rate_limited"
    assert len(fake.calls) == 1


async def test_groq_auth_error_on_401(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = _FakeAsyncClient(
        responses=[_FakeResponse(401, {"error": "bad key"})]
    )
    _install_client(monkeypatch, "saayro_api.ai.providers.groq", fake)

    provider = GroqProvider(
        api_key="k",
        model_name="primary",
        fallback_model="backup",
        timeout_seconds=5.0,
        base_url="https://api.groq.com/openai/v1",
    )

    with pytest.raises(ApiException) as exc_info:
        await provider.generate(_build_request())

    assert exc_info.value.code == "groq_auth_error"


async def test_groq_missing_api_key_raises_auth_error() -> None:
    provider = GroqProvider(
        api_key="",
        model_name="primary",
        fallback_model="backup",
        timeout_seconds=5.0,
        base_url="https://api.groq.com/openai/v1",
    )

    with pytest.raises(ApiException) as exc_info:
        await provider.generate(_build_request())

    assert exc_info.value.code == "groq_auth_error"


async def test_ollama_cloud_sends_bearer_header_and_generate_url(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = _FakeAsyncClient(
        responses=[_FakeResponse(200, {"response": VALID_REPLY_JSON})]
    )
    _install_client(monkeypatch, "saayro_api.ai.providers.ollama_cloud", fake)

    provider = OllamaCloudProvider(
        api_key="secret",
        model_name="gpt-oss:120b-cloud",
        timeout_seconds=5.0,
        base_url="https://ollama.com/api",
    )
    result = await provider.generate(_build_request())

    assert result.provider == "Ollama Cloud"
    assert fake.calls[0]["headers"]["Authorization"] == "Bearer secret"
    assert fake.calls[0]["url"] == "https://ollama.com/api/generate"


async def test_ollama_cloud_without_api_suffix_appends_api_generate(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = _FakeAsyncClient(
        responses=[_FakeResponse(200, {"response": VALID_REPLY_JSON})]
    )
    _install_client(monkeypatch, "saayro_api.ai.providers.ollama_cloud", fake)

    provider = OllamaCloudProvider(
        api_key="secret",
        model_name="m",
        timeout_seconds=5.0,
        base_url="https://ollama.com",
    )
    await provider.generate(_build_request())

    assert fake.calls[0]["url"] == "https://ollama.com/api/generate"


async def test_ollama_cloud_read_timeout_classified(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = _FakeAsyncClient(exc=httpx.ReadTimeout("boom"))
    _install_client(monkeypatch, "saayro_api.ai.providers.ollama_cloud", fake)

    provider = OllamaCloudProvider(
        api_key="secret",
        model_name="m",
        timeout_seconds=5.0,
        base_url="https://ollama.com/api",
    )

    with pytest.raises(ApiException) as exc_info:
        await provider.generate(_build_request())

    assert exc_info.value.code == "ollama_cloud_timeout"


def _settings(**overrides: Any) -> Settings:
    base: dict[str, Any] = {
        "ai_provider": "auto",
        "ai_gemini_api_key": "",
        "ai_groq_api_key": "",
        "ai_ollama_cloud_enabled": False,
        "ai_ollama_cloud_api_key": "",
        "ai_ollama_local_enabled": False,
    }
    base.update(overrides)
    return Settings(**base)


def test_provider_order_auto_chain_skips_unconfigured() -> None:
    settings = _settings(
        ai_gemini_api_key="g",
        ai_groq_api_key="q",
        ai_ollama_cloud_enabled=True,
        ai_ollama_cloud_api_key="c",
        ai_ollama_local_enabled=False,
    )
    chain = BuddyOrchestrator(settings)._provider_order()

    names = [p.provider_name for p in chain]
    assert names == ["Gemini", "Groq", "Ollama Cloud"]


def test_ollama_local_disabled_skipped_in_provider_order() -> None:
    settings = _settings(
        ai_gemini_api_key="g",
        ai_groq_api_key="q",
        ai_ollama_local_enabled=False,
    )
    chain = BuddyOrchestrator(settings)._provider_order()

    names = [p.provider_name for p in chain]
    assert "Ollama Local" not in names


def test_provider_order_mock_returns_empty_chain() -> None:
    settings = _settings(ai_provider="mock", ai_gemini_api_key="g")
    chain = BuddyOrchestrator(settings)._provider_order()

    assert chain == []
