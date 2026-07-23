---
name: budget-advisor
description: Answer questions about the user's actual budget standing (week/month pace, category breakdown, "can I afford X") and back proactive weekly spend-pace flags, grounded in the `budget_tracker` Postgres database. Trigger on phrases like "how am I doing this week/month", "can I afford", "where's my money going". This is the Budget Coach persona's reactive-mode toolset — it only reads and reports, it never inserts transactions (see `budget-capture` for that).
metadata: { "openclaw": { "emoji": "💰", "requires": { "bins": ["node"] } } }
---

# Budget Advisor

Read-only reporting scripts against the `budget_tracker` Postgres database, used
by the Budget Coach persona to answer questions with real numbers instead of
guessing. All scripts connect using `.env` in this skill's directory (same
credentials as the `budget-capture` skill, pointed at the same `budget-db`
container on `127.0.0.1:5434`).

Run scripts with the **absolute path** shown below — do not assume your
working directory is this skill's folder:

```bash
node /home/mrrobot/.openclaw/workspace/budget/skills/budget-advisor/scripts/<script>.js
```

**Never answer a spend/budget/goal question from memory or estimation — always
run the relevant script first and quote the numbers it returns.**

**All amounts are already in plain Rand (ZAR) — never cents, never any other
subunit.** Quote every number exactly as returned. Do NOT divide or multiply
by 100, and do not "sanity check" a number against what looks plausible and
silently rescale it. Example: a script returning `"weekday_spent": 54000`
means **R54 000** was spent — say "R54 000.00", not "R540.00". If a figure
looks surprisingly large, say that plainly ("that's a big number — worth
double-checking the entries") rather than quietly reinterpreting it.

## Scripts

### 1. This week's status

```bash
node /home/mrrobot/.openclaw/workspace/budget/skills/budget-advisor/scripts/week_status.js
```

Use for: "how am I doing this week?", "how much do I have left?"

Returns weekday/weekend budget pools vs. actual spend so far this week, plus a
category breakdown for the week. `has_budget: false` means "Weekly Budget Calc"
hasn't run yet for this week — say that plainly rather than guessing a figure.

### 2. This month's status

```bash
node /home/mrrobot/.openclaw/workspace/budget/skills/budget-advisor/scripts/month_status.js
```

Use for: "how am I doing this month?", broader check-ins.

Returns the month's total discretionary budget (the weekday+weekend pools
summed across the month's budget rows — this excludes `true_fixed` categories
like rent/electricity, which are tracked separately) vs. actual discretionary
spend, plus `pct_month_elapsed` so you can judge pace (e.g. 40% of the month
elapsed but 70% of discretionary budget spent is worth flagging).

### 3. Can I afford X?

```bash
node /home/mrrobot/.openclaw/workspace/budget/skills/budget-advisor/scripts/afford_check.js '{"amount": 250, "pool": "weekday"}'
node /home/mrrobot/.openclaw/workspace/budget/skills/budget-advisor/scripts/afford_check.js '{"amount": 500, "pool": "weekend"}'
node /home/mrrobot/.openclaw/workspace/budget/skills/budget-advisor/scripts/afford_check.js '{"amount": 1500, "goal": "Cape Town"}'
```

Use for: "can I afford X?", "do I have room for X?"

- Default pool is `weekday` if the spend would happen on a weekday (or the user
  doesn't specify); use `weekend` for weekend spend.
- If the user names a savings/wishlist goal instead (matches against `goals.name`,
  case-insensitive substring), pass `goal` instead of `pool` — this checks
  distance to that goal's target, not the weekly pool.
- Answer using `remaining_after_hypothetical_spend` and `can_afford` — state the
  actual remaining-before and remaining-after numbers, not just yes/no.

### 4. Where's my money going?

```bash
node /home/mrrobot/.openclaw/workspace/budget/skills/budget-advisor/scripts/category_breakdown.js '{"period": "month"}'
node /home/mrrobot/.openclaw/workspace/budget/skills/budget-advisor/scripts/category_breakdown.js '{"period": "week"}'
```

Use for: "where's my money going?", "what's driving my spend?"

Returns categories sorted by spend with each one's % of total, plus
`top_categories` (the top 1-2). Lead with those two in the answer.

## Scope reminder

This skill only reports. It never writes to `transactions`, `categories`, or
`goals` — if the user wants to log a new expense, use the `budget-capture`
skill instead. If asked something outside personal budgeting (investing,
trading, unrelated tasks), say so plainly and redirect — see this agent's
`IDENTITY.md` for the full guardrail.
