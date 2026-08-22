"""Best-effort outbound notifications to the operator's own n8n instance.

n8n only ever receives events Pulse already decided to send — it's a place to
build extra branching (Slack/SMS, booking links, review requests) without more
Python, not a decision-maker. It never sees anyone compliance.py hasn't
already cleared, and delivery failures never block the caller.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

import httpx

from app.core.http_retry import retry_transient

logger = logging.getLogger("pulse.n8n")

_TIMEOUT = httpx.Timeout(10.0, connect=5.0)
_HEADERS = {"Content-Type": "application/json"}

# The reset button's source of truth: same file an owner would otherwise
# import by hand (infra/n8n/README.md). Only reachable from a local checkout
# — fine, since N8N_BASE_URL/N8N_API_KEY are unset in production anyway (n8n
# isn't deployed there), so reset_recovery_workflow() never gets this far.
_RECOVERY_WORKFLOW_NAME = "Pulse — post-recovery review request"
_RECOVERY_WORKFLOW_TEMPLATE = (
    Path(__file__).resolve().parents[3] / "infra" / "n8n" / "recovery-review-request.json"
)


async def notify(
    webhook_url: str,
    event: str,
    payload: dict,
    http_client: httpx.AsyncClient | None = None,
) -> bool:
    """POST {"event": ..., **payload} to an n8n webhook URL. Never raises.

    Serializes with default=str rather than httpx's json= — call sites build
    these payloads from ORM rows and dataclasses, and a stray UUID/datetime/
    Decimal (customer.id, sent_at, ...) would otherwise raise TypeError before
    a single byte goes out, defeating "never raises" for the one caller that
    forgot to stringify a field. Stringifying here covers every caller, once.
    """
    if not webhook_url:
        return False
    body = json.dumps(
        {"event": event, **payload}, default=str, separators=(",", ":")
    ).encode()

    @retry_transient
    async def _post() -> httpx.Response:
        if http_client is not None:
            response = await http_client.post(webhook_url, content=body, headers=_HEADERS)
        else:
            async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
                response = await client.post(webhook_url, content=body, headers=_HEADERS)
        response.raise_for_status()
        return response

    try:
        await _post()
    except httpx.HTTPError:
        logger.warning("n8n webhook delivery failed (event=%s)", event, exc_info=True)
        return False
    return True


class N8nAdminError(Exception):
    """The reset-workflow request couldn't be completed. Unlike notify(), this
    one is meant to surface — it's a person clicking a button, not a
    fire-and-forget trigger, so swallowing the error would just hide it."""


async def reset_recovery_workflow(
    base_url: str, api_key: str, http_client: httpx.AsyncClient | None = None
) -> str:
    """Overwrite the live "Pulse — post-recovery review request" n8n workflow
    with the shipped template — the escape hatch for "I broke it messing with
    the n8n editor". Returns the workflow's edit URL on success.
    """
    if not base_url or not api_key:
        raise N8nAdminError("n8n admin API isn't configured (N8N_BASE_URL / N8N_API_KEY).")
    if not _RECOVERY_WORKFLOW_TEMPLATE.exists():
        raise N8nAdminError(
            "Workflow template not found on disk (this only works from a local checkout)."
        )
    template = json.loads(_RECOVERY_WORKFLOW_TEMPLATE.read_text())

    api_base = base_url.rstrip("/") + "/api/v1"
    headers = {"X-N8N-API-KEY": api_key}
    owns_client = http_client is None
    client = http_client or httpx.AsyncClient(timeout=_TIMEOUT, headers=headers)
    try:
        try:
            list_resp = await client.get(f"{api_base}/workflows", headers=headers)
            list_resp.raise_for_status()
            match = next(
                (
                    w
                    for w in list_resp.json().get("data", [])
                    if w.get("name") == _RECOVERY_WORKFLOW_NAME
                ),
                None,
            )
            if match is None:
                raise N8nAdminError(
                    f'No "{_RECOVERY_WORKFLOW_NAME}" workflow found in n8n — import it once first '
                    "(see infra/n8n/README.md)."
                )
            workflow_id = match["id"]
            put_resp = await client.put(
                f"{api_base}/workflows/{workflow_id}",
                headers=headers,
                json={
                    "name": template["name"],
                    "nodes": template["nodes"],
                    "connections": template["connections"],
                    "settings": match.get("settings") or {},
                },
            )
            put_resp.raise_for_status()
        except httpx.HTTPError as exc:
            raise N8nAdminError(f"n8n admin API request failed: {exc}") from exc
    finally:
        if owns_client:
            await client.aclose()
    return f"{base_url.rstrip('/')}/workflow/{workflow_id}"
