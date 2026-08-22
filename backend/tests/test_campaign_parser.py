"""Defensive parsing of model output — the send pipeline must never block on it."""

from __future__ import annotations

import json

import pytest

from app.campaigns import generator
from app.campaigns.generator import (
    SMS_MAX_CHARS,
    CampaignContext,
    GeneratedCopy,
    _parse_batch_json,
    generate_campaigns_batch,
    parse_model_json,
)


def test_clean_email_json():
    copy = parse_model_json('{"subject": "We miss you", "body": "Come back!"}', "email")
    assert copy.subject == "We miss you"
    assert copy.body == "Come back!"


def test_strips_markdown_fences():
    raw = '```json\n{"subject": "Hi", "body": "Hello there"}\n```'
    copy = parse_model_json(raw, "email")
    assert copy.subject == "Hi"
    assert copy.body == "Hello there"


def test_salvages_json_wrapped_in_prose():
    raw = 'Sure! Here you go:\n{"body": "Reply STOP to opt out"}\nHope that helps.'
    copy = parse_model_json(raw, "sms")
    assert copy.body == "Reply STOP to opt out"


def test_sms_is_truncated_to_limit():
    long_body = "x" * 500
    copy = parse_model_json(f'{{"body": "{long_body}"}}', "sms")
    assert len(copy.body) == SMS_MAX_CHARS


def test_email_missing_subject_raises():
    with pytest.raises(ValueError):
        parse_model_json('{"body": "no subject here"}', "email")


def test_missing_body_raises():
    with pytest.raises(ValueError):
        parse_model_json('{"subject": "only subject"}', "email")


def test_malformed_json_raises():
    with pytest.raises(ValueError):
        parse_model_json("not json at all", "sms")


def test_non_object_json_raises():
    with pytest.raises(ValueError):
        parse_model_json("[1, 2, 3]", "sms")


# ── batch parsing (generate_campaigns_batch) ──────────────────────────────


def test_batch_parses_items_in_order():
    raw = json.dumps(
        {
            "items": [
                {"id": 0, "subject": "Hi Alice", "body": "Come back, Alice!"},
                {"id": 1, "subject": "Hi Bob", "body": "Come back, Bob!"},
            ]
        }
    )
    results = _parse_batch_json(raw, "email", 2)
    assert [r.subject for r in results] == ["Hi Alice", "Hi Bob"]
    assert [r.body for r in results] == ["Come back, Alice!", "Come back, Bob!"]


def test_batch_handles_out_of_order_ids():
    raw = json.dumps(
        {
            "items": [
                {"id": 1, "body": "second"},
                {"id": 0, "body": "first"},
            ]
        }
    )
    results = _parse_batch_json(raw, "sms", 2)
    assert results[0].body == "first"
    assert results[1].body == "second"


def test_batch_leaves_missing_or_malformed_items_as_none():
    raw = json.dumps({"items": [{"id": 0, "body": "only this one"}]})
    results = _parse_batch_json(raw, "sms", 3)
    assert results[0].body == "only this one"
    assert results[1] is None
    assert results[2] is None


def test_batch_missing_items_array_raises():
    with pytest.raises(ValueError):
        _parse_batch_json('{"not_items": []}', "sms", 2)


def _ctx(name: str, channel: str = "email") -> CampaignContext:
    return CampaignContext(
        business_name="Hayward Coffee Co.",
        business_type="cafe",
        customer_name=name,
        channel=channel,
    )


async def test_generate_campaigns_batch_assigns_copy_to_the_right_customer(monkeypatch):
    monkeypatch.setattr(generator.settings, "anthropic_api_key", "test-key")

    async def fake_complete_text(system: str, user: str, max_tokens: int) -> str:
        return json.dumps(
            {
                "items": [
                    {"id": 0, "subject": "For Alice", "body": "body-alice"},
                    {"id": 1, "subject": "For Bob", "body": "body-bob"},
                ]
            }
        )

    monkeypatch.setattr(generator, "complete_text", fake_complete_text)

    results = await generate_campaigns_batch([_ctx("Alice"), _ctx("Bob")])
    assert results[0].subject == "For Alice"
    assert results[1].subject == "For Bob"


async def test_generate_campaigns_batch_falls_back_per_customer_on_bad_json(monkeypatch):
    monkeypatch.setattr(generator.settings, "anthropic_api_key", "test-key")

    async def fake_complete_text(system: str, user: str, max_tokens: int) -> str:
        return "not json at all"

    monkeypatch.setattr(generator, "complete_text", fake_complete_text)

    results = await generate_campaigns_batch([_ctx("Alice"), _ctx("Bob")])
    # Batch parsing failed for both attempts, then each customer fell back to
    # generate_campaign individually — which also can't parse "not json at
    # all" and degrades to the static template, but critically still returns
    # one real GeneratedCopy per customer rather than dropping anyone.
    assert len(results) == 2
    assert all(isinstance(r, GeneratedCopy) for r in results)
    assert all(r.generated_by == "fallback" for r in results)


async def test_generate_campaigns_batch_single_context_skips_batching(monkeypatch):
    """One eligible customer takes the same single-call path as before —
    batching only kicks in for 2+."""
    calls: list[int] = []

    async def fake_complete_text(system: str, user: str, max_tokens: int) -> str:
        calls.append(1)
        return json.dumps({"subject": "Hi", "body": "body"})

    monkeypatch.setattr(generator.settings, "anthropic_api_key", "test-key")
    monkeypatch.setattr(generator, "complete_text", fake_complete_text)

    results = await generate_campaigns_batch([_ctx("Solo")])
    assert len(results) == 1
    assert results[0].subject == "Hi"
    assert len(calls) == 1
