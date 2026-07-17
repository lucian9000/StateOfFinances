#!/usr/bin/env node
// Usage:
//   node confirm_category.js '{"category_id": 8, "new_keyword": "checkers"}'
//     -> appends new_keyword to an existing category's keyword_hints
//   node confirm_category.js '{"new_category_name": "Clothing", "type": "flexible", "new_keyword": "shoes"}'
//     -> creates a new user category (only call this when under the active-category cap)
// Prints {"category_id": <id>} on success.

const { pool } = require('./db');

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
    const { rows: activeCount } = await pool.query(
      'SELECT count(*)::int AS n FROM categories WHERE active = true'
    );
    if (activeCount[0].n >= 15) {
      throw new Error('active category cap (15) reached — do not create a new category, use an existing one');
    }
    const { rows } = await pool.query(
      `INSERT INTO categories (name, type, keyword_hints, created_by)
       VALUES ($1, $2, $3, 'user')
       ON CONFLICT (name) DO UPDATE SET active = true
       RETURNING id`,
      [
        input.new_category_name,
        input.type || 'flexible',
        input.new_keyword ? [input.new_keyword.toLowerCase()] : [],
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
