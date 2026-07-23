# Grocery slip-OCR reconciliation — matching logic

How a Groceries till-slip photo gets reconciled against the pending grocery
list, and how to tune "how confident is confident". Implemented by the
`grocery-reconcile` skill (`reconcile.js` + `resolve.js`).

## The flow

1. Main bot receives a photo → existing `budget-capture` OCR runs. OCR now also
   returns `line_items: [{name, amount}]` (itemised till slips only).
2. If the transaction is classified **Groceries**, the photo flow inserts the
   `transactions` row as usual, then calls `reconcile.js` with that
   `transaction_id` + the OCR `line_items`. (No other change to the main flow;
   non-Groceries slips never call this.)
3. `reconcile.js` loads all **pending** `grocery_items` and the 20 most recent
   `match_learnings`, and asks the LLM for a per-line verdict.

## The three verdicts (LLM judgment, not string matching)

The LLM is given the receipt line, the full pending list, and past resolved
matches, and returns one of:

| Verdict | Meaning | Action |
|---|---|---|
| `confident_match` | Clearly the same product as a pending item | **Auto-reconcile**: item → `bought`, `actual_price` = OCR amount, `matched_via='slip_ocr'`, `transaction_id`, `bought_at=now()` |
| `uncertain` | Might be a pending item, not sure | **Ask** — bot sends "Slip has 'X' — did you mean 'Y'? Yes/No/Different", waits, then calls `resolve.js`. Never auto-reconciled. |
| `no_match` | Not on the pending list | **Nothing** — bought but wasn't on the list; silent, no message |

"Confidence" is the model's own judgment of *product identity*, not a numeric
string-similarity score — so "BROWN BREAD 700G" confidently matches a list item
"sandwich bread", which string matching would miss. Verified in testing:
`FC MILK 1L → full cream milk` (confident), `COCA COLA 2L → no_match`.

## Learning loop (improves without changing thresholds)

Every uncertain case that the user resolves is written to `match_learnings`
(`ocr_text`, `matched_item_name`, `confirmed` true/false) by `resolve.js`.
Future `reconcile.js` calls include the recent learnings in the LLM prompt as
worked examples ("'brown bread' was confirmed to match 'sandwich bread'";
"'X' was rejected for 'Y'"). Accuracy rises over time; the verdict definitions
themselves stay fixed.

## Tuning knobs

- **Which learnings are shown**: `reconcile.js` loads the latest 20
  (`ORDER BY created_at DESC LIMIT 20`). Raise the limit, or switch to a
  trigram-filtered pull (there's a `gin_trgm_ops` index on
  `match_learnings.ocr_text`) if the table grows large and you want only
  relevant examples.
- **Bias toward asking vs auto-reconciling**: tighten/loosen the wording of the
  three verdict definitions in the `reconcile.js` prompt. To be more cautious,
  instruct the model to prefer `uncertain` over `confident_match` unless the
  brand/product is unambiguous. To be more aggressive, tell it borderline cases
  are `confident_match`.
- **Model**: currently `openai/gpt-5.4`. A stronger model reduces uncertains;
  a cheaper one increases them.
- **One-to-one guard**: a receipt line can only reconcile one list item, and
  each list item only once per run (see the `pendingIds` set in `reconcile.js`).

## Why an LLM, not fuzzy string matching

Grocery receipts abbreviate and rebrand aggressively (`FC MILK 1L`,
`WW SNDWCH LOAF`, store house brands). Trigram/edit-distance matching produces
both false positives and misses; product-identity judgment with a learning loop
handles synonyms and abbreviations far better, and the uncertain→confirm path
means a wrong guess is never silently written.
