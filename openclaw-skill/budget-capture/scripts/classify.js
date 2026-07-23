#!/usr/bin/env node
// Usage: node classify.js '{"text": "checkers groceries 450"}'
// Prints a single JSON line to stdout:
//   {category_id, category_name, confidence, needs_confirmation,
//    suggested_category_name, suggested_subcategory: {name, parent_name}|null}

const { execFileSync } = require('child_process');
const { pool } = require('./db');

const MAX_ACTIVE_TOP_LEVEL_CATEGORIES = 15;

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

function buildCategoryTree(categories) {
  const topLevel = categories.filter((c) => !c.parent_id);
  const byParent = {};
  for (const c of categories) {
    if (c.parent_id) {
      byParent[c.parent_id] = byParent[c.parent_id] || [];
      byParent[c.parent_id].push(c);
    }
  }
  const lines = [];
  for (const top of topLevel) {
    lines.push(top.name);
    for (const sub of byParent[top.id] || []) {
      lines.push(`  - ${sub.name}`);
    }
  }
  return { topLevel, tree: lines.join('\n') };
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: classify.js \'{"text": "..."}\'');
    process.exit(1);
  }
  const { text } = JSON.parse(arg);

  const { rows: categories } = await pool.query(
    'SELECT id, name, keyword_hints, parent_id FROM categories WHERE active = true ORDER BY id'
  );

  const keywordHit = keywordMatch(text, categories);
  if (keywordHit) {
    console.log(JSON.stringify({
      category_id: keywordHit.id,
      category_name: keywordHit.name,
      confidence: 'high',
      needs_confirmation: false,
      suggested_category_name: null,
      suggested_subcategory: null,
    }));
    await pool.end();
    return;
  }

  const { topLevel, tree } = buildCategoryTree(categories);
  const atCap = topLevel.length >= MAX_ACTIVE_TOP_LEVEL_CATEGORIES;
  const prompt = `You are classifying a personal budget transaction into a category or subcategory.
Existing categories and subcategories (indented lines are subcategories of the category above them):
${tree}

Transaction text: "${text}"

${atCap
    ? `There are already ${topLevel.length} top-level categories (cap is ${MAX_ACTIVE_TOP_LEVEL_CATEGORIES}). Do NOT suggest a new top-level category — pick the closest existing category or subcategory instead.`
    : `If nothing existing fits well, you may suggest ONE new top-level category (a couple of words, Title Case).`}
You may instead suggest a new SUBCATEGORY under an existing top-level category, when that's a better fit than either an existing entry or a whole new top-level category — subcategories are not capped.

Respond with ONLY this JSON, no markdown, no commentary:
{"best_existing_category": "<exact name from the list above, or null>", "new_category_suggestion": ${atCap ? 'null' : '"<new top-level name, or null>"'}, "new_subcategory_suggestion": {"name": "<new subcategory name>", "parent_name": "<exact existing top-level category name>"} or null}`;

  const modelResult = runModel(prompt);
  const matchedExisting = categories.find(
    (c) => modelResult.best_existing_category
      && c.name.toLowerCase() === String(modelResult.best_existing_category).toLowerCase()
  );

  let suggestedSubcategory = null;
  if (modelResult.new_subcategory_suggestion && modelResult.new_subcategory_suggestion.parent_name) {
    const parentOk = topLevel.some(
      (c) => c.name.toLowerCase() === String(modelResult.new_subcategory_suggestion.parent_name).toLowerCase()
    );
    if (parentOk && modelResult.new_subcategory_suggestion.name) {
      suggestedSubcategory = {
        name: modelResult.new_subcategory_suggestion.name,
        parent_name: modelResult.new_subcategory_suggestion.parent_name,
      };
    }
  }

  console.log(JSON.stringify({
    category_id: matchedExisting ? matchedExisting.id : null,
    category_name: matchedExisting ? matchedExisting.name : null,
    confidence: 'low',
    needs_confirmation: true,
    suggested_category_name: atCap ? null : (modelResult.new_category_suggestion || null),
    suggested_subcategory: suggestedSubcategory,
  }));
  await pool.end();
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
