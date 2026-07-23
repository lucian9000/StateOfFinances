"use server";

import { revalidatePath } from "next/cache";
import { pool } from "./db";

const GROCERIES_CATEGORY_ID = 8;

/**
 * Mark a pending grocery item as bought at a confirmed price. Writes a real
 * transactions row against Groceries and links it back to the grocery item —
 * mirrors the bot/slip reconciliation, but sourced from the dashboard.
 */
export async function markGroceryBought(id: number, amount: number): Promise<void> {
  if (!Number.isFinite(amount) || amount < 0) throw new Error("invalid amount");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ id: number; item_name: string }>(
      `SELECT id, item_name FROM grocery_items WHERE id = $1 AND status = 'pending' FOR UPDATE`,
      [id]
    );
    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return; // already bought / gone — no-op
    }
    const txRes = await client.query<{ id: number }>(
      `INSERT INTO transactions (date, amount, category_id, source, note)
       VALUES (CURRENT_DATE, $1, $2, 'manual', $3) RETURNING id`,
      [amount, GROCERIES_CATEGORY_ID, `Grocery: ${rows[0].item_name}`]
    );
    await client.query(
      `UPDATE grocery_items
       SET status = 'bought', actual_price = $1, matched_via = 'manual',
           transaction_id = $2, bought_at = now()
       WHERE id = $3`,
      [amount, txRes.rows[0].id, id]
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  revalidatePath("/grocery");
}

/** Inline-edit a pending item's estimated price (feeds projected-remaining). */
export async function updateEstimatedPrice(id: number, amount: number | null): Promise<void> {
  if (amount != null && (!Number.isFinite(amount) || amount < 0)) throw new Error("invalid amount");
  await pool.query(
    `UPDATE grocery_items SET estimated_price = $1 WHERE id = $2 AND status = 'pending'`,
    [amount, id]
  );
  revalidatePath("/grocery");
}
