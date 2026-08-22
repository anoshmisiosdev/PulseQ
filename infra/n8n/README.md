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

Once logged in: **Workflows → Import from File** → pick
`infra/n8n/recovery-review-request.json`. It's a starter:
`Webhook → wait 2 days → send review-request email`. Open the "Send review
request" node and point its SMTP credentials at whatever you send mail
through (Resend supports SMTP), and drop in your actual Google/Yelp review
link. Activate the workflow, then copy the webhook's **Production URL**
(Webhook node → "Production URL", looks like
`http://localhost:5678/webhook/pulse-recovery`).

## Wire it into Pulse

```bash
# .env
N8N_RECOVERY_WEBHOOK_URL=http://localhost:5678/webhook/pulse-recovery
```

That's it locally — `attribution.detect_recoveries()` already fires
`n8n.notify(settings.n8n_recovery_webhook_url, "recovery.attributed", {...})`
whenever a `RecoveryAttribution` is written (see `app/services/attribution.py`).

For production: add `N8N_RECOVERY_WEBHOOK_URL` to
`infra/aws/push-env-to-ssm.sh`'s `SECRET_KEYS`, push it, then add it to the
ECS task definition's `secrets` block (same pattern as
`GOOGLE_MAPS_SERVER_API_KEY`) — and self-host n8n somewhere reachable from
there (an ECS task of its own, or n8n.cloud if you'd rather not run it). Not
done yet — do it when this flow is actually going live, not before.

## What's scoped but not built

Each of these is the same shape (Pulse fires a webhook, n8n branches) — build
one at a time, only when it's an actual priority:

| Use case | Pulse trigger point | Payload |
|---|---|---|
| Approvals via Slack/SMS | `CampaignSend` created in `suggest`/`approve` mode, still `pending` | send id, customer, draft/empty body |
| Compound automation triggers | `RiskScore` row written (append-only log) | customer id, band, score, reasons |
| Long-tail integrations (Mindbody, etc.) | n8n → new endpoint shaped like `integrations/base.py::DataSourceAdapter` | third-party data, normalized by n8n |
| Ops alerting | failed `SyncRun` row | sync type, error, business id |
| Two-way customer replies | new: Twilio/Resend inbound webhook | raw inbound message |
| Booking handoff | customer clicks a "book again" link | customer id, offer |

Building all six now would be scaffolding for demand that doesn't exist yet —
the review-request flow above is the one with zero compliance surface and an
immediate, obvious payoff, so it's the one that's real.
