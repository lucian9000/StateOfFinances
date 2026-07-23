#!/usr/bin/env node
// Usage: node week_status.js
// Prints a single JSON line with this week's budget pools vs. actual spend.

const { pool } = require('./db');

async function main() {
  const { rows: budgetRows } = await pool.query(
    `SELECT week_number, weekly_budget, weekend_budget
     FROM budgets
     WHERE month = date_trunc('month', CURRENT_DATE)::date
       AND week_number = CEIL(EXTRACT(DAY FROM CURRENT_DATE) / 7.0)
     LIMIT 1`
  );

  if (budgetRows.length === 0) {
    console.log(JSON.stringify({
      has_budget: false,
      message: 'No budget row found for this week yet — "Weekly Budget Calc" has not run.',
    }));
    await pool.end();
    return;
  }
  const budget = budgetRows[0];

  const { rows: totalsRows } = await pool.query(
    `SELECT
       COALESCE(SUM(amount) FILTER (WHERE EXTRACT(DOW FROM date) NOT IN (0,6)), 0) AS weekday_spent,
       COALESCE(SUM(amount) FILTER (WHERE EXTRACT(DOW FROM date) IN (0,6)), 0) AS weekend_spent
     FROM transactions
     WHERE date >= date_trunc('week', CURRENT_DATE)::date AND date <= CURRENT_DATE`
  );
  const totals = totalsRows[0];

  const { rows: byCategory } = await pool.query(
    `SELECT c.name, SUM(t.amount) AS spent
     FROM transactions t JOIN categories c ON c.id = t.category_id
     WHERE t.date >= date_trunc('week', CURRENT_DATE)::date AND t.date <= CURRENT_DATE
     GROUP BY c.name
     ORDER BY spent DESC`
  );

  const weeklyBudget = Number(budget.weekly_budget);
  const weekendBudget = Number(budget.weekend_budget);
  const weekdaySpent = Number(totals.weekday_spent);
  const weekendSpent = Number(totals.weekend_spent);

  console.log(JSON.stringify({
    has_budget: true,
    week_number: budget.week_number,
    weekday_budget: weeklyBudget,
    weekday_spent: weekdaySpent,
    weekday_remaining: Number((weeklyBudget - weekdaySpent).toFixed(2)),
    weekend_budget: weekendBudget,
    weekend_spent: weekendSpent,
    weekend_remaining: Number((weekendBudget - weekendSpent).toFixed(2)),
    by_category: byCategory.map((r) => ({ name: r.name, spent: Number(r.spent) })),
  }));
  await pool.end();
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
