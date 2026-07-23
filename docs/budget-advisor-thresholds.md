# Budget Advisor — proactive flag thresholds

Covers the "Budget - Weekly Advisor Check" n8n workflow
(`n8n-workflows/6-weekly-advisor-check.json`), which runs every **Wednesday
08:00 (Africa/Johannesburg)** and sends a Telegram message **only if** something
is worth flagging — no message is sent on a quiet week.

## Where to tune these

Open the workflow in n8n and edit the **"Set Thresholds"** node (right after
the trigger). It's two plain number fields — no code editing required:

| Field                        | Current value | Meaning                                                              |
| ----------------------------- | -------------- | ---------------------------------------------------------------------- |
| `pctBudgetUsedThreshold`       | `80`           | Flag once this % of a period's budget has been spent                  |
| `pctTimeRemainingThreshold`    | `20`           | ...but only if more than this % of the period's time is still left    |

Combined rule: **flag if ≥80% of budget is used while >20% of the period's
time remains** — i.e. spending is meaningfully ahead of pace, with enough of
the period left that it's still actionable (not "the week's basically over
anyway").

## What gets checked

1. **This week's discretionary pool** — `budgets.weekly_budget +
   budgets.weekend_budget` vs. actual week-to-date spend (both weekday and
   weekend transactions combined). "Time remaining" is based on the ISO day
   of week (Monday = day 1 of 7).

2. **Recurring-variable categories with a set budget** — any `categories` row
   where `type = 'recurring_variable'` (Groceries, Petrol, Sigarettes by
   default) **and** both `budget_amount` and `period` are set. Period-to-date
   spend (weekly or monthly, per that category's `period` column) is compared
   against `budget_amount`.

   **Currently no category has `budget_amount`/`period` set** (verified
   directly against the live database), so this half of the check won't flag
   anything until you set them, e.g.:

   ```sql
   docker exec n8n-automation-budget-db-1 psql -U budget_app -d budget_tracker -c \
     "UPDATE categories SET budget_amount = 2000, period = 'monthly' WHERE name = 'Groceries';"
   ```

## What's intentionally NOT included yet

The original spec asked for a third flag: "unused slush/savings that could be
reallocated to a wishlist goal." That was left out of this build because the
schema doesn't currently track slush *spend* separately from the rest of
discretionary spending — `budgets.slush_5pct` is a planned allocation, not a
category anything gets logged against, so there's no reliable way to tell
"unused" from "not tracked" yet. Building that flag needs one decision first:
either (a) add a dedicated "Slush" category so it's tracked like anything
else, or (b) define "unused slush" some other way. Worth a short follow-up
conversation before building it, rather than guessing.

## Design note: no LLM in this workflow

Unlike the Budget Coach persona's reactive Telegram replies, this proactive
check is pure SQL + a Code node — no agent/model call. The threshold math is
deterministic and doesn't need judgment, and skipping the LLM avoids the
latency (an agent turn can take 30-60+ seconds) and occasional off-persona
replies that matter for an unattended cron job nobody's watching in real time.

## Design note: node structure (why it looks the way it does)

The node chain is strictly linear:
`Trigger → Set Thresholds → Get Week Budget vs Spend → Get Category Pace →
Evaluate Flags → Send Advisor Flag`.

Two structural choices are deliberate, both worked out the hard way against
this n8n version's execution quirks:

1. **The two Postgres queries are chained, not run in parallel.** `Evaluate
   Flags` reads from both via `$('Get Week Budget vs Spend')` and
   `$('Get Category Pace')`, so both must be guaranteed to have executed first.
   Fanning them out as parallel branches into `Evaluate Flags` caused a race
   where one branch hadn't run yet ("Node 'Get Category Pace' hasn't been
   executed"). A linear chain removes the ambiguity.

2. **There is no "Should Send?" IF node.** `Evaluate Flags` returns zero items
   when there's nothing to flag, which cleanly skips the Telegram node. An
   earlier IF-node gate fired the Telegram send non-deterministically even when
   its send-branch was empty, causing intermittent "message text is empty"
   errors. If you edit this workflow, keep the "return `[]` to stay silent"
   pattern rather than reintroducing an IF gate before the send.

Both Postgres nodes have `alwaysOutputData: true` so that a zero-row result
(e.g. no budgeted categories) still lets `Evaluate Flags` run — otherwise an
empty `Get Category Pace` would skip the whole downstream chain and the
week-level pool check would never fire.
