#!/usr/bin/env node
// Usage: node classify.js '{"text": "checkers groceries 450"}'
// Prints a single JSON line to stdout:
//   {category_id, category_name, confidence: "high"|"low", needs_confirmation, suggested_category_name}

const { execFileSync } = require('child_process');
const { pool } = require('./db');

const MAX_ACTIVE_CATEGORIES = 15;

function extractJson(raw) {
  try { return JSON.parse(raw); } catch (e) { /* fall through */ }
  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');
  if (first === -1 || last === -1 || last < first) {
    throw new Error(`no JSON object found in output: ${raw.slice(0, 200)}`);
  }
  return JSON.parse(raw.slice(first, last + 1));
}

function runModel(prompt) {
  const stdout = execFileSync('openclaw', [
    '--log-level', 'silent',
    'infer', 'model', 'run',
    '--model', 'openai/gpt-5.4',
    '--prompt', prompt,
    '--json',
  ], { encoding: 'utf8', timeout: 60000 });
  const envelope = extractJson(stdout);
  const text = envelope.outputs && envelope.outputs[0] && envelope.outputs[0].text;
  if (!text) throw new Error('model returned no text output');
  return extractJson(text);
}

function keywordMatch(text, categories) {
  const lower = text.toLowerCase();
  let best = null;
  for (const cat of categories) {
    const hints = [cat.name, ...(cat.keyword_hints || [])];
    for (const hint of hints) {
      const h = String(hint).toLowerCase().trim();
      if (h && lower.includes(h)) {
        if (!best || h.length > best.matchedLength) {
          best = { category: cat, matchedLength: h.length };
        }
      }
    }
  }
  return best && best.category;
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: classify.js \'{"text": "..."}\'');
    process.exit(1);
  }
  const { text } = JSON.parse(arg);

  const { rows: categories } = await pool.query(
    'SELECT id, name, keyword_hints FROM categories WHERE active = true ORDER BY id'
  );

  const keywordHit = keywordMatch(text, categories);
  if (keywordHit) {
    console.log(JSON.stringify({
      category_id: keywordHit.id,
      category_name: keywordHit.name,
      confidence: 'high',
      needs_confirmation: false,
      suggested_category_name: null,
    }));
    await pool.end();
    return;
  }

  const atCap = categories.length >= MAX_ACTIVE_CATEGORIES;
  const categoryList = categories.map((c) => c.name).join(', ');
  const prompt = `You are classifying a personal budget transaction into a category.
Active categories (${categories.length}): ${categoryList}
Transaction text: "${text}"

${atCap
    ? `There are already ${categories.length} active categories (cap is ${MAX_ACTIVE_CATEGORIES}). Do NOT suggest a new category. Pick the closest existing category from the list above.`
    : `If none of the existing categories are a good fit, you may suggest ONE new short category name (a couple of words, Title Case).`}

Respond with ONLY this JSON, no markdown, no commentary:
{"best_existing_category": "<exact name from the list, or null>", "new_category_suggestion": ${atCap ? 'null' : '"<new name, or null>"'}}`;

  const modelResult = runModel(prompt);
  const matchedExisting = categories.find(
    (c) => modelResult.best_existing_category
      && c.name.toLowerCase() === String(modelResult.best_existing_category).toLowerCase()
  );

  console.log(JSON.stringify({
    category_id: matchedExisting ? matchedExisting.id : null,
    category_name: matchedExisting ? matchedExisting.name : null,
    confidence: 'low',
    needs_confirmation: true,
    suggested_category_name: atCap ? null : (modelResult.new_category_suggestion || null),
  }));
  await pool.end();
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
