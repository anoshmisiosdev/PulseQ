"""n8n.notify: best-effort, never raises, no-ops on an unconfigured URL."""

from __future__ import annotations

import httpx
import pytest

from app.services import n8n


async def test_notify_is_a_noop_without_a_configured_url():
    assert await n8n.notify("", "recovery.attributed", {"a": 1}) is False


async def test_notify_posts_the_event_and_payload():
    captured = {}

    async def handler(request: httpx.Request):
        captured["body"] = request.content
        return httpx.Response(200)

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        ok = await n8n.notify(
            "https://n8n.example/hook",
            "recovery.attributed",
            {"customer_id": "c1"},
            http_client=client,
        )

    assert ok is True
    assert b'"event":"recovery.attributed"' in captured["body"]
    assert b'"customer_id":"c1"' in captured["body"]


async def test_notify_swallows_delivery_failures():
    async def handler(_request):
        return httpx.Response(500)

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        ok = await n8n.notify(
            "https://n8n.example/hook", "recovery.attributed", {}, http_client=client
        )

    assert ok is False


# ── reset_recovery_workflow: unlike notify(), this one is meant to raise ────


async def test_reset_recovery_workflow_requires_config():
    with pytest.raises(n8n.N8nAdminError, match="not configured|isn't configured"):
        await n8n.reset_recovery_workflow("", "")


async def test_reset_recovery_workflow_requires_a_prior_import():
    async def handler(_request):
        return httpx.Response(200, json={"data": []})  # no matching workflow

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        with pytest.raises(n8n.N8nAdminError, match="import it once first"):
            await n8n.reset_recovery_workflow(
                "http://localhost:5678", "test-key", http_client=client
            )


async def test_reset_recovery_workflow_overwrites_the_matching_workflow():
    put_calls = []

    async def handler(request: httpx.Request):
        if request.method == "GET":
            return httpx.Response(
                200,
                json={
                    "data": [
                        {"id": "wf1", "name": "Pulse — post-recovery review request"},
                        {"id": "wf2", "name": "Some other workflow"},
                    ]
                },
            )
        put_calls.append(request)
        return httpx.Response(200, json={"id": "wf1"})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        url = await n8n.reset_recovery_workflow(
            "http://localhost:5678/", "test-key", http_client=client
        )

    assert url == "http://localhost:5678/workflow/wf1"
    assert len(put_calls) == 1
    assert put_calls[0].url.path.endswith("/workflows/wf1")


async def test_reset_recovery_workflow_wraps_http_errors():
    async def handler(_request):
        return httpx.Response(500)

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        with pytest.raises(n8n.N8nAdminError, match="admin API request failed"):
            await n8n.reset_recovery_workflow(
                "http://localhost:5678", "test-key", http_client=client
            )
