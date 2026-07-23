#!/usr/bin/env node
// Usage: node afford_check.js '{"amount": 250, "pool": "weekday"}'
//        node afford_check.js '{"amount": 500, "pool": "weekend"}'
//        node afford_check.js '{"amount": 1500, "goal": "Trip to Cape Town"}'
// pool: "weekday" (default) | "weekend". Omit pool and pass "goal" (a goals.name
// substring match) to check against a savings goal's remaining target instead.

const { pool } = require('./db');

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: afford_check.js \'{"amount": 250, "pool": "weekday"}\'');
    process.exit(1);
  }
  const { amount, pool: poolName, goal } = JSON.parse(arg);
  if (typeof amount !== 'number') {
    console.error('amount must be a number');
    process.exit(1);
  }

  if (goal) {
    const { rows } = await pool.query(
      `SELECT name, target_amount, current_amount, target_date
       FROM goals WHERE active = true AND name ILIKE '%' || $1 || '%'
       ORDER BY id LIMIT 1`,
      [goal]
    );
    if (rows.length === 0) {
      console.log(JSON.stringify({ found_goal: false, message: `No active goal matching "${goal}".` }));
      await pool.end();
      return;
    }
    const g = rows[0];
    const remainingToTarget = Number(g.target_amount) - Number(g.current_amount);
    console.log(JSON.stringify({
      found_goal: true,
      goal_name: g.name,
      target_amount: Number(g.target_amount),
      current_amount: Number(g.current_amount),
      remaining_to_target: Number(remainingToTarget.toFixed(2)),
      remaining_after_hypothetical_spend: Number((remainingToTarget + amount).toFixed(2)),
      target_date: g.target_date,
    }));
    await pool.end();
    return;
  }

  const isWeekend = (poolName || 'weekday') === 'weekend';
  const { rows: budgetRows } = await pool.query(
    `SELECT weekly_budget, weekend_budget
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
  const dowFilter = isWeekend ? 'IN (0,6)' : 'NOT IN (0,6)';
  const { rows: spentRows } = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS spent
     FROM transactions
     WHERE date >= date_trunc('week', CURRENT_DATE)::date AND date <= CURRENT_DATE
       AND EXTRACT(DOW FROM date) ${dowFilter}`
  );
  const spent = Number(spentRows[0].spent);
  const poolBudget = Number(isWeekend ? budget.weekend_budget : budget.weekly_budget);
  const remaining = poolBudget - spent;

  console.log(JSON.stringify({
    has_budget: true,
    pool: isWeekend ? 'weekend' : 'weekday',
    pool_budget: poolBudget,
    spent_so_far: spent,
    remaining_before_spend: Number(remaining.toFixed(2)),
    remaining_after_hypothetical_spend: Number((remaining - amount).toFixed(2)),
    can_afford: remaining - amount >= 0,
  }));
  await pool.end();
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
