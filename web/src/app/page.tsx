import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { getOverview, getGoals, type TimeRange } from "@/lib/queries";
import { categoryColor } from "@/lib/categoryColors";
import { TimeRangePicker } from "@/components/TimeRangePicker";
import { BalanceHeroCard } from "@/components/BalanceHeroCard";
import { CategoryDonut } from "@/components/CategoryDonut";
import { CategoryList } from "@/components/CategoryList";
import { GoalsList } from "@/components/GoalsList";

const VALID_RANGES: TimeRange[] = ["daily", "weekly", "monthly", "yearly"];

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  const range: TimeRange = VALID_RANGES.includes(searchParams.range as TimeRange)
    ? (searchParams.range as TimeRange)
    : "monthly";

  const session = await auth();
  const [overview, goals] = await Promise.all([getOverview(range), getGoals()]);

  const firstName =
    session?.user?.name?.split(" ")[0] ?? session?.user?.email?.split("@")[0] ?? "there";

  return (
    <main className="flex flex-col gap-6 px-5 pb-10 pt-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-muted">Hello,</p>
          <h1 className="font-display text-xl font-semibold capitalize">{firstName}</h1>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-raised font-display text-sm font-semibold">
          {firstName.charAt(0).toUpperCase()}
        </div>
      </header>

      {overview.categoryBreakdown.length > 0 && (
        <div className="flex gap-3">
          {overview.categoryBreakdown.slice(0, 4).map((c, i) => (
            <span
              key={c.categoryId ?? `none-${i}`}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-semibold text-bg"
              style={{ backgroundColor: categoryColor(i) }}
              title={c.name}
            >
              {c.name.charAt(0).toUpperCase()}
            </span>
          ))}
        </div>
      )}

      <BalanceHeroCard balance={overview.balance} spend={overview.spend} profit={overview.profit} />

      <TimeRangePicker active={range} />

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">{overview.rangeLabel}</h2>
          <span
            className={`font-mono text-sm font-medium ${overview.profit >= 0 ? "text-cyan" : "text-magenta"}`}
          >
            {overview.profit >= 0 ? "+" : "-"} R {Math.abs(overview.profit).toLocaleString("en-ZA")}
          </span>
        </div>
        <CategoryDonut data={overview.categoryBreakdown} />
        <CategoryList data={overview.categoryBreakdown} />
      </section>

      <GoalsList goals={goals} />

      <Link
        href="/transactions"
        className="flex items-center justify-between rounded-card bg-surface px-4 py-3 text-sm font-medium text-text-muted transition hover:text-text"
      >
        View all transactions
        <ChevronRight size={18} />
      </Link>
    </main>
  );
}
