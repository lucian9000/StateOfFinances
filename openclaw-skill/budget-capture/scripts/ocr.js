#!/usr/bin/env node
// Usage: node ocr.js /path/to/receipt.jpg
// Prints a single JSON line to stdout:
//   {amount, vendor, date, raw_text, line_items: [{name, amount}]}
// line_items is additive (for the StateOfGroceries slip-reconciliation flow);
// the main capture flow keeps using `amount`/`vendor`/`date` exactly as before.

const { execFileSync } = require('child_process');

function extractJson(raw) {
  try { return JSON.parse(raw); } catch (e) { /* fall through */ }
  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');
  if (first === -1 || last === -1 || last < first) {
    throw new Error(`no JSON object found in output: ${raw.slice(0, 200)}`);
  }
  return JSON.parse(raw.slice(first, last + 1));
}

const PROMPT = 'Extract details from this receipt or bank transfer slip. '
  + 'Also extract each individual purchased line item with its own price where the image is an itemised till slip '
  + '(skip subtotals, tax, change, and totals — only real products). If it is a bank transfer slip with no line items, return an empty line_items array. '
  + 'Respond with ONLY this JSON, no markdown, no commentary: '
  + '{"amount": number or null, "vendor": string or null, "date": "YYYY-MM-DD" or null, '
  + '"raw_text": "all legible text on the image", '
  + '"line_items": [{"name": "product name as printed", "amount": number}]}';

function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: ocr.js /path/to/image');
    process.exit(1);
  }

  const stdout = execFileSync('openclaw', [
    '--log-level', 'silent',
    'infer', 'image', 'describe',
    '--file', filePath,
    '--model', 'openai/gpt-5.4',
    '--prompt', PROMPT,
    '--json',
  ], { encoding: 'utf8', timeout: 60000 });

  const envelope = extractJson(stdout);
  const text = envelope.outputs && envelope.outputs[0] && envelope.outputs[0].text;
  if (!text) throw new Error('model returned no text output');
  const result = extractJson(text);

  const lineItems = Array.isArray(result.line_items)
    ? result.line_items
        .filter((li) => li && li.name && typeof li.amount === 'number')
        .map((li) => ({ name: String(li.name).trim(), amount: li.amount }))
    : [];

  console.log(JSON.stringify({
    amount: result.amount ?? null,
    vendor: result.vendor ?? null,
    date: result.date ?? null,
    raw_text: result.raw_text ?? null,
    line_items: lineItems,
  }));
}

try {
  main();
} catch (err) {
  console.error(err.stack || String(err));
  process.exit(1);
}
