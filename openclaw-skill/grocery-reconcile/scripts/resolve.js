#!/usr/bin/env node
// Usage: node resolve.js '{"ocr_text":"brown bread 700g","grocery_item_id":12,"transaction_id":99,"amount":19.99,"confirmed":true}'
//
// Resolves an "uncertain" match after the user answers Yes/No/Different:
//   - Always records the outcome in match_learnings (feeds future LLM prompts).
//   - If confirmed=true and a grocery_item_id is given, reconciles that item
//     (status=bought, actual_price=amount, matched_via=slip_ocr, transaction_id, bought_at).
//   - confirmed=false (No / Different item) records the rejection and leaves the
//     item pending.
//
// Prints: {ok: true, recorded: true, reconciled_item_id: <id|null>}

const { pool } = require('./db');

async function main() {
  const arg = process.argv[2];
  if (!arg) { console.error('Usage: resolve.js \'{...}\''); process.exit(1); }
  const { ocr_text: ocrText, grocery_item_id: groceryItemId,
    transaction_id: transactionId, amount, confirmed } = JSON.parse(arg);

  if (!ocrText) throw new Error('ocr_text is required');

  // Resolve the matched item name for the learning record (by id if given).
  let matchedName = null;
  if (groceryItemId) {
    const { rows } = await pool.query('SELECT item_name FROM grocery_items WHERE id = $1', [groceryItemId]);
    matchedName = rows.length ? rows[0].item_name : null;
  }

  await pool.query(
    `INSERT INTO match_learnings (ocr_text, matched_item_name, confirmed) VALUES ($1, $2, $3)`,
    [ocrText, matchedName || '(none)', Boolean(confirmed)]
  );

  let reconciledId = null;
  if (confirmed && groceryItemId) {
    const { rowCount } = await pool.query(
      `UPDATE grocery_items
       SET status = 'bought', actual_price = $1, matched_via = 'slip_ocr',
           transaction_id = $2, bought_at = now()
       WHERE id = $3 AND status = 'pending'`,
      [amount ?? null, transactionId ?? null, groceryItemId]
    );
    reconciledId = rowCount > 0 ? groceryItemId : null;
  }

  console.log(JSON.stringify({ ok: true, recorded: true, reconciled_item_id: reconciledId }));
  await pool.end();
}

main().catch((err) => { console.error(err.stack || String(err)); process.exit(1); });
