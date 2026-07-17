import { categoryColor } from "@/lib/categoryColors";
import { formatCurrency } from "@/lib/formatCurrency";
import type { CategoryBreakdownRow } from "@/lib/queries";

export function CategoryList({ data }: { data: CategoryBreakdownRow[] }) {
  if (data.length === 0) return null;

  return (
    <ul className="mt-4 flex flex-col gap-3">
      {data.map((row, i) => (
        <li key={row.categoryId ?? `none-${i}`} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-bg"
              style={{ backgroundColor: categoryColor(i) }}
            >
              {row.name.charAt(0).toUpperCase()}
            </span>
            <div>
              <p className="text-sm font-medium text-text">{row.name}</p>
              <p className="text-xs text-text-muted">
                {row.transactionCount} transaction{row.transactionCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <p className="font-mono text-sm font-medium" style={{ color: categoryColor(i) }}>
            - {formatCurrency(row.amount)}
          </p>
        </li>
      ))}
    </ul>
  );
}
