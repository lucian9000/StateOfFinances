import { pool } from "./db";

// node-postgres returns DATE columns as JS Date objects (parsed in local
// server time), not "YYYY-MM-DD" strings — normalize once at the query
// boundary so nothing downstream has to guess which shape it got.
function toDateOnlyString(value: Date | string): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value;
}

export type TimeRange = "daily" | "weekly" | "monthly" | "yearly";

const RANGE_TRUNC: Record<TimeRange, string> = {
  daily: "day",
  weekly: "week",
  monthly: "month",
  yearly: "year",
};

const RANGE_LABEL_FORMAT: Record<TimeRange, Intl.DateTimeFormatOptions> = {
  daily: { day: "numeric", month: "long" },
  weekly: { day: "numeric", month: "long" },
  monthly: { month: "long" },
  yearly: { year: "numeric" },
};

export function rangeLabel(range: TimeRange, now = new Date()): string {
  return new Intl.DateTimeFormat("en-ZA", RANGE_LABEL_FORMAT[range]).format(now);
}

export interface CategoryBreakdownRow {
  categoryId: number | null;
  name: string;
  amount: number;
  transactionCount: number;
}

export interface OverviewData {
  balance: number;
  spend: number;
  income: number;
  profit: number;
  categoryBreakdown: CategoryBreakdownRow[];
  rangeLabel: string;
}

export async function getOverview(range: TimeRange): Promise<OverviewData> {
  const trunc = RANGE_TRUNC[range];

  const [balanceRes, spendRes, incomeRes, categoryRes] = await Promise.all([
    pool.query<{ balance: string }>(
      `WITH latest_snapshot AS (
         SELECT amount, created_at FROM balance_snapshots ORDER BY created_at DESC LIMIT 1
       )
       SELECT
         COALESCE((SELECT amount FROM latest_snapshot), 0)
         + COALESCE((
             SELECT SUM(confirmed_zar) FROM income
             WHERE confirmed_zar IS NOT NULL
               AND created_at > COALESCE((SELECT created_at FROM latest_snapshot), '-infinity'::timestamptz)
           ), 0)
         - COALESCE((
             SELECT SUM(amount) FROM transactions
             WHERE created_at > COALESCE((SELECT created_at FROM latest_snapshot), '-infinity'::timestamptz)
           ), 0)
         AS balance`
    ),
    pool.query<{ spend: string }>(
      `SELECT COALESCE(SUM(amount), 0) AS spend
       FROM transactions
       WHERE date >= date_trunc($1, CURRENT_DATE)::date`,
      [trunc]
    ),
    pool.query<{ income: string }>(
      `SELECT COALESCE(SUM(confirmed_zar), 0) AS income
       FROM income
       WHERE confirmed_zar IS NOT NULL AND pay_date >= date_trunc($1, CURRENT_DATE)::date`,
      [trunc]
    ),
    pool.query<{ category_id: number | null; name: string | null; amount: string; transaction_count: string }>(
      `SELECT t.category_id, c.name, SUM(t.amount) AS amount, COUNT(*) AS transaction_count
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.date >= date_trunc($1, CURRENT_DATE)::date
       GROUP BY t.category_id, c.name
       ORDER BY amount DESC`,
      [trunc]
    ),
  ]);

  const spend = parseFloat(spendRes.rows[0].spend);
  const income = parseFloat(incomeRes.rows[0].income);

  return {
    balance: parseFloat(balanceRes.rows[0].balance),
    spend,
    income,
    profit: income - spend,
    categoryBreakdown: categoryRes.rows.map((r) => ({
      categoryId: r.category_id,
      name: r.name ?? "Uncategorized",
      amount: parseFloat(r.amount),
      transactionCount: parseInt(r.transaction_count, 10),
    })),
    rangeLabel: rangeLabel(range),
  };
}

export interface Goal {
  id: number;
  name: string;
  icon: string | null;
  targetAmount: number;
  currentAmount: number;
  progressPct: number;
}

export async function getGoals(): Promise<Goal[]> {
  const res = await pool.query<{
    id: number;
    name: string;
    icon: string | null;
    target_amount: string;
    current_amount: string;
  }>(
    `SELECT id, name, icon, target_amount, current_amount
     FROM goals
     WHERE active = true
     ORDER BY (current_amount / NULLIF(target_amount, 0)) DESC, id`
  );

  return res.rows.map((r) => {
    const target = parseFloat(r.target_amount);
    const current = parseFloat(r.current_amount);
    return {
      id: r.id,
      name: r.name,
      icon: r.icon,
      targetAmount: target,
      currentAmount: current,
      progressPct: target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0,
    };
  });
}

export interface TransactionRow {
  id: number;
  date: string;
  amount: number;
  categoryId: number | null;
  categoryName: string;
  note: string | null;
  source: string;
}

export interface TransactionFilter {
  search?: string;
  categoryId?: number;
}

export async function getTransactions(filter: TransactionFilter = {}): Promise<TransactionRow[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter.search) {
    params.push(`%${filter.search}%`);
    conditions.push(`(t.note ILIKE $${params.length} OR c.name ILIKE $${params.length})`);
  }
  if (filter.categoryId) {
    params.push(filter.categoryId);
    conditions.push(`t.category_id = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const res = await pool.query<{
    id: number;
    date: Date | string;
    amount: string;
    category_id: number | null;
    category_name: string | null;
    note: string | null;
    source: string;
  }>(
    `SELECT t.id, t.date, t.amount, t.category_id, c.name AS category_name, t.note, t.source
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     ${where}
     ORDER BY t.date DESC, t.id DESC
     LIMIT 200`,
    params
  );

  return res.rows.map((r) => ({
    id: r.id,
    date: toDateOnlyString(r.date),
    amount: parseFloat(r.amount),
    categoryId: r.category_id,
    categoryName: r.category_name ?? "Uncategorized",
    note: r.note,
    source: r.source,
  }));
}

export async function getCategoryList(): Promise<{ id: number; name: string }[]> {
  const res = await pool.query<{ id: number; name: string }>(
    `SELECT id, name FROM categories WHERE active = true ORDER BY name`
  );
  return res.rows;
}

// ─── Grocery List (StateOfGroceries) ─────────────────────────────────────────

export interface GrocerySpecial {
  store: string;
  itemKeyword: string;
  price: number | null;
  validUntil: string | null;
  asOf: string; // "prices as of" date, always present
}

export interface GroceryItem {
  id: number;
  itemName: string;
  quantity: string;
  requestedByName: string | null;
  estimatedPrice: number | null;
  special: GrocerySpecial | null;
}

export interface GroceryData {
  items: GroceryItem[];
  projected: {
    budget: number | null;
    boughtThisMonth: number;
    pendingEstimate: number;
    remaining: number | null; // null when no budget set
  };
}

/**
 * Pending grocery list + each item's best specials match + the projected-remaining
 * figure (same calc as the bot: Groceries budget_amount − bought-this-month −
 * pending-at-estimate). Bought items drop off this view (history stays in the table).
 */
export async function getGroceryData(): Promise<GroceryData> {
  const [itemsRes, calcRes] = await Promise.all([
    pool.query(
      `SELECT gi.id, gi.item_name, gi.quantity, gi.requested_by_name, gi.estimated_price,
              sp.store, sp.item_keyword, sp.price AS sp_price, sp.valid_until,
              to_char(sp.scraped_at, 'YYYY-MM-DD') AS sp_as_of
       FROM grocery_items gi
       LEFT JOIN LATERAL (
         SELECT store, item_keyword, price, valid_until, scraped_at
         FROM specials s
         WHERE gi.item_name ILIKE '%' || s.item_keyword || '%'
            OR s.item_keyword ILIKE '%' || gi.item_name || '%'
            OR similarity(s.item_keyword, gi.item_name) > 0.3
         ORDER BY similarity(s.item_keyword, gi.item_name) DESC
         LIMIT 1
       ) sp ON true
       WHERE gi.status = 'pending'
       ORDER BY gi.created_at`
    ),
    pool.query<{ budget: string | null; bought: string; pending_est: string }>(
      `SELECT (SELECT budget_amount FROM categories WHERE id = 8) AS budget,
         COALESCE((SELECT SUM(actual_price) FROM grocery_items
                   WHERE status = 'bought' AND bought_at >= date_trunc('month', CURRENT_DATE)), 0) AS bought,
         COALESCE((SELECT SUM(estimated_price) FROM grocery_items
                   WHERE status = 'pending' AND created_at >= date_trunc('month', CURRENT_DATE)), 0) AS pending_est`
    ),
  ]);

  const items: GroceryItem[] = itemsRes.rows.map((r) => ({
    id: r.id,
    itemName: r.item_name,
    quantity: r.quantity,
    requestedByName: r.requested_by_name,
    estimatedPrice: r.estimated_price != null ? parseFloat(r.estimated_price) : null,
    special: r.store
      ? {
          store: r.store,
          itemKeyword: r.item_keyword,
          price: r.sp_price != null ? parseFloat(r.sp_price) : null,
          validUntil: r.valid_until ? toDateOnlyString(r.valid_until) : null,
          asOf: r.sp_as_of,
        }
      : null,
  }));

  const c = calcRes.rows[0];
  const budget = c.budget != null ? parseFloat(c.budget) : null;
  const boughtThisMonth = parseFloat(c.bought);
  const pendingEstimate = parseFloat(c.pending_est);

  return {
    items,
    projected: {
      budget,
      boughtThisMonth,
      pendingEstimate,
      remaining: budget != null ? budget - boughtThisMonth - pendingEstimate : null,
    },
  };
}
