#!/usr/bin/env node
// Usage: node category_breakdown.js '{"period": "month"}'
//        node category_breakdown.js '{"period": "week"}'
// Prints category spend for the given period, sorted highest-first, with each
// category's share of the period's total spend.

const { pool } = require('./db');

async function main() {
  const arg = process.argv[2] || '{}';
  const { period } = JSON.parse(arg);
  const trunc = period === 'week' ? 'week' : 'month';

  const { rows } = await pool.query(
    `SELECT c.name, c.type, SUM(t.amount) AS spent
     FROM transactions t JOIN categories c ON c.id = t.category_id
     WHERE t.date >= date_trunc('${trunc}', CURRENT_DATE)::date AND t.date <= CURRENT_DATE
     GROUP BY c.name, c.type
     ORDER BY spent DESC`
  );

  const total = rows.reduce((sum, r) => sum + Number(r.spent), 0);
  const byCategory = rows.map((r) => ({
    name: r.name,
    type: r.type,
    spent: Number(r.spent),
    pct_of_total: total > 0 ? Number(((Number(r.spent) / total) * 100).toFixed(1)) : 0,
  }));

  console.log(JSON.stringify({
    period: trunc,
    total_spent: Number(total.toFixed(2)),
    by_category: byCategory,
    top_categories: byCategory.slice(0, 2).map((c) => c.name),
  }));
  await pool.end();
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
