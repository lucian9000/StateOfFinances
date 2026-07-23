import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireSession } from "@/lib/requireSession";
import { getTransactions, getCategoryList } from "@/lib/queries";
import { groupTransactionsByDay } from "@/lib/groupByDay";
import { categoryColor } from "@/lib/categoryColors";
import { SearchFilterBar } from "@/components/SearchFilterBar";
import { TransactionGroup } from "@/components/TransactionGroup";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string };
}) {
  await requireSession();

  const categoryId = searchParams.category ? parseInt(searchParams.category, 10) : undefined;

  const [transactions, categories] = await Promise.all([
    getTransactions({ search: searchParams.q, categoryId }),
    getCategoryList(),
  ]);

  // stable color-by-category-id across pages: index into the sorted category list
  const colorIndex = new Map(categories.map((c, i) => [c.id, i]));
  const colorFor = (id: number | null) => categoryColor(id !== null ? colorIndex.get(id) ?? 0 : 0);

  const groups = groupTransactionsByDay(transactions);

  return (
    <main className="flex flex-col gap-5 px-5 pb-10 pt-8">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-text-muted hover:text-text"
        >
          <ChevronLeft size={18} />
        </Link>
        <h1 className="font-display text-xl font-semibold">Transactions</h1>
      </div>

      <SearchFilterBar
        categories={categories}
        activeCategory={categoryId}
        initialSearch={searchParams.q ?? ""}
      />

      {groups.length === 0 ? (
        <p className="mt-6 text-center text-sm text-text-muted">No transactions found.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((g) => (
            <TransactionGroup key={g.label} label={g.label} rows={g.rows} colorFor={colorFor} />
          ))}
        </div>
      )}
    </main>
  );
}
