#!/usr/bin/env node
// Usage: node month_status.js
// Prints a single JSON line with this month's discretionary budget vs. actual spend.
// "Discretionary" = weekly_budget + weekend_budget pools across the month's budget
// rows, i.e. everything except true_fixed categories (rent, electricity, etc.),
// which are tracked separately via each category's own budget_amount.

const { pool } = require('./db');

async function main() {
  const { rows: budgetRows } = await pool.query(
    `SELECT income_total, savings_10pct, slush_5pct,
            SUM(weekly_budget) AS total_weekday_budget,
            SUM(weekend_budget) AS total_weekend_budget
     FROM budgets
     WHERE month = date_trunc('month', CURRENT_DATE)::date
     GROUP BY income_total, savings_10pct, slush_5pct`
  );

  if (budgetRows.length === 0) {
    console.log(JSON.stringify({
      has_budget: false,
      message: 'No budget rows found for this month yet — "Weekly Budget Calc" has not run.',
    }));
    await pool.end();
    return;
  }
  const budget = budgetRows[0];

  const { rows: spendRows } = await pool.query(
    `SELECT
       COALESCE(SUM(t.amount) FILTER (WHERE c.type <> 'true_fixed' OR c.type IS NULL), 0) AS discretionary_spent,
       COALESCE(SUM(t.amount) FILTER (WHERE c.type = 'true_fixed'), 0) AS fixed_spent
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.date >= date_trunc('month', CURRENT_DATE)::date AND t.date <= CURRENT_DATE`
  );
  const spend = spendRows[0];

  const { rows: byCategory } = await pool.query(
    `SELECT c.name, c.type, SUM(t.amount) AS spent
     FROM transactions t JOIN categories c ON c.id = t.category_id
     WHERE t.date >= date_trunc('month', CURRENT_DATE)::date AND t.date <= CURRENT_DATE
     GROUP BY c.name, c.type
     ORDER BY spent DESC`
  );

  const totalDiscretionaryBudget = Number(budget.total_weekday_budget) + Number(budget.total_weekend_budget);
  const discretionarySpent = Number(spend.discretionary_spent);

  const dayOfMonth = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();

  console.log(JSON.stringify({
    has_budget: true,
    income_total: Number(budget.income_total),
    savings_10pct: Number(budget.savings_10pct),
    slush_5pct: Number(budget.slush_5pct),
    discretionary_budget: Number(totalDiscretionaryBudget.toFixed(2)),
    discretionary_spent: discretionarySpent,
    discretionary_remaining: Number((totalDiscretionaryBudget - discretionarySpent).toFixed(2)),
    fixed_spent: Number(spend.fixed_spent),
    pct_month_elapsed: Number(((dayOfMonth / daysInMonth) * 100).toFixed(1)),
    by_category: byCategory.map((r) => ({ name: r.name, type: r.type, spent: Number(r.spent) })),
  }));
  await pool.end();
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
