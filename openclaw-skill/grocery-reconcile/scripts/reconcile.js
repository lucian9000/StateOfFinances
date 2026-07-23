#!/usr/bin/env node
// Usage: node reconcile.js '{"transaction_id": 123, "line_items": [{"name":"...","amount":49.99}, ...]}'
//
// Shared reconciliation between a Groceries slip OCR and the pending grocery list.
// Called by the MAIN bot's photo flow (after a Groceries-classified slip inserts a
// transactions row) AND reusable anywhere line-item reconciliation is needed.
//
// Per line item, an LLM judges confident_match / uncertain / no_match against the
// pending grocery_items (NOT string matching), informed by past match_learnings:
//   confident_match -> auto-reconcile (status=bought, actual_price=OCR amount,
//                      matched_via=slip_ocr, transaction_id, bought_at=now())
//   no_match        -> leave untouched, no message
//   uncertain       -> DO NOT guess; returned for a Yes/No/Different confirmation
//                      (the workflow asks the user, then calls resolve.js)
//
// Prints: {reconciled:[...], uncertain:[...], unmatched:[...], message: string|null}

const { execFileSync } = require('child_process');
const { pool } = require('./db');

function extractJson(raw) {
  try { return JSON.parse(raw); } catch (e) { /* fall through */ }
  const s = raw.indexOf('[') !== -1 ? raw.indexOf('[') : raw.indexOf('{');
  const closer = raw[s] === '[' ? ']' : '}';
  const e = raw.lastIndexOf(closer);
  if (s === -1 || e === -1 || e < s) throw new Error(`no JSON in: ${raw.slice(0, 200)}`);
  return JSON.parse(raw.slice(s, e + 1));
}

function runModel(prompt) {
  const stdout = execFileSync('openclaw', [
    '--log-level', 'silent', 'infer', 'model', 'run',
    '--model', 'openai/gpt-5.4', '--prompt', prompt, '--json',
  ], { encoding: 'utf8', timeout: 90000 });
  const envelope = extractJson(stdout);
  const text = envelope.outputs && envelope.outputs[0] && envelope.outputs[0].text;
  if (!text) throw new Error('model returned no text');
  return extractJson(text);
}

async function reconcileItem(groceryItemId, amount, transactionId) {
  await pool.query(
    `UPDATE grocery_items
     SET status = 'bought', actual_price = $1, matched_via = 'slip_ocr',
         transaction_id = $2, bought_at = now()
     WHERE id = $3 AND status = 'pending'`,
    [amount, transactionId ?? null, groceryItemId]
  );
}

async function main() {
  const arg = process.argv[2];
  if (!arg) { console.error('Usage: reconcile.js \'{"transaction_id":N,"line_items":[...]}\''); process.exit(1); }
  const { transaction_id: transactionId, line_items: lineItems } = JSON.parse(arg);

  const items = Array.isArray(lineItems) ? lineItems.filter((l) => l && l.name) : [];
  if (items.length === 0) {
    console.log(JSON.stringify({ reconciled: [], uncertain: [], unmatched: [], message: null }));
    await pool.end();
    return;
  }

  const { rows: pending } = await pool.query(
    `SELECT id, item_name, quantity FROM grocery_items WHERE status = 'pending' ORDER BY id`
  );
  if (pending.length === 0) {
    console.log(JSON.stringify({
      reconciled: [], uncertain: [],
      unmatched: items.map((l) => ({ ocr_text: l.name })), message: null,
    }));
    await pool.end();
    return;
  }

  const { rows: learnings } = await pool.query(
    `SELECT ocr_text, matched_item_name, confirmed FROM match_learnings ORDER BY created_at DESC LIMIT 20`
  );

  const prompt = `You are matching supermarket till-slip line items to a person's PENDING grocery shopping list.
Judge each receipt line item against the list. Use meaning, not string similarity (e.g. "BROWN BREAD 700G" matches a list item "sandwich bread").

PENDING LIST (grocery_item_id : name : quantity):
${pending.map((p) => `${p.id} : ${p.item_name} : ${p.quantity}`).join('\n')}

${learnings.length ? `PAST RESOLVED MATCHES (learn from these — confirmed=true means they WERE the same, false means they were NOT):
${learnings.map((l) => `"${l.ocr_text}" -> "${l.matched_item_name}" : ${l.confirmed ? 'confirmed same' : 'rejected'}`).join('\n')}
` : ''}
RECEIPT LINE ITEMS (index : name : amount):
${items.map((l, i) => `${i} : ${l.name} : ${l.amount ?? ''}`).join('\n')}

For each receipt line item choose exactly one verdict:
- "confident_match": clearly the same product as a pending list item.
- "uncertain": might be a pending item but you are not sure.
- "no_match": not on the pending list.

Respond with ONLY a JSON array, no markdown:
[{"index": <int>, "verdict": "confident_match|uncertain|no_match", "grocery_item_id": <int or null>, "reason": "<short>"}]`;

  const judgments = runModel(prompt);
  const byIndex = new Map();
  for (const j of Array.isArray(judgments) ? judgments : []) byIndex.set(Number(j.index), j);
  const pendingIds = new Set(pending.map((p) => p.id));
  const nameById = new Map(pending.map((p) => [p.id, p.item_name]));

  const reconciled = [], uncertain = [], unmatched = [];
  for (let i = 0; i < items.length; i += 1) {
    const li = items[i];
    const j = byIndex.get(i) || { verdict: 'no_match' };
    const gid = Number(j.grocery_item_id);
    if (j.verdict === 'confident_match' && pendingIds.has(gid)) {
      await reconcileItem(gid, li.amount ?? null, transactionId);
      reconciled.push({ grocery_item_id: gid, item_name: nameById.get(gid), actual_price: li.amount ?? null });
      pendingIds.delete(gid); // don't match two receipt lines to the same list item
    } else if (j.verdict === 'uncertain' && pendingIds.has(gid)) {
      uncertain.push({
        ocr_text: li.name, ocr_amount: li.amount ?? null,
        candidate_item_id: gid, candidate_item_name: nameById.get(gid), reason: j.reason || '',
      });
    } else {
      unmatched.push({ ocr_text: li.name });
    }
  }

  const lines = [];
  if (reconciled.length) {
    lines.push('✅ Ticked off your list:');
    for (const r of reconciled) lines.push(`  • ${r.item_name}${r.actual_price != null ? ` — R${Number(r.actual_price).toFixed(2)}` : ''}`);
  }
  for (const u of uncertain) {
    lines.push(`❓ Slip has "${u.ocr_text}" — did you mean "${u.candidate_item_name}" on the list? Reply Yes / No / Different item.`);
  }
  // no_match items are intentionally silent (they were bought but weren't on the list).

  console.log(JSON.stringify({
    reconciled, uncertain, unmatched,
    message: lines.length ? lines.join('\n') : null,
  }));
  await pool.end();
}

main().catch((err) => { console.error(err.stack || String(err)); process.exit(1); });
