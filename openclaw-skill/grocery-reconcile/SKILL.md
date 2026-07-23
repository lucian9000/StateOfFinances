---
name: grocery-reconcile
description: Reconcile a Groceries till-slip's OCR line items against the pending grocery shopping list — auto-tick confident matches, ask about uncertain ones, ignore items that were never on the list. Also resolves those uncertain confirmations and learns from them. Called by the main bot's slip-OCR flow after a Groceries-classified photo, and reusable for line-item reconciliation.
metadata: { "openclaw": { "emoji": "🧾", "requires": { "bins": ["node"] } } }
---

# Grocery Reconcile

The single shared reconciliation logic — the main bot's slip-OCR flow calls this
rather than duplicating grocery logic. See `docs/grocery-reconciliation.md` for
the match-confidence design and how to tune it.

## 1. Reconcile a slip

```bash
node scripts/reconcile.js '{"transaction_id": 123, "line_items": [{"name":"BROWN BREAD 700G","amount":19.99}]}'
```

- Loads pending `grocery_items` + recent `match_learnings` as examples, then asks
  the LLM for a per-line verdict (**confident_match / uncertain / no_match** — LLM
  judgment, not string matching).
- **confident_match** → auto-reconciles: `status='bought'`, `actual_price` = OCR
  amount, `matched_via='slip_ocr'`, `transaction_id`, `bought_at=now()`.
- **no_match** → left untouched, no message (bought, but wasn't on the list).
- **uncertain** → NOT guessed; returned in `uncertain[]` with a ready-made
  "did you mean X? Yes/No/Different" line for the bot to send.

Returns `{reconciled, uncertain, unmatched, message}`. Send `message` to the user
(null = nothing worth saying). If `uncertain` is non-empty, the workflow waits for
the reply and calls `resolve.js`.

## 2. Resolve an uncertain confirmation (and learn)

```bash
node scripts/resolve.js '{"ocr_text":"brown bread 700g","grocery_item_id":12,"transaction_id":99,"amount":19.99,"confirmed":true}'
```

- Always writes the outcome to `match_learnings` (both yes and no), which future
  `reconcile.js` calls feed back into the LLM prompt so accuracy improves over
  time **without changing the confidence thresholds**.
- `confirmed:true` + `grocery_item_id` → reconciles that item as above.
- `confirmed:false` (No / Different item) → records the rejection, leaves pending.

## Notes

- Never matches two receipt lines to the same list item in one run.
- Read-only w.r.t. everything except `grocery_items` (reconcile) and
  `match_learnings` (append). It never writes `transactions` — the caller creates
  the transaction first and passes its `transaction_id` in.
