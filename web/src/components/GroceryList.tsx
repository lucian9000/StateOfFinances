"use client";

import { useState, useTransition } from "react";
import { Check, Tag, Loader2 } from "lucide-react";
import type { GroceryItem } from "@/lib/queries";
import { markGroceryBought, updateEstimatedPrice } from "@/lib/groceryActions";
import { formatCurrency } from "@/lib/formatCurrency";
import { categoryColor } from "@/lib/categoryColors";

export function GroceryList({ items }: { items: GroceryItem[] }) {
  const [isPending, startTransition] = useTransition();
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [priceDraft, setPriceDraft] = useState<string>("");

  if (items.length === 0) {
    return (
      <p className="rounded-card bg-surface px-4 py-8 text-center text-sm text-text-muted">
        Nothing on the list. Text the StateOfGroceries bot to add items.
      </p>
    );
  }

  function beginConfirm(item: GroceryItem) {
    setConfirmingId(item.id);
    setPriceDraft(item.estimatedPrice != null ? String(item.estimatedPrice) : "");
  }

  function confirmBought(id: number) {
    const amount = parseFloat(priceDraft);
    if (!Number.isFinite(amount) || amount < 0) return;
    startTransition(async () => {
      await markGroceryBought(id, amount);
      setConfirmingId(null);
    });
  }

  function saveEstimate(id: number, raw: string, current: number | null) {
    const trimmed = raw.trim();
    const next = trimmed === "" ? null : parseFloat(trimmed);
    if (next != null && !Number.isFinite(next)) return;
    if (next === current) return;
    startTransition(() => updateEstimatedPrice(id, next));
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, i) => (
        <li key={item.id} className="rounded-card bg-surface p-4">
          <div className="flex items-center gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-bg"
              style={{ backgroundColor: categoryColor(i) }}
            >
              {item.itemName.charAt(0).toUpperCase()}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text">
                {item.itemName}
                {item.quantity && item.quantity !== "1" && (
                  <span className="text-text-muted"> ×{item.quantity}</span>
                )}
              </p>
              {item.requestedByName && (
                <p className="text-xs text-text-muted">for {item.requestedByName}</p>
              )}
            </div>

            {/* inline estimated price */}
            <div className="flex items-center gap-1 text-sm text-text-muted">
              <span>R</span>
              <input
                type="number"
                inputMode="decimal"
                defaultValue={item.estimatedPrice ?? ""}
                placeholder="est."
                onBlur={(e) => saveEstimate(item.id, e.target.value, item.estimatedPrice)}
                className="tabular w-16 rounded-md bg-surface-raised px-2 py-1 text-right text-text focus:outline-none focus:ring-1 focus:ring-violet"
              />
            </div>

            {/* mark bought */}
            {confirmingId === item.id ? null : (
              <button
                aria-label="Mark bought"
                onClick={() => beginConfirm(item)}
                disabled={isPending}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-raised text-text-muted transition hover:bg-violet hover:text-text"
              >
                <Check size={16} />
              </button>
            )}
          </div>

          {/* specials match, inline */}
          {item.special && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber/20 px-3 py-1.5 text-xs text-savings">
              <Tag size={13} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate">
                {item.special.store}
                {item.special.price != null && ` · ${formatCurrency(item.special.price)}`}
                {item.special.validUntil && ` · until ${item.special.validUntil}`}
              </span>
              <span className="shrink-0 text-text-muted">as of {item.special.asOf}</span>
            </div>
          )}

          {/* confirm-bought price row */}
          {confirmingId === item.id && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-text-muted">Paid R</span>
              <input
                autoFocus
                type="number"
                inputMode="decimal"
                value={priceDraft}
                onChange={(e) => setPriceDraft(e.target.value)}
                className="tabular w-24 rounded-md bg-surface-raised px-2 py-1 text-right text-text focus:outline-none focus:ring-1 focus:ring-violet"
              />
              <button
                onClick={() => confirmBought(item.id)}
                disabled={isPending || priceDraft.trim() === ""}
                className="flex items-center gap-1 rounded-full bg-violet px-3 py-1.5 text-xs font-medium text-text disabled:opacity-50"
              >
                {isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Confirm
              </button>
              <button
                onClick={() => setConfirmingId(null)}
                className="rounded-full px-3 py-1.5 text-xs text-text-muted"
              >
                Cancel
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
