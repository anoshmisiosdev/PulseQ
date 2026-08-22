"""The one place LLM ("AAM") calls happen — AWS Bedrock first, everything else
is a fallback.

Bedrock (Claude via the `bedrock_chat_model` inference profile — same account
and boto3 credential chain `rag/embeddings.py` already uses) is tried on every
call. If it's unreachable (no AWS credentials in this environment, throttled,
region issue), we fall back to Token Router — an LLM gateway speaking whichever
wire protocol it exposes (`TOKEN_ROUTER_PROTOCOL`): OpenAI-style
``/chat/completions`` (default) or Anthropic-style ``/messages``. If neither is
available we fall back to calling Anthropic directly, so local dev without AWS
credentials still works.

Callers get a single coroutine, :func:`complete_text`, and never import a vendor
SDK. ``LLMError`` signals "couldn't get a completion from anything" so callers
degrade (e.g. to a static template) instead of crashing.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from functools import lru_cache

import boto3
import httpx
from botocore.config import Config

from app.core.config import settings
from app.core.http_retry import retry_transient

logger = logging.getLogger("pulse.llm")

# 30s was tight enough that a long-form generation timed out on its first
# attempt every time, doubling latency and burning a call before the retry
# succeeded. Callers still degrade to a static template if this is exceeded.
_TIMEOUT = httpx.Timeout(90.0, connect=10.0)
_FENCE_RE = re.compile(r"^\s*```(?:json)?\s*|\s*```\s*$", re.IGNORECASE)


class LLMError(Exception):
    """Raised when no completion could be obtained from the router/provider."""


def extract_json_object(raw: str) -> dict:
    """Pull a JSON object out of a model response.

    Models wrap JSON in markdown fences and pad it with commentary however
    firmly you ask them not to, so strip the fence and fall back to the
    outermost ``{...}``. Raises ValueError when there is nothing usable, which
    is the caller's signal to retry once and then use a static template.
    """
    text = raw.strip()
    if text.startswith("```"):
        text = _FENCE_RE.sub("", text).strip()
    if not text.startswith("{"):
        start, end = text.find("{"), text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise ValueError("no JSON object found in model output")
        text = text[start : end + 1]

    data = json.loads(text)  # raises ValueError on malformed JSON
    if not isinstance(data, dict):
        raise ValueError("model output was not a JSON object")
    return data


@lru_cache(maxsize=1)
def _bedrock_client():
    return boto3.client(
        "bedrock-runtime",
        region_name=settings.bedrock_region,
        config=Config(connect_timeout=10, read_timeout=90, retries={"max_attempts": 2}),
    )


def _invoke_bedrock(system: str, user: str, max_tokens: int) -> str:
    response = _bedrock_client().converse(
        modelId=settings.bedrock_chat_model,
        system=[{"text": system}],
        messages=[{"role": "user", "content": [{"text": user}]}],
        inferenceConfig={"maxTokens": max_tokens},
    )
    try:
        blocks = response["output"]["message"]["content"]
        return "".join(b["text"] for b in blocks if "text" in b)
    except (KeyError, TypeError) as exc:
        raise LLMError(f"Unexpected Bedrock converse response: {response}") from exc


async def _call_bedrock(system: str, user: str, max_tokens: int) -> str:
    return await asyncio.to_thread(_invoke_bedrock, system, user, max_tokens)


def _base_url() -> str:
    return settings.token_router_base_url.rstrip("/")


@retry_transient
async def _post_json(url: str, headers: dict, payload: dict) -> dict:
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.post(url, headers=headers, json=payload)
        resp.raise_for_status()
        return resp.json()


async def _call_openai_compatible(system: str, user: str, max_tokens: int) -> str:
    url = f"{_base_url()}/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.token_router_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.token_router_model,
        "max_tokens": max_tokens,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }
    data = await _post_json(url, headers, payload)
    try:
        return data["choices"][0]["message"]["content"] or ""
    except (KeyError, IndexError, TypeError) as exc:
        raise LLMError(f"Unexpected Token Router (openai) response: {data}") from exc


async def _call_anthropic_compatible(system: str, user: str, max_tokens: int) -> str:
    url = f"{_base_url()}/messages"
    headers = {
        "x-api-key": settings.token_router_api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.token_router_model,
        "max_tokens": max_tokens,
        "system": system,
        "messages": [{"role": "user", "content": user}],
    }
    data = await _post_json(url, headers, payload)
    try:
        return "".join(b.get("text", "") for b in data["content"] if b.get("type") == "text")
    except (KeyError, TypeError) as exc:
        raise LLMError(f"Unexpected Token Router (anthropic) response: {data}") from exc


async def _call_anthropic_direct(system: str, user: str, max_tokens: int) -> str:
    try:
        from anthropic import AsyncAnthropic
    except ImportError as exc:
        raise LLMError("anthropic SDK not installed and no Token Router configured") from exc
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    resp = await client.messages.create(
        model=settings.anthropic_model,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return "".join(b.text for b in resp.content if getattr(b, "type", None) == "text")


async def complete_text(system: str, user: str, max_tokens: int = 700) -> str:
    """Return raw model text. Tries Bedrock first, then Token Router, then
    direct Anthropic. Raises LLMError only once nothing worked."""
    errors: list[str] = []

    try:
        return await _call_bedrock(system, user, max_tokens)
    except LLMError as exc:
        errors.append(f"Bedrock: {exc}")
    except Exception as exc:  # botocore: NoCredentialsError, ClientError, etc.
        errors.append(f"Bedrock: {type(exc).__name__}: {exc}")
    logger.warning("Bedrock unavailable (%s) — falling back", errors[-1])

    if settings.token_router_api_key and settings.token_router_base_url:
        try:
            if settings.token_router_protocol == "anthropic":
                return await _call_anthropic_compatible(system, user, max_tokens)
            return await _call_openai_compatible(system, user, max_tokens)
        except httpx.HTTPError as exc:
            # Include the exception type: a ReadTimeout stringifies to "", which
            # makes a timeout indistinguishable from a silent failure in the log.
            errors.append(f"Token Router: {type(exc).__name__}: {exc}")
            logger.warning("Token Router unavailable (%s) — falling back", errors[-1])

    if settings.anthropic_api_key:
        logger.warning("Falling back to direct Anthropic")
        return await _call_anthropic_direct(system, user, max_tokens)

    raise LLMError(f"No LLM available. Tried: {'; '.join(errors) or 'nothing configured'}")


def active_model() -> str | None:
    """The model id that will be used, for logging/provenance. Bedrock is
    attempted on every call regardless of what this reports — this is a
    best-effort label for logs, not a guarantee (Bedrock falls back silently
    per-call if AWS credentials aren't available in this environment)."""
    if settings.bedrock_chat_model:
        return settings.bedrock_chat_model
    if settings.token_router_api_key and settings.token_router_base_url:
        return settings.token_router_model
    if settings.anthropic_api_key:
        return settings.anthropic_model
    return None
