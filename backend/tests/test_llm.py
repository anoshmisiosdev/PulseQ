"""The Bedrock-first fallback chain in app.core.llm.complete_text — no real
AWS credentials needed here, the provider calls are mocked at the module
boundary (same pattern app/api/*.py tests use for complete_text itself)."""

from __future__ import annotations

import pytest

from app.core import llm
from app.core.llm import LLMError, active_model, complete_text


@pytest.fixture(autouse=True)
def _no_providers_configured(monkeypatch):
    """Baseline: nothing configured. Each test opts specific providers back in."""
    monkeypatch.setattr(llm.settings, "token_router_api_key", "")
    monkeypatch.setattr(llm.settings, "token_router_base_url", "")
    monkeypatch.setattr(llm.settings, "anthropic_api_key", "")


async def test_bedrock_success_short_circuits_everything_else(monkeypatch):
    async def fake_bedrock(system, user, max_tokens):
        return "from bedrock"

    async def fail(*a, **k):
        raise AssertionError("should not be called — Bedrock already succeeded")

    monkeypatch.setattr(llm, "_call_bedrock", fake_bedrock)
    monkeypatch.setattr(llm, "_call_openai_compatible", fail)
    monkeypatch.setattr(llm, "_call_anthropic_direct", fail)

    assert await complete_text("sys", "user") == "from bedrock"


async def test_bedrock_failure_falls_back_to_token_router(monkeypatch):
    async def bedrock_down(system, user, max_tokens):
        raise RuntimeError("NoCredentialsError")

    async def fake_router(system, user, max_tokens):
        return "from token router"

    monkeypatch.setattr(llm, "_call_bedrock", bedrock_down)
    monkeypatch.setattr(llm.settings, "token_router_api_key", "key")
    monkeypatch.setattr(llm.settings, "token_router_base_url", "https://router.example")
    monkeypatch.setattr(llm.settings, "token_router_protocol", "openai")
    monkeypatch.setattr(llm, "_call_openai_compatible", fake_router)

    assert await complete_text("sys", "user") == "from token router"


async def test_bedrock_and_router_failure_falls_back_to_anthropic_direct(monkeypatch):
    async def bedrock_down(system, user, max_tokens):
        raise RuntimeError("bedrock down")

    async def fake_anthropic(system, user, max_tokens):
        return "from anthropic direct"

    monkeypatch.setattr(llm, "_call_bedrock", bedrock_down)
    monkeypatch.setattr(llm.settings, "anthropic_api_key", "key")
    monkeypatch.setattr(llm, "_call_anthropic_direct", fake_anthropic)

    assert await complete_text("sys", "user") == "from anthropic direct"


async def test_nothing_available_raises_llm_error(monkeypatch):
    async def bedrock_down(system, user, max_tokens):
        raise RuntimeError("bedrock down")

    monkeypatch.setattr(llm, "_call_bedrock", bedrock_down)

    with pytest.raises(LLMError):
        await complete_text("sys", "user")


def test_active_model_reports_bedrock_by_default():
    assert active_model() == llm.settings.bedrock_chat_model
