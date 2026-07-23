# StateOfFinances

Personal budget tracker, driven entirely through Telegram, with a read-only web
dashboard and a conversational "Budget Coach" AI agent. Three phases are live:

- **Phase 1 — backend**: Postgres + n8n workflows + an OpenClaw capture skill + a
  host bridge. Telegram in, structured budget data out.
- **Phase 2 — dashboard**: a read-only Next.js web app over the same database.
- **Phase 3 — advisor + agent**: a dedicated "Budget Coach" OpenClaw agent (its own
  persona, model, skills) for conversational Q&A and expense logging, plus a
  proactive weekly spend-pace check.

Income lands in USD twice a month (variable ~25th, fixed $550 on the 7th) and gets
manually confirmed in ZAR. Spending is captured by texting the bot or sending it a
receipt photo — **no bank integration; everything is manual/photo entry by design.**

> **Frontend dashboard:** https://mrrobot-server.tail15a3bc.ts.net:8443
> (Tailscale Funnel, port 8443. Sign in with the single allowed email via magic
> link — see [Phase 2](#phase-2--dashboard).)

---

## Table of contents

- [Architecture](#architecture)
- [Message routing](#message-routing-telegram-intake)
- [The two AI paths: capture vs advisor](#the-two-ai-paths-capture-vs-advisor)
- [Data model](#data-model)
- [Scheduled workflows](#scheduled-workflows)
- [Full repo layout](#full-repo-layout)
- [Database schema (all migrations)](#database-schema-all-migrations)
- [Operations](#operations)
- [Secrets](#secrets-never-committed)
- [Replicating from scratch](#replicating-from-scratch-fresh-server)
- [Issues & gotchas (READ before touching anything)](#issues--gotchas-read-before-touching-anything)
- [Patch notes](#patch-notes)

---

## Architecture

```
                         ┌──────────────────────────────────────────────────────┐
  Telegram bot           │ n8n (Docker: n8n-router, port 5678, REGULAR mode)     │
  (dedicated token) ────▶│  1 Telegram Intake ──┬─ income reply    → income      │
   via Tailscale Funnel  │                      ├─ photo           → OCR→classify │
                         │                      ├─ line ends w/ amt→ classify     │
                         │                      ├─ "balance N"      → snapshot     │
                         │                      └─ anything else    → chat         │
                         │  2 Income Confirmation (7th/25th prompt)               │
                         │  3 Daily Cron (07:00 week-to-date summary)             │
                         │  4 Weekly Budget Calc (Mon + on income confirm)        │
                         │  5 Weekend Check-in (Sat 08:00)                        │
                         │  6 Weekly Advisor Check (Wed 08:00, proactive flags)   │
                         └─────────┬───────────────────────────┬──────────────────┘
                                   │ SQL                        │ HTTP + bearer token
                          ┌────────▼─────────┐        ┌─────────▼──────────────────┐
                          │ Postgres         │        │ budget-bridge (host,       │
                          │ budget-db :5434  │◀───────│ 172.18.0.1:8790)           │
                          │ (budget_tracker) │  SQL   │  /ocr /classify /chat      │
                          └────────▲─────────┘        │  /confirm-category         │
                                   │                  └─────────┬──────────────────┘
                                   │ SQL (read-only)            │ CLI (openclaw agent)
                          ┌────────┴─────────┐        ┌─────────▼──────────────────┐
                          │ Next.js dashboard│        │ OpenClaw Gateway (host)    │
                          │ budget-web :3050 │        │  agent "budget" 💰         │
                          │ (Tailscale :8443)│        │   skills: budget-capture,  │
                          └──────────────────┘        │           budget-advisor   │
                                                      │  OpenAI via OAuth session  │
                                                      └────────────────────────────┘
```

Everything runs on one self-hosted server. n8n, the dashboard, and Postgres are
Docker containers in the shared `~/n8n-automation` compose stack; the bridge and
OpenClaw run on the host (systemd). n8n reaches the host bridge over the Docker
bridge gateway IP because it can't see host `localhost`.

---

## Message routing (Telegram Intake)

Every message goes through one router node (`Route Message`), in priority order:

1. **Income reply** — if a pending income row exists (`confirmed_zar IS NULL`) and the
   message is *just* a number (`9500` or `R9500`), it's taken as that payday's ZAR
   amount, and Weekly Budget Calc fires automatically.
2. **Photo** — downloaded, OCR'd (amount/vendor/date), classified. No amount found →
   you're asked to type it. Not confident → logged uncategorized, asks the category.
3. **Balance statement** — `balance 12345` (contains the word "balance" + a number) →
   writes a row to `balance_snapshots` (a manual correction point for the dashboard's
   computed balance, so "my balance is X" isn't force-parsed as a transaction).
4. **Text with an amount** — a message where **a line ends with an amount** (e.g.
   `petrol engen 250`, or a multi-line "log these" block) → each such line becomes its
   own transaction: classified (keyword-first, LLM fallback), inserted, confirmed.
5. **Anything else** — routed to the **"budget" OpenClaw agent** as chat. Ask
   questions, log things conversationally, manage categories; replies come back through
   the bot. Session key `agent:budget:telegram-<chatid>` (per-chat memory).

> The amount test in steps 3–4 is deliberately strict: **the amount must be the last
> thing on a line**, not merely a digit somewhere in the text. A conversational
> sentence like "you logged 2 wrong, should be R27000" contains digits but is *not* a
> transaction — it routes to chat. See [Issues & gotchas](#issues--gotchas-read-before-touching-anything)
> for the incident that forced this.

---

## The two AI paths: capture vs advisor

Both are OpenClaw skills loaded into the `budget` agent, but they serve different modes:

### Capture (`openclaw-skill/budget-capture/`) — writing data
Classifies a transaction (text or OCR'd photo) into a category, learns vendor keywords,
and manages categories. Used both by the **n8n fast path** (via the bridge, no
conversation) and **conversationally** by the agent. Scripts:
- `ocr.js` — receipt image → `{amount, vendor, date, raw_text}` (via `openclaw infer
  image describe`, on the existing OpenAI OAuth session — no raw API key).
- `classify.js` — text → best category / subcategory, or a suggestion needing
  confirmation. Keyword match first; LLM fallback sees the full category **tree**.
- `confirm_category.js` — appends a learned keyword, **or** creates a new
  category/subcategory. Runs a **pg_trgm similarity check first and refuses to create a
  near-duplicate** unless `force: true` is passed (see gotchas).

### Advisor (`openclaw-skill/budget-advisor/`) — reading data
Read-only reporting the agent uses to answer questions with real numbers. Scripts:
- `week_status.js` — this week's weekday/weekend pools vs spend + category breakdown.
- `month_status.js` — month discretionary budget vs spend, `pct_month_elapsed` for pace.
- `afford_check.js` — "can I afford X?" against a weekday/weekend pool or a savings goal.
- `category_breakdown.js` — spend by category with %-of-total and top 1–2 drivers.

The **proactive** side of the advisor is the LLM-free `Weekly Advisor Check` n8n
workflow (pure SQL + a Code node — deliberately no agent call for an unattended cron;
see [that workflow's design notes](docs/budget-advisor-thresholds.md)).

---

## Data model

- **categories** — three `type`s: `true_fixed` (Rent, Electricity, Water, Internet,
  Debt, Minette, Subscriptions), `recurring_variable` (Groceries, Petrol, Sigarettes),
  `flexible` (created on demand).
  - `keyword_hints[]` drive classification; confirmed matches append new hints so the
    system learns your vendors.
  - `parent_id` (self-reference) makes **subcategories** — one level deep only
    (enforced in `confirm_category.js`, not the DB). e.g. `Youtube`, `Suno` under
    `Subscriptions`.
  - `budget_amount` + `period` (`weekly`/`monthly`) let a `recurring_variable` category
    carry its own budget for the proactive pace check. **NULL by default** — the
    per-category proactive flag is dormant until you set these.
  - `active` flag retires a category without losing history. **Hard cap: 15 active
    _top-level_ categories** — at the cap the classifier only proposes existing matches
    or new *subcategories* (uncapped), never a new top-level.
- **transactions** — the ledger. `category_id` nullable: an unconfident classification
  logs uncategorized with the suggestion in `note`.
- **income** — one row per payday. Created *empty* by Income Confirmation (7th fixed /
  25th variable) as a "pending" marker; your numeric reply fills `confirmed_zar`.
- **budgets** — one row per `(month, week_number)`: income − 10% savings − 5% slush −
  `true_fixed` total, split across the weeks left in the month, each week carved into a
  weekday pool and a 20% weekend pool.
- **balance_snapshots** — manual "my balance is X" reference points; the dashboard's
  balance is the latest snapshot + income − spend *since that snapshot*.
- **goals** — savings/wishlist targets (name, icon, target/current amount, date) shown
  on the dashboard. Also used by `afford_check.js`.
- **users / accounts / sessions / verification_token** — standard `@auth/pg-adapter`
  tables for the dashboard's magic-link auth.

---

## Scheduled workflows

| # | Workflow | When (Africa/Johannesburg) | What |
|---|---|---|---|
| 2 | Income Confirmation | 08:00 on the 7th & 25th | Inserts a pending income row, asks what ZAR landed |
| 4 | Weekly Budget Calc | Mondays 08:00 + on income confirm | (Re)computes remaining weeks' budgets, messages the split |
| 3 | Daily Cron | 07:00 daily | Week-to-date spend by category, weekday/weekend pools remaining |
| 5 | Weekend Check-in | Saturdays 08:00 | Weekend pool spent/remaining |
| 6 | Weekly Advisor Check | Wednesdays 08:00 | Proactive flag **only if** a budget is ≥80% used with >20% of the period left. Silent otherwise. |

(#1 is Telegram Intake — event-driven, not scheduled.)

---

## Full repo layout

```
README.md                                  - this file
docs/
  budget-advisor-thresholds.md             - proactive flag thresholds + advisor workflow design notes

migrations/
  001_init.sql                             - core schema + seed categories
  002_goals.sql                            - goals table (dashboard)
  003_auth.sql                             - Auth.js (@auth/pg-adapter) tables (dashboard)
  004_balance_snapshots.sql                - manual balance snapshots
  005_subcategories.sql                    - categories.parent_id + pg_trgm (subcategories + dedup)

n8n-workflows/                             - exported workflows (credential IDs only, no secrets)
  1-telegram-intake.json                   - the router + all capture paths + chat
  2-income-confirmation.json
  3-daily-cron.json
  4-weekly-budget-calc.json
  5-weekend-checkin.json
  6-weekly-advisor-check.json              - proactive advisor (LLM-free)

bridge/
  server.js                                - host HTTP shim: /ocr /classify /chat /confirm-category
  .env.example                             - template; real .env lives only on the server

openclaw-skill/
  budget-capture/                          - OCR + classification + category/subcategory management
    SKILL.md
    scripts/{ocr,classify,confirm_category,db}.js
    package.json, package-lock.json, .env.example
  budget-advisor/                          - read-only reporting for reactive Q&A
    SKILL.md
    scripts/{week_status,month_status,afford_check,category_breakdown,db}.js
    package.json, .env.example

openclaw-agent/                            - the "Budget Coach" agent (mirror for replication)
  README.md
  agents.budget.snippet.json5             - the agents.list[] entry for openclaw.json
  budget-workspace/{IDENTITY,SOUL,AGENTS,USER}.md  - the agent's persona/workspace files

infra/
  budget-bridge.service                    - systemd --user unit for the bridge
  docker-compose.budget-db.snippet.yml     - the compose block added for budget-db

web/                                       - Phase 2 dashboard (Next.js) — see web/README.md
```

The n8n workflows, skills, and agent files here are **mirrors for redeployment**. The
live skill/agent run from `~/.openclaw/` on the server; the workflows live in n8n's own
DB. Deploy key `~/.ssh/id_stateoffinances` pushes this repo.

---

## Database schema (all migrations)

Apply in order to a Postgres 16 database named `budget_tracker` (user `budget_app`):

```
001_init.sql            categories, income, transactions, budgets + indexes + seed categories
002_goals.sql           goals
003_auth.sql            verification_token, users, accounts, sessions (@auth/pg-adapter)
004_balance_snapshots.sql   balance_snapshots
005_subcategories.sql   pg_trgm extension; categories.parent_id; name trigram + parent indexes
```

Apply one with:
```bash
docker exec -i n8n-automation-budget-db-1 psql -U budget_app -d budget_tracker -f - < migrations/00X_name.sql
```

---

## Operations

- **Re-run the weekly calc manually**: open *Budget - Weekly Budget Calc* in n8n → Execute
  Workflow. Safe anytime — upserts on `(month, week_number)`.
- **Set a category's proactive budget**:
  `UPDATE categories SET budget_amount = 2000, period = 'monthly' WHERE name = 'Groceries';`
- **Retire a category**: `UPDATE categories SET active = false WHERE name = '...';`
- **Add a subcategory / new category**: just ask the bot ("add a subcategory Takeout
  under Groceries"). It warns on near-duplicates before creating.
- **Check the bridge**: `systemctl --user status budget-bridge`; logs
  `journalctl --user -u budget-bridge`.
- **Check the agent**: `openclaw agents list` (should show `budget` 💰 on
  `openai/gpt-5.4-mini`).
- **Check webhook exposure**: `tailscale funnel status` — n8n on 443, dashboard on 8443.
- **Inspect a failed n8n run** (no UI): copy the SQLite DB out of the container and
  decode `execution_data.data` with the `flatted` package — see gotchas.
- **Deploy an edited workflow** (regular mode — a plain publish is NOT enough):
  ```bash
  docker cp n8n-workflows/X.json n8n-router:/tmp/X.json
  docker exec n8n-router n8n import:workflow --input=/tmp/X.json
  docker exec n8n-router n8n publish:workflow --id=<workflow-id>
  docker restart n8n-router   # required in regular (non-queue) mode
  ```

---

## Secrets (never committed)

`.gitignore` keeps all real env out; only `.env.example` files are tracked.

- `~/budget-tracker/bridge/.env` — bridge bearer token
- `~/n8n-automation/.env` — DB passwords, `BUDGET_OWNER_CHAT_ID`, dashboard keys
- `~/.openclaw/workspace/skills/budget-capture/.env` and the `budget` agent's own
  copies under `~/.openclaw/workspace/budget/skills/*/.env` — skill DB access
- n8n credentials (`Budget Postgres`, `Budget Telegram Bot`, `Budget Bridge Token`)
  live in n8n's own encrypted store.

---

## Replicating from scratch (fresh server)

1. **Database**: create Postgres 16 db `budget_tracker`, user `budget_app`; apply
   `migrations/001`→`005` in order.
2. **Skills** (both): copy `openclaw-skill/budget-capture/` and
   `openclaw-skill/budget-advisor/` into the OpenClaw workspace skills dir, create each
   `.env` from its example, `npm install` inside each.
3. **Agent**: add `openclaw-agent/agents.budget.snippet.json5` to `agents.list` in
   `~/.openclaw/openclaw.json`; place `openclaw-agent/budget-workspace/*.md` in the
   agent's workspace; copy both skills into the agent's own `skills/` dir too (skills
   are per-agent — see `openclaw-agent/README.md`). `openclaw config validate` +
   `openclaw agents list` to confirm.
4. **Bridge**: copy `bridge/`, create `.env` from example, install
   `infra/budget-bridge.service` under `~/.config/systemd/user/`, enable it, and set
   `loginctl enable-linger <user>`. Confirm `/chat` targets `--agent budget`.
5. **Firewall**: allow the n8n container subnet to reach the bridge:
   `sudo ufw allow from <docker-subnet> to any port 8790 proto tcp`.
6. **Postgres container**: add the block from
   `infra/docker-compose.budget-db.snippet.yml` to the compose stack; set
   `BUDGET_DB_PASSWORD`.
7. **n8n**: import `n8n-workflows/*.json`, recreate the 3 credentials, set
   `BUDGET_OWNER_CHAT_ID` in n8n's env (**and note**: the chat ID is now hardcoded in
   the Telegram nodes — see gotchas — so the env var is belt-and-suspenders), activate
   all 6. Point n8n's `WEBHOOK_URL` at a stable public HTTPS endpoint (Tailscale Funnel;
   a cloudflared *quick* tunnel won't survive restarts).
8. **Dashboard**: see `web/README.md`. Second Tailscale Funnel on port 8443.

---

## Issues & gotchas (READ before touching anything)

Everything here is a real incident that cost time. Grouped by subsystem.

### OpenClaw agent

- **Don't run the budget chat under the `main` agent.** Originally the bridge's `/chat`
  used `--agent main`, whose coding profile stripped the message tool and made the bot
  "get stuck" / go off-persona. Fix: a **dedicated `budget` agent** with its own
  persona, model, and skills.
- **This deployment has no working Gemini access — use OpenAI models only.** The first
  budget agent used `google/gemini-2.5-flash` **with no fallback**; the first time the
  model was unreachable, the bot went silent (n8n showed
  `FailoverError: API rate limit reached`, nothing to fail over to). Fix:
  `openai/gpt-5.4-mini` primary + `openai/gpt-5.4` fallback. **Always set a `fallbacks`
  array on a non-default agent.**
- **Use `gpt-5.4-mini`, not bare `gpt-5.4`, for the chat agent.** Bare `gpt-5.4` is
  mapped to the Codex coding-runtime here; the mini model stays a plain chat agent.
- **A small model will silently treat Rand as cents** (reported `R54000` as `R540.00`).
  Soft instructions didn't fix it; a **worked example** in `AGENTS.md` ("54000 means
  R54 000, do not divide by 100") did.
- **The agent's exec cwd is its workspace root, not the skill folder.** Skill docs must
  use **absolute** script paths, or `node scripts/x.js` fails.
- **Non-default agents get their own workspace** at `<defaults.workspace>/<id>`, and
  **skills are physically duplicated per agent** (each with its own `.env`). A skill
  edit must be applied to every copy — there's no shared source.
- `agents.list`/`skills`/`tools`/`model` config changes **hot-reload** — no gateway
  restart needed.

### Telegram intake / capture

- **"Contains a digit" is too broad a transaction test.** A conversational correction
  ("you added 2 transactions, should be R27000") got force-logged as garbage
  transactions. Fix: only treat a line as an expense when **the amount is the last token
  on the line**; everything else routes to chat.
- **Multi-line "log these" messages** must split into one transaction *per line* (each
  classified/inserted separately). The original code grabbed only the first number in
  the whole blob and dropped the rest silently.
- **Category confirmation messages referenced the wrong node.** They read
  `$json.category_name`, but `$json` at that point was the `INSERT ... RETURNING id`
  output (no name) → blank category in the reply. Fix: reference
  `$('Bridge Classify (…)').item.json.category_name` explicitly.
- **Near-duplicate categories** ("Grocery" vs "Groceries", "Fuel" vs "Petrol") are
  caught by a **pg_trgm similarity check** (threshold `0.4`, tuned against the real
  category list) in `confirm_category.js`, which refuses to create and returns
  `possible_duplicate` until `force: true`. Trigram catches spelling variants; a
  *synonym* (different word, same meaning) still needs a human eye — the agent is told
  to scan the tree too.

### n8n (this instance: `n8nio/n8n:latest`, currently 2.31.5, **regular/non-queue mode**)

- **`n8n import:workflow --activeState=fromJson` fails** in regular mode. Deploy is:
  `import:workflow` (force-deactivates) → `publish:workflow --id=…` → **`docker restart
  n8n-router`**. `publish` alone prints success but does **not** take effect on a
  running instance ("Changes will not take effect if n8n is running").
- **UI edits, by contrast, take effect immediately** (they write straight to the DB) —
  for a pure wiring change, editing in the n8n canvas + Ctrl+S is faster than the CLI
  dance and needs no restart.
- **Unpinned image bit us**: a silent version bump started enforcing
  `N8N_BLOCK_ENV_ACCESS_IN_NODE` by default, which **broke every `{{ $env.… }}` read in
  node parameters** (`access to env vars denied`). Fix: the Telegram `chatId` is now a
  **hardcoded literal** in the workflows rather than `$env.BUDGET_OWNER_CHAT_ID` —
  hardcoding one non-secret ID is safer than disabling that flag instance-wide (it also
  guards real secrets in every other workflow). **Consider pinning the image tag.**
- **A Postgres node returning zero rows halts its branch** unless
  `alwaysOutputData: true` — a downstream Code node referencing it via `$('Node')` then
  errors "hasn't been executed". All query nodes feeding a Code node need this.
- **This engine version is unreliable with empty/absent inputs from fan-in or IF
  branches.** The Weekly Advisor Check hit *three* variants: (a) two Postgres queries
  fanned in parallel into a Code node raced, so one "hadn't executed"; (b) zero-row
  propagation (above); (c) an IF-node gate's empty TRUE branch **non-deterministically
  still fired** the downstream Telegram send with empty text (two byte-identical runs,
  one skipped correctly, one errored). **General rule adopted: prefer strict linear
  chains and a Code node that `return []` to skip downstream, over parallel fan-in and
  IF-gates before a send.**
- **Reading real run history without the UI**: n8n's SQLite lives in the container at
  `/home/node/.n8n/database.sqlite` (+ `-wal`/`-shm`, WAL mode). `docker cp` all three
  out, then decode `execution_data.data` with the **`flatted`** package (it's n8n's own
  self-referential JSON format — vendored in the image, and in `web/node_modules`),
  not a hand-rolled JSON parser.
- Other longstanding notes: after a PUT via the public API you must POST /activate to
  publish; the Telegram trigger webhook secret is `<workflowId>_<nodeId>`.

### Dashboard

- **Auth config is split in two**: middleware runs on Next's Edge runtime, which can't
  load `pg`. `auth.config.ts` (JWT, no adapter) is for middleware; `auth.ts` (adapter +
  Resend) is for server components/routes. Don't merge them.
- **`pg` returns `DATE` columns as JS `Date` objects**, not strings — normalize at the
  query boundary.
- **Resend sandbox domain** (`onboarding@resend.dev`) only delivers to the Resend
  account's own address, so `BUDGET_WEB_ALLOWED_EMAIL` is temporarily
  `lucian9000@gmail.com`. To use the work email: verify a domain at resend.com, point
  `BUDGET_WEB_EMAIL_FROM` at it, then switch the allowed email back.

---

## Phase 2 — Dashboard

Read-only mobile-first web app at **https://mrrobot-server.tail15a3bc.ts.net:8443**
(separate Tailscale Funnel port from n8n, which stays on 443). Two pages:

- **`/` Overview** — greeting header, top categories as thumbnails, a gradient balance
  hero card (running balance baselined off the latest `balance_snapshots` row +
  income/spend since, odometer digit-roll animation), a Daily/Weekly/Monthly/Yearly pill
  switcher (re-queries via URL params, no client-side fetching), a donut + ranked
  category list, and a Goals section.
- **`/transactions`** — search + category filter chips, grouped by day.

Auth is a single allowed email via Auth.js magic-link (Resend) — no open sign-up, no
CRUD (read-only by design). See `web/README.md` for setup, env vars, and architecture
notes.

Built on branch `feature/dashboard-frontend` — **not yet merged to `main`.** All Phase 3
work is committed on the same branch.

## What's next (roadmap)

- Merge `feature/dashboard-frontend` → `main` once reviewed.
- Pin the n8n image to a version tag (stop silent breaking changes on restart).
- Populate `budget_amount`/`period` on the recurring-variable categories to activate the
  per-category proactive flag.
- Decide how to track "unused slush → reallocate to a goal" (needs a dedicated slush
  category or a defined rule — deliberately deferred, see thresholds doc).
- Candidate backlog: transaction CRUD / recategorize-by-reply, goal management in the
  UI, monthly close-out report, export.

---

## Patch notes

### 2026-07-23 — v0.5 "the coach" (Phase 3)
- **Dedicated `budget` OpenClaw agent** ("Budget Coach" 💰): own persona
  (`openclaw-agent/`), model `openai/gpt-5.4-mini` (+`gpt-5.4` fallback), skills locked
  to `budget-capture` + `budget-advisor`, tools locked to `exec`+`read`. Bridge `/chat`
  now targets `--agent budget` (session key `agent:budget:telegram-<chatid>`), replacing
  the old `main`-agent chat that stripped the reply tool and went off-persona.
- **`budget-advisor` skill** (new): read-only `week_status` / `month_status` /
  `afford_check` / `category_breakdown` scripts for grounded reactive Q&A.
- **Proactive `Weekly Advisor Check` workflow** (new, #6): LLM-free SQL + Code node,
  Wednesdays 08:00, flags only at ≥80% budget used with >20% of the period left. Thresholds
  and design notes in `docs/budget-advisor-thresholds.md`.
- **Subcategories + duplicate detection** (`005_subcategories.sql`): `categories.parent_id`
  (one level deep) + `pg_trgm`; `confirm_category.js` warns on near-duplicate names
  before creating; the 15-category cap now applies to top-level only.
- **Balance snapshots** (`004_balance_snapshots.sql`): "balance N" messages set a
  reference point; dashboard balance now baselines off the latest snapshot
  (`web/src/lib/queries.ts`).
- **Fixes**: stricter amount detection (line-ends-with-amount, not any-digit); multi-line
  "log these" splits per line; category-name in confirmations references the classify
  node; hardcoded Telegram `chatId` (n8n env-access lockdown); `alwaysOutputData` +
  linear-chain + `return []`-to-skip rewiring of the advisor workflow. All detailed under
  [Issues & gotchas](#issues--gotchas-read-before-touching-anything).

### 2026-07-17 — v0.4.1
- Real Resend API key dropped in — magic-link sign-in actually live.

### 2026-07-17 — v0.4 "the dashboard"
- Phase 2 web dashboard: Next.js 14 App Router + TS + Tailwind, Auth.js v5 magic-link
  gated to one email, Overview + Transactions pages. Added `goals` + Auth.js tables.
  Edge-safe auth split; `pg` Date-object normalization. Dockerized as `budget-web`,
  second Tailscale Funnel on 8443.

### 2026-07-17 — v0.3 "it actually talks back"
- Chat mode via bridge `/chat`; texts without an amount / photos without an amount no
  longer crash the NOT NULL column; removed the n8n footer.

### 2026-07-17 — v0.2 "unsticking the intake"
- Fixed silent death after the pending-income lookup (zero-row branch halt);
  `alwaysOutputData` + hardened pending-row check. Repo pushed; boot-resilience audit.

### 2026-07-17 — v0.1 "phase 1 backend"
- Postgres schema + seeds; 5 n8n workflows; `budget-capture` skill (OCR +
  keyword-first classification, 15-category cap); token-authed host bridge; Tailscale
  Funnel webhook.
