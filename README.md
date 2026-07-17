# StateOfFinances — Phase 1 (Backend)

## What's where

```
budget-tracker/
  migrations/001_init.sql              - schema + seed categories
  bridge/server.js                     - n8n <-> OpenClaw bridge (runs as a systemd --user service)
  bridge/.env.example                  - template; real .env lives only on the server, gitignored
  n8n-workflows/*.json                 - the 5 workflows (secret-free: credential IDs only)
  openclaw-skill/budget-capture/       - mirror of the live OpenClaw skill (see below)
  infra/budget-bridge.service          - the systemd unit, for reference/redeploy
  infra/docker-compose.budget-db.snippet.yml  - the service block added to n8n's compose file
  README.md                            - this file
```

This repo is a **mirror for redeployment**, not the live source of truth — the actually
running skill lives at `~/.openclaw/workspace/skills/budget-capture/` on the server (with
its own `.env` and `node_modules`, neither committed here). If you ever need to rebuild
this from scratch, see "Redeploying from this repo" below.

Postgres runs as a new `budget-db` container alongside the existing n8n/second-brain
stack (`~/n8n-automation/docker-compose.yml` on the server) — nothing existing was
touched, only added to (see `infra/docker-compose.budget-db.snippet.yml` for the exact
block).

## How the pieces tie together

**Categories** are the budget's backbone. Each has a `type`:
- `true_fixed` — Rent, Electricity, Debt, etc. Deducted off the top every month.
- `recurring_variable` — Groceries, Petrol, Sigarettes. Regular but not a fixed amount.
- `flexible` — anything else (created on the fly when you log something new).

Each category carries `keyword_hints` (e.g. Groceries has `checkers`, `woolworths`, ...).
Classification is keyword-first (`categories.keyword_hints`/`name` matched against the
transaction text) and only falls back to a model call when nothing matches. A category
has an `active` flag (added beyond the original spec) so you can retire one without
losing its transaction history — the "≥15 active categories" hard rule in the skill
reads off this flag.

**Transactions** are the ledger — every logged spend, linked to a `category_id` (nullable:
a transaction can land uncategorized if classification wasn't confident, with a note
showing the suggested category so you can fix it later).

**Income** rows get created *empty* (`confirmed_zar IS NULL`) by the "Income
Confirmation" workflow on the 7th/25th, as a marker that a confirmation is pending. Your
next Telegram reply that's just a number gets picked up by "Telegram Intake" as the
answer to *that* pending row, not as a new transaction. This is also why there's only
ever one Telegram bot and one webhook — see "Why one bot, one webhook" below.

**Budgets** are the output of "Weekly Budget Calc": for each remaining week in the
month, `income_total`→ minus 10% savings, 5% slush, true_fixed total → split evenly
across the weeks left → each week's slice split again into a weekday pool
(`weekly_budget`) and a 20%-of-that weekend pool (`weekend_budget`), tracked separately.
"Daily Cron" and "Weekend Check-in" both read against the current week's row
(`week_number = CEIL(day of month / 7)`).

## Re-running the weekly calc manually

Either:
- In n8n, open **Budget - Weekly Budget Calc** and hit "Execute Workflow" — it recomputes
  off whatever's currently in `income`/`categories` and upserts the remaining weeks of
  the month (safe to re-run any time, it's an upsert on `(month, week_number)`).
- Or trigger it from the CLI without touching n8n's UI:
  ```bash
  curl -X POST http://localhost:5678/webhook-test/... # not wired — see note below
  ```
  There's no standalone webhook for this one by design (spec only asked for
  trigger-on-income-confirm + weekly Monday schedule) — use n8n's manual "Execute
  Workflow" button, or temporarily add a Webhook node if you want it callable from
  outside n8n too.

## Live status (as of 2026-07-17)

All 5 workflows are imported, credentialed, and **active**. End to end:

- **Bridge reachability**: fixed — `sudo ufw allow from 172.18.0.0/16 to any port 8790 proto tcp`
  was applied, confirmed working from inside the n8n container.
- **Public webhook**: n8n's `WEBHOOK_URL` (`~/n8n-automation/docker-compose.yml`) points at
  a **Tailscale Funnel** (`https://mrrobot-server.tail15a3bc.ts.net/`), not a cloudflared
  quick tunnel — this one doesn't rot on restart. Funnel was enabled with
  `tailscale funnel --bg 5678` after a one-time tailnet-level enable + `tailscale set
  --operator=$USER` (so future changes don't need sudo either). If this box ever gets
  rebooted and the tailnet funnel config is somehow lost, re-run that one command — no
  tailnet re-approval needed, that part persists.
- **Telegram bot**: your dedicated bot (from BotFather) is wired in as the `Budget
  Telegram Bot` credential; its webhook is registered against the Funnel URL.
- **Credentials**: created via the n8n API — `Budget Postgres`, `Budget Telegram Bot`,
  `Budget Bridge Token` — all three referenced correctly in the workflow JSON (real
  credential IDs, not placeholders).
- **`BUDGET_OWNER_CHAT_ID`**: set to your chat ID (`7257153261`) in the n8n compose env.

Nothing left to configure — text or photo your bot to log a transaction. 7th/25th it'll
ask for your ZAR amount; confirming that kicks off the weekly recalc automatically.
Saturdays → weekend pool report. 07:00 daily → full summary.

If you ever need to redo any of the credentials (e.g. bot token rotated), see
`~/budget-tracker/bridge/.env` and `~/n8n-automation/.env` for the underlying secrets —
they're not duplicated anywhere else.

## Boot resilience (survives a power failure / reboot)

Audited 2026-07-17 — everything needed was already correctly configured, nothing had to
be changed:

| Component | Mechanism | Status |
|---|---|---|
| `budget-db`, `n8n-router` containers | Docker `restart: unless-stopped` | ✓ |
| Docker daemon itself | `systemctl is-enabled docker` | ✓ enabled |
| `budget-bridge.service` | `systemctl --user enable` | ✓ enabled |
| systemd user services survive reboot without login | `loginctl` linger for `mrrobot` | ✓ already `Linger=yes` |
| `ufw` (bridge firewall rule) | `systemctl is-enabled ufw` | ✓ enabled, rule persists in `/etc/ufw` |
| `tailscaled` + Funnel config | `systemctl is-enabled tailscaled` | ✓ enabled; Funnel/serve config is stored in tailscaled's own state and reasserts automatically when the daemon starts |

Nothing to do here unless one of those services is ever manually disabled. If Funnel
ever stops responding after a reboot, `tailscale funnel status` first — if it shows
nothing, re-run `tailscale funnel --bg 5678` (no tailnet re-approval needed, that part
is permanent).

## Redeploying from this repo (fresh server)

1. `psql`/`docker exec ... psql` the target Postgres with `migrations/001_init.sql`.
2. Copy `openclaw-skill/budget-capture/` to `~/.openclaw/workspace/skills/budget-capture/`
   on the target box, copy `.env.example` to `.env` and fill in real values, then
   `npm install` inside it (needs `pg`).
3. Copy `bridge/` next to it (e.g. `~/budget-tracker/bridge/`), same `.env.example` →
   `.env` treatment, then install `infra/budget-bridge.service` under
   `~/.config/systemd/user/` and `systemctl --user enable --now budget-bridge.service`
   (make sure `loginctl enable-linger <user>` is set so it survives reboots without an
   active login).
4. Open the bridge port from the n8n container's docker bridge subnet only — see
   `infra/docker-compose.budget-db.snippet.yml`'s comments for the exact `ufw` rule.
5. Add the `budget-db` service from that same snippet file into the target n8n
   `docker-compose.yml`, set `BUDGET_DB_PASSWORD` in its `.env`, `docker compose up -d`.
6. Import `n8n-workflows/*.json` via `n8n import:workflow` (or the UI), recreate the 3
   credentials (`Budget Postgres`, `Budget Telegram Bot`, `Budget Bridge Token`), set
   `BUDGET_OWNER_CHAT_ID`, activate all 5.
7. Point `WEBHOOK_URL` at a stable public HTTPS endpoint (a Tailscale Funnel, as used
   here, or your own reverse proxy) — a cloudflared *quick* tunnel will NOT survive
   restarts.

## Notes / deliberate deviations from the literal spec

- Added `categories.active boolean` — needed to make the "don't suggest a new category
  past 15 active ones" rule mean anything (otherwise there's no way to retire one).
- "Telegram Intake" is the **only** Telegram Trigger/webhook across all 5 workflows —
  income-confirmation replies are routed inside it (checked against a pending `income`
  row), not via a second trigger, because Telegram only allows one active
  webhook/poller per bot token.
- The OpenClaw skill (`budget-capture`) is the actual implementation of OCR +
  classification — the bridge is a thin, token-authenticated HTTP shim so n8n (which
  runs in Docker, isolated from the host) can reach it. Both paths call the exact same
  scripts, so conversational OpenClaw use and n8n-triggered use behave identically.
