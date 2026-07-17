---
name: budget-capture
description: Classify a personal budget transaction (text or a receipt/slip photo) against Postgres categories in the `budget_tracker` database, and OCR receipt images. Trigger on phrases like "log this expense", "spent R... on...", or when a receipt/slip photo is sent for budget tracking. Not for the "remember" second-brain notes — this is specifically for StateOfFinances budget transactions.
metadata: { "openclaw": { "emoji": "💰", "requires": { "bins": ["node"] } } }
---

# Budget Capture

Classifies a transaction (free text, or OCR'd from a receipt/slip photo) into a category
in the `budget_tracker` Postgres database, and appends new keyword hints once a category
is confirmed. This is the same logic the "Telegram Intake" n8n workflow calls via the
local bridge service (`budget-bridge.service`) — the scripts here are the real
implementation either way.

## Scripts

All scripts live in `scripts/` and connect to Postgres using `.env` in this skill's
directory (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` — points at the
`budget-db` container on `127.0.0.1:5434`).

### 1. OCR a receipt/slip image

```bash
node scripts/ocr.js /path/to/image.jpg
```

Returns: `{"amount": number|null, "vendor": string|null, "date": "YYYY-MM-DD"|null, "raw_text": string|null}`

Uses `openclaw infer image describe` under the hood (existing OpenAI OAuth session —
never call a raw OpenAI API key here).

### 2. Classify transaction text

```bash
node scripts/classify.js '{"text": "checkers groceries 450"}'
```

For images, pass the OCR'd `vendor` + `raw_text` (or just the vendor name) as `text`.

Returns:
```json
{
  "category_id": 8,
  "category_name": "Groceries",
  "confidence": "high",
  "needs_confirmation": false,
  "suggested_category_name": null
}
```

Logic:
1. Keyword/name match against `categories.keyword_hints` (case-insensitive substring) —
   if a category matches, that's a **high**-confidence result and `needs_confirmation`
   is `false`. Use `category_id` directly, no need to ask the user anything.
2. If nothing matches, falls back to a one-shot model call
   (`openclaw infer model run`, model `openai/gpt-5.4`, via the same OAuth session) to
   either pick the closest existing category or propose a new one.
   `needs_confirmation` is `true` in this case — **do not silently create anything**,
   surface `suggested_category_name` (or the closest existing category) to the user and
   wait for them to confirm.
3. **Hard rule**: if there are already 15 active categories, the model is instructed to
   never propose a new one — it must pick the closest existing category instead. Don't
   override this rule even if the user insists on a new category; tell them a category
   needs to be retired first (see `active` flag below).

### 3. After the user confirms

If the user confirmed an **existing** category (including one the model suggested):

```bash
node scripts/confirm_category.js '{"category_id": 8, "new_keyword": "checkers"}'
```

This appends `new_keyword` to that category's `keyword_hints` so the same vendor/phrase
matches automatically next time. Skip `new_keyword` if there's nothing new to learn.

If the user confirmed a **brand-new** category (only possible when under the 15-cap):

```bash
node scripts/confirm_category.js '{"new_category_name": "Clothing", "type": "flexible", "new_keyword": "shoes"}'
```

`type` must be one of `true_fixed`, `recurring_variable`, `flexible` — ask the user if
it's ambiguous, but default to `flexible` for one-off discretionary spend.

## Retiring a category

There's no delete script by design — instead flip `active` to `false` so history stays
intact:

```bash
docker exec n8n-automation-budget-db-1 psql -U budget_app -d budget_tracker \
  -c "UPDATE categories SET active = false WHERE name = '<name>';"
```

## Writing the transaction itself

This skill only classifies — it does not insert into `transactions`. That's the
"Telegram Intake" n8n workflow's job (it calls this skill via the bridge, then does the
`INSERT` and sends the Telegram confirmation). If you're invoked conversationally
(outside of n8n) and the user wants a transaction logged directly, insert manually:

```bash
docker exec n8n-automation-budget-db-1 psql -U budget_app -d budget_tracker -c \
  "INSERT INTO transactions (date, amount, category_id, source, note) VALUES (CURRENT_DATE, 450, 8, 'manual', 'checkers groceries');"
```
