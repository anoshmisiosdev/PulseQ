# n8n — customer/ops workflows for Pulse

Self-hosted via the `n8n` service in the root `docker-compose.yml` (no
n8n.cloud account, no third-party signup). Pulse only ever *notifies* n8n of
events it already decided to send — n8n never decides who's contactable.
See `app/services/n8n.py` for the guarantee: `do_not_contact` customers are
never forwarded.

## First run

```bash
docker compose up -d n8n
open http://localhost:5678
```

The first visit asks you to set an **owner account** for your local n8n
instance (email + password) — that's a one-time local setup screen, not a
third-party account. You need to complete that step yourself in the browser;
nothing here can (or should) fill in a password for you.

Once logged in: **Workflows → Import from File**, one at a time, for each
file below. Each webhook node's **Production URL** (looks like
`http://localhost:5678/webhook/<path>`) goes into `.env` as the matching
setting, then activate the workflow.

## The four that are wired and built

| File | `.env` setting | Fires from |
|---|---|---|
| `recovery-review-request.json` | `N8N_RECOVERY_WEBHOOK_URL` | `attribution.detect_recoveries()` — one `RecoveryAttribution` at a time |
| `approval-slack.json` | `N8N_APPROVAL_WEBHOOK_URL` | `automations.dispatch_automations()` — batched per rule per run |
| `band-change-compound-trigger.json` | `N8N_BAND_CHANGE_WEBHOOK_URL` | `ingest.refresh_scores()` — batched per tenant per re-score |
| `sync-failure-alert.json` | `N8N_SYNC_FAILURE_WEBHOOK_URL` | `ingest.record_sync_error()` |

All four go through `app/services/n8n.py` (best-effort, never blocks the
caller) and skip anyone with `do_not_contact` set where the payload is
customer-specific.

`recovery-review-request.json` is also gated per-business: it only fires when
the owner has flipped "Ask for a review after a win-back" on and saved a
review link, in the Automations tab. The workflow reads `{{ $json.body.
review_link }}` / `business_name` from the payload rather than a hardcoded
string — one shared workflow serving every tenant, not one per business.

Each imported workflow ends in a "Post to Slack" or "Send email" node with a
comment saying **configure credentials** — open it and point it at your own
Slack app / SMTP account. Two things intentionally *not* built:

- **Slack reply → approve.** `approval-slack.json` posts "reply APPROVE
  `<send_id>`" but nothing listens for that reply yet — closing that loop
  needs a Slack app with an Events subscription calling back into
  `POST /api/automations/sends/{id}/approve`, which is real, separate scope
  (a public HTTPS endpoint + Slack app setup), not a template tweak.
- **The compound-trigger logic itself.** `band-change-compound-trigger.json`
  ships a single `band == high` IF node as a starting point — the actual
  point of this workflow is that *you* build the multi-condition logic Pulse's
  one-band-one-channel `AutomationRule` can't express, in n8n's UI.

## Edit / reset the recovery workflow from the app

The Automations tab's review-request card shows an **"Edit workflow in n8n"**
link and a **"Reset workflow to default"** button once `N8N_BASE_URL` and
`N8N_API_KEY` are set in `.env` (both hidden if unset). The API key comes from
n8n's own UI: **Settings → n8n API → Create an API key**.

Reset calls n8n's REST API (`PUT /api/v1/workflows/{id}`) to overwrite the
**"Pulse — post-recovery review request"** workflow's nodes/connections with
`recovery-review-request.json` from this directory — the escape hatch for "I
broke it messing with the n8n editor." It doesn't touch SMTP credentials
(those live on the node, not in the JSON) and it only works from a local
checkout, since that's where the template file lives.

## For production

Add whichever `N8N_*_WEBHOOK_URL` you're using to
`infra/aws/push-env-to-ssm.sh`'s `SECRET_KEYS` (done for
`N8N_RECOVERY_WEBHOOK_URL` already; add the other three the same way when
they go live), push, then add it to the ECS task definition's `secrets` block
(same pattern as `GOOGLE_MAPS_SERVER_API_KEY`) — and self-host n8n somewhere
reachable from there (an ECS task of its own, or n8n.cloud). Not done yet —
do it when a given flow is actually going live, not before.

## What's scoped but not built

| Use case | Why it's not just another webhook |
|---|---|
| Long-tail integrations (Mindbody, etc.) | Needs n8n *pushing into* Pulse (new inbound endpoint shaped like `integrations/base.py::DataSourceAdapter`), not Pulse pushing out — and there's no concrete third-party source picked yet. Speculative until one is. |
| Two-way customer replies | Needs a new inbound Twilio/Resend webhook, and has to interact with `compliance.py`'s STOP-word handling without weakening it — a dedicated pass, not a batch add-on. |
| Booking handoff | Same shape as the above two — no chosen booking provider yet. |

Building those now would be scaffolding for demand that doesn't exist yet.
