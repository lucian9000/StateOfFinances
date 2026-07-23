import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireSession } from "@/lib/requireSession";
import { getGroceryData } from "@/lib/queries";
import { formatCurrency } from "@/lib/formatCurrency";
import { GroceryList } from "@/components/GroceryList";

export const dynamic = "force-dynamic";

export default async function GroceryPage() {
  await requireSession();
  const { items, projected } = await getGroceryData();

  return (
    <main className="flex flex-col gap-6 px-5 pb-10 pt-8">
      <header className="flex items-center gap-3">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-raised text-text-muted"
        >
          <ChevronLeft size={18} />
        </Link>
        <h1 className="font-display text-xl font-semibold">Grocery List</h1>
      </header>

      {/* Projected-remaining header — same calc as the bot */}
      <div className="rounded-card bg-hero p-5 shadow-card">
        <p className="text-sm text-text-muted">Projected remaining this month</p>
        {projected.remaining != null ? (
          <>
            <p className="mt-1 font-display text-3xl font-semibold tabular">
              {formatCurrency(projected.remaining)}
            </p>
            <p className="mt-2 text-xs text-text-muted">
              of {formatCurrency(projected.budget ?? 0)} — if all pending items are bought at
              estimate ({formatCurrency(projected.boughtThisMonth)} bought,{" "}
              {formatCurrency(projected.pendingEstimate)} pending est.)
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-text-muted">
            Set a monthly Groceries budget to see this.
          </p>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-text-muted">
          Pending {items.length > 0 && `(${items.length})`}
        </h2>
        <GroceryList items={items} />
      </section>
    </main>
  );
}
