#!/usr/bin/env node
// Usage:
//   node confirm_category.js '{"category_id": 8, "new_keyword": "checkers"}'
//     -> appends new_keyword to an existing category's keyword_hints
//   node confirm_category.js '{"new_category_name": "Clothing", "type": "flexible", "new_keyword": "shoes"}'
//     -> creates a new top-level user category (only call this when under the active-category cap)
//   node confirm_category.js '{"new_category_name": "Takeout", "parent_category_name": "Groceries", "type": "recurring_variable", "new_keyword": "uber eats"}'
//     -> creates a new subcategory under an existing top-level category
//   node confirm_category.js '{"new_category_name": "Grocery", "force": true}'
//     -> bypasses the near-duplicate warning below and creates it anyway
//
// Before creating anything new, checks name similarity (Postgres pg_trgm)
// against every active category/subcategory. If the closest match is a
// likely duplicate and `force` wasn't passed, prints
// {"possible_duplicate": true, "closest_match": {...}, "similarity": 0.NN}
// and does NOT insert — surface this to the user and ask before retrying
// with `force: true`.
//
// Prints {"category_id": <id>} on success.

const { pool } = require('./db');

const DUPLICATE_SIMILARITY_THRESHOLD = 0.4;

async function findPossibleDuplicate(name) {
  const { rows } = await pool.query(
    `SELECT id, name, parent_id, similarity(name, $1) AS sim
     FROM categories
     WHERE active = true
     ORDER BY sim DESC
     LIMIT 1`,
    [name]
  );
  if (rows.length && rows[0].sim >= DUPLICATE_SIMILARITY_THRESHOLD) {
    return { id: rows[0].id, name: rows[0].name, parent_id: rows[0].parent_id, sim: Number(rows[0].sim) };
  }
  return null;
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: confirm_category.js \'{...}\'');
    process.exit(1);
  }
  const input = JSON.parse(arg);

  if (input.category_id) {
    if (input.new_keyword) {
      await pool.query(
        `UPDATE categories
         SET keyword_hints = array_append(keyword_hints, $2)
         WHERE id = $1 AND NOT ($2 = ANY(keyword_hints))`,
        [input.category_id, input.new_keyword.toLowerCase()]
      );
    }
    console.log(JSON.stringify({ category_id: input.category_id }));
    await pool.end();
    return;
  }

  if (input.new_category_name) {
    let parentId = null;
    if (input.parent_category_name) {
      const { rows: parentRows } = await pool.query(
        'SELECT id, parent_id FROM categories WHERE name = $1 AND active = true',
        [input.parent_category_name]
      );
      if (parentRows.length === 0) {
        throw new Error(`no active category named "${input.parent_category_name}" to attach a subcategory to`);
      }
      if (parentRows[0].parent_id) {
        throw new Error(`"${input.parent_category_name}" is itself a subcategory — subcategories can only be one level deep`);
      }
      parentId = parentRows[0].id;
    } else {
      const { rows: activeCount } = await pool.query(
        'SELECT count(*)::int AS n FROM categories WHERE active = true AND parent_id IS NULL'
      );
      if (activeCount[0].n >= 15) {
        throw new Error('active top-level category cap (15) reached — do not create a new top-level category, use an existing one (a new subcategory under an existing category is still fine)');
      }
    }

    if (!input.force) {
      const dup = await findPossibleDuplicate(input.new_category_name);
      if (dup) {
        console.log(JSON.stringify({
          possible_duplicate: true,
          closest_match: { id: dup.id, name: dup.name, is_subcategory: dup.parent_id !== null },
          similarity: dup.sim,
          message: `"${input.new_category_name}" looks similar to the existing "${dup.name}" (similarity ${dup.sim.toFixed(2)}). Ask the user to confirm before retrying with force: true.`,
        }));
        await pool.end();
        return;
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO categories (name, type, keyword_hints, created_by, parent_id)
       VALUES ($1, $2, $3, 'user', $4)
       ON CONFLICT (name) DO UPDATE SET active = true
       RETURNING id`,
      [
        input.new_category_name,
        input.type || 'flexible',
        input.new_keyword ? [input.new_keyword.toLowerCase()] : [],
        parentId,
      ]
    );
    console.log(JSON.stringify({ category_id: rows[0].id }));
    await pool.end();
    return;
  }

  throw new Error('must provide either category_id or new_category_name');
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
