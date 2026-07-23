# OpenClaw "Budget Coach" agent

The dedicated conversational agent behind the Telegram bot's **chat** path
(everything that isn't a straight expense/income/photo capture). It answers
"how am I doing this week?", "can I afford X?", "where's my money going?",
logs expenses conversationally, and manages categories/subcategories — all
grounded in the `budget_tracker` database, never guessed.

This directory is a **mirror for replication**. The live agent runs from the
OpenClaw state dir on the server; nothing here is loaded directly.

## What makes up the agent

1. **Config** — `agents.budget.snippet.json5`: the `agents.list[]` entry to add
   to `~/.openclaw/openclaw.json`. Read the comments in it — every field is a
   deliberate choice with an incident behind it.
2. **Workspace persona files** — `budget-workspace/*.md`: the agent's home
   directory contents. On the server these live at the agent's workspace
   (`~/.openclaw/workspace/budget/` in this deployment, since a non-default
   agent with no explicit `workspace` resolves to `<defaults.workspace>/<id>`).
   - `IDENTITY.md` — name / vibe / emoji.
   - `SOUL.md` — persona, tone, scope guardrail (budgeting coach only; explicitly
     NOT an investment/trading advisor).
   - `AGENTS.md` — operating rules, incl. the **"numbers are exact, never
     divide by 100"** rule (a small model silently treated Rand as cents until
     told otherwise, with a worked example).
   - `USER.md` — who Lucian is + the budget model in one paragraph.
   - `TOOLS.md` / `HEARTBEAT.md` are left as OpenClaw's stock templates (not
     mirrored here).
3. **Skills** — the agent loads `budget-capture` and `budget-advisor` from
   `../openclaw-skill/`. Those have their own READMEs/SKILL.md.

## Replicating it

1. Add the object in `agents.budget.snippet.json5` to `agents.list` in
   `~/.openclaw/openclaw.json`. `agents.list`/`skills`/`tools`/`model` changes
   **hot-reload** — no gateway restart needed (verified). `openclaw config
   validate` then `openclaw agents list` to confirm it registered.
2. Create the agent workspace dir and drop the `budget-workspace/*.md` files in
   it. (OpenClaw auto-creates generic placeholder versions on first run — those
   are stock and must be overwritten with these.)
3. Copy both skills into the agent's own `skills/` dir (see main README — the
   skills are physically duplicated per-agent, each with its own `.env`).
4. Point the bridge's `/chat` at `--agent budget` with session key
   `agent:budget:telegram-<chatid>` (see `../bridge/server.js`).

## Guardrails worth keeping

- **Persona isolation**: this agent is reached ONLY through the budget Telegram
  bot. It deliberately does not inherit the main agent's coding-assistant tone
  or capabilities — that mismatch is what made the bot "get stuck"/behave oddly
  before the split.
- **Scope**: budgeting only. It refuses investment/trading/forex advice by
  design (tested).
- **Grounding**: every figure comes from a skill script run against the live
  DB, quoted exactly — never estimated, never rescaled.
