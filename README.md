# StateOfFinances

Personal budget tracker, driven entirely through Telegram, with a read-only web
dashboard. Phase 1 (backend) and Phase 2 (dashboard) are both live.

Income lands in USD twice a month (variable ~25th, fixed $550 on the 7th) and gets
manually confirmed in ZAR. Spending is captured by texting the bot or sending it a
receipt photo — no bank integration, everything is manual/photo entry by design.

## How it works

```
                        ┌────────────────────────────────────────────────┐
  Telegram bot          │ n8n (Docker, port 5678)                        │
  (dedicated token) ───▶│  Telegram Intake ──┬─ income reply → income    │
   via Tailscale Funnel │                    ├─ photo → OCR → classify   │
                        │                    ├─ text+amount → classify   │
                        │                    └─ anything else → chat     │
                        │  Income Confirmation (7th/25th prompt)         │
                        │  Weekly Budget Calc (Mon + on income confirm)  │
                        │  Daily Cron (07:00 summary)                    │
                        │  Weekend Check-in (Sat 08:00)                  │
                        └───────────┬────────────────────┬───────────────┘
                                    │ SQL                │ HTTP + token
                             ┌──────▼──────┐   ┌─────────▼──────────────┐
                             │ Postgres    │   │ budget-bridge (host,   │
                             │ budget-db   │   │ 172.18.0.1:8790)       │
                             │ :5434       │   │  /ocr /classify /chat  │
                             └─────────────┘   │  /confirm-category     │
                                               └─────────┬──────────────┘
                                                         │ CLI
                                               ┌─────────▼──────────────┐
                                               │ OpenClaw (host)        │
                                               │  budget-capture skill  │
                                               │  + main agent (chat)   │
                                               │  OpenAI via OAuth      │
                                               └────────────────────────┘
```

### Message routing (Telegram Intake)

Every message you send the bot goes through one router, in priority order:

1. **Income reply** — if there's a pending income row (no `confirmed_zar` yet) and your
   message is just a number (e.g. `9500` or `R9500`), it's taken as the ZAR amount for
   that payday, and the weekly budget recalc fires automatically.
2. **Photo** — downloaded, OCR'd (amount/vendor/date), classified. If OCR can't find an
   amount you're asked to type it instead. If classification isn't confident, it's
   logged uncategorized and you're asked which category it belongs to.
3. **Text containing an amount** (e.g. `petrol engen 250`) — treated as a transaction:
   classified (keyword match first, LLM fallback), inserted, confirmed back to you.
4. **Anything else** — routed to the OpenClaw **main agent** as normal chat. You can ask
   questions, give instructions, or just talk; replies come back through the bot.
   Conversation state is kept per chat (session key `agent:main:budget-telegram-<chatid>`).

### Data model

- **categories** — `true_fixed` (Rent, Electricity, Water, Internet, Debt, Minette,
  Subscriptions), `recurring_variable` (Groceries, Petrol, Sigarettes), `flexible`
  (created on demand). Each has `keyword_hints` used for classification; confirmed
  matches append new hints so the system learns your vendors. An `active` flag lets you
  retire categories without losing history. Hard cap: at 15 active categories the
  classifier will never propose a new one, only the closest existing match.
- **transactions** — the ledger. `category_id` is nullable: an unconfident
  classification logs the spend as uncategorized with the suggested category in `note`.
- **income** — one row per payday. Created *empty* by the Income Confirmation workflow
  (7th fixed / 25th variable) as a "pending" marker; your numeric reply fills in
  `confirmed_zar`.
- **budgets** — one row per (month, week): income minus 10% savings, 5% slush, and the
  `true_fixed` total, split across the weeks left in the month, each week carved into a
  weekday pool and a 20% weekend pool.

### Scheduled workflows

| Workflow | When | What |
|---|---|---|
| Income Confirmation | 08:00 on the 7th & 25th | Inserts pending income row, asks you what ZAR landed |
| Weekly Budget Calc | Mondays 08:00 + when income is confirmed | (Re)computes remaining weeks' budgets, messages you the split |
| Daily Cron | 07:00 daily | Week-to-date spend by category, weekday/weekend pools remaining |
| Weekend Check-in | Saturdays 08:00 | Weekend pool spent/remaining |

All times Africa/Johannesburg.

## Repo layout

```
migrations/001_init.sql              - schema + seed categories
migrations/002_goals.sql             - goals table (Phase 2 dashboard)
migrations/003_auth.sql              - Auth.js (@auth/pg-adapter) tables (Phase 2 dashboard)
bridge/server.js                     - host HTTP shim: /ocr /classify /chat /confirm-category
bridge/.env.example                  - template; real .env lives only on the server
n8n-workflows/*.json                 - the 5 workflows (credential IDs only, no secrets)
openclaw-skill/budget-capture/       - OCR + classification skill (mirror of the live copy)
infra/budget-bridge.service          - systemd --user unit for the bridge
infra/docker-compose.budget-db.snippet.yml - the compose block added for budget-db
web/                                 - Phase 2 dashboard (Next.js) — see web/README.md
```

This repo is a mirror for redeployment; the live skill runs from
`~/.openclaw/workspace/skills/budget-capture/` on the server. Deploy key
`~/.ssh/id_stateoffinances` pushes here.

## Operations

- **Re-run the weekly calc manually**: open *Budget - Weekly Budget Calc* in n8n and hit
  "Execute Workflow". Safe to re-run anytime — it upserts on `(month, week_number)`.
- **Retire a category**: `UPDATE categories SET active = false WHERE name = '...';`
  (via `docker exec n8n-automation-budget-db-1 psql -U budget_app -d budget_tracker`).
- **Check the bridge**: `systemctl --user status budget-bridge`, logs via
  `journalctl --user -u budget-bridge`.
- **Check webhook exposure**: `tailscale funnel status` — should show port 443 → 5678.
  If empty after some catastrophe: `tailscale funnel --bg 5678`.
- **Boot resilience** (audited 2026-07-17): docker + ufw + tailscaled enabled at boot;
  containers `restart: unless-stopped`; `budget-bridge` is an enabled systemd --user
  service with login-lingering on — everything comes back by itself after a power cut.

## Secrets (never committed)

`~/budget-tracker/bridge/.env` (bridge token), `~/n8n-automation/.env` (DB passwords),
`~/.openclaw/workspace/skills/budget-capture/.env` (skill's DB access). The n8n
credentials (`Budget Postgres`, `Budget Telegram Bot`, `Budget Bridge Token`) live in
n8n's own encrypted store.

## Redeploying from this repo (fresh server)

1. Apply `migrations/001_init.sql` to a Postgres 16 database `budget_tracker`.
2. Copy `openclaw-skill/budget-capture/` to `~/.openclaw/workspace/skills/`, create its
   `.env` from the example, `npm install` inside it.
3. Copy `bridge/` somewhere stable, create `.env` from the example, install
   `infra/budget-bridge.service` under `~/.config/systemd/user/`, enable it, and make
   sure `loginctl enable-linger <user>` is set.
4. Allow the n8n container's subnet to reach the bridge port
   (`sudo ufw allow from <docker-subnet> to any port 8790 proto tcp`).
5. Add the `budget-db` block from `infra/docker-compose.budget-db.snippet.yml` to the
   n8n compose stack; set `BUDGET_DB_PASSWORD`.
6. Import `n8n-workflows/*.json`, recreate the 3 credentials, set
   `BUDGET_OWNER_CHAT_ID` in n8n's environment, activate all 5.
7. Point n8n's `WEBHOOK_URL` at a stable public HTTPS endpoint (Tailscale Funnel here);
   a cloudflared *quick* tunnel will not survive restarts.

## Phase 2 — Dashboard

Read-only mobile-first web app at **https://mrrobot-server.tail15a3bc.ts.net:8443**
(separate Tailscale Funnel port from n8n, which stays on 443). Two pages:

- **`/` Overview** — greeting header, top categories this period as thumbnails, a
  gradient balance hero card (all-time running balance, this-period spend/profit, all
  with odometer digit-roll animation), a time-range pill switcher (Daily/Weekly/
  Monthly/Yearly — re-queries via URL params, no client-side fetching), a donut +
  ranked list category breakdown for the selected range, and a Goals section (progress
  rings replaced with icon + target + percentage, matching the reference design more
  than the original "rings" text spec).
- **`/transactions`** — search + category filter chips, grouped by day
  (Today/Yesterday/date), same colored category avatars as the Overview list.

Auth is a single allowed email via Auth.js magic-link (Resend) — no open sign-up, no
CRUD (matches the "read-only for now" brief). See `web/README.md` for setup, env vars,
and the architecture notes (why auth is split into two configs, the `pg` Date-object
gotcha, etc — worth reading before touching `lib/auth.ts` or `lib/queries.ts`).

Added two migrations for this: `goals` (no goals existed in the Phase 1 schema — this
was flagged and confirmed with Lucian before adding, rather than inventing something
during a build) and the standard `@auth/pg-adapter` auth tables.

Built on a `feature/dashboard-frontend` branch per the handoff doc's instruction — not
yet merged to `main`.

## What's next (roadmap)

- Merge `feature/dashboard-frontend` to `main` once reviewed.
- Candidate backlog: CRUD (edit/recategorize transactions, manage goals from the UI
  instead of psql), recategorize-by-reply for uncategorized transactions, monthly
  close-out report, savings/slush tracking over time, export.

## Patch notes

### 2026-07-17 — v0.4.1
- Real `RESEND_API_KEY` dropped in (was a placeholder in v0.4) — magic-link sign-in is
  actually live now, not just wired up.

### 2026-07-17 — v0.4 "the dashboard"
- Phase 2 web dashboard built: Next.js 14 App Router + TS + Tailwind, Auth.js v5
  magic-link (Resend) gated to a single allowed email, Overview + Transactions pages
  matching the provided design tokens and reference mockup.
- Added `goals` table (confirmed with Lucian first — no goals concept existed in
  Phase 1) and the standard Auth.js Postgres-adapter tables.
- **Fixed during build, before it ever shipped broken**: middleware pulled in `pg` via
  the full auth config, which doesn't run on Next's Edge runtime — split into an
  Edge-safe `auth.config.ts` (JWT strategy, no adapter/providers) for middleware and a
  full `auth.ts` (adapter + Resend provider) for server components/routes. Also caught
  that `pg` returns `DATE` columns as JS `Date` objects, not strings — normalized once
  at the query boundary instead of leaving it to break `Date` parsing downstream.
- Dockerized (`output: standalone`, multi-stage build), added as `budget-web` service
  in the shared compose stack (joins `budget-db`'s network), exposed via a **second**
  Tailscale Funnel on port 8443 so it doesn't collide with n8n's on 443.
- Verified against the real database end-to-end (build, start, hit real balance/
  transaction/goal data, confirm auth actually redirects) before considering it done.

### 2026-07-17 — v0.3 "it actually talks back"
- **Chat mode**: messages that aren't income replies, photos, or amounts now route to
  the OpenClaw main agent via a new bridge `/chat` endpoint — the bot holds a real
  conversation instead of erroring. Per-chat session memory.
- **Fixed**: texts without an amount (e.g. "Hey") were force-parsed as transactions and
  crashed on the NOT NULL `amount` column — no reply, nothing logged. Now they chat.
- **Fixed**: photo path could crash the same way when OCR found no amount — now it asks
  you to type the amount instead.
- **Removed** the "sent automatically with n8n" footer from every bot message.
- Verified end-to-end: chat reply and `petrol engen 250` → R250 under Petrol, both
  through the real webhook.

### 2026-07-17 — v0.2 "unsticking the intake"
- **Fixed**: every incoming message silently died after the pending-income lookup —
  Postgres returning zero rows halts an n8n branch. `alwaysOutputData` + a hardened
  pending-row check fixed intake for all message types.
- Repo pushed to GitHub with a write-scoped deploy key; boot-resilience audit done.

### 2026-07-17 — v0.1 "phase 1 backend"
- Postgres schema + seeds; 5 n8n workflows; `budget-capture` OpenClaw skill (OCR +
  keyword-first classification with 15-category cap); token-authed host bridge;
  Tailscale Funnel for the webhook (replacing a dead cloudflared quick-tunnel);
  everything imported, credentialed, activated.
