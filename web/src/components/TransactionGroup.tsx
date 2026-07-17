import { formatCurrency } from "@/lib/formatCurrency";
import type { TransactionRow } from "@/lib/queries";

export function TransactionGroup({
  label,
  rows,
  colorFor,
}: {
  label: string;
  rows: TransactionRow[];
  colorFor: (categoryId: number | null) => string;
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">{label}</h3>
      <ul className="flex flex-col gap-1">
        {rows.map((t) => (
          <li key={t.id} className="flex items-center justify-between rounded-card px-2 py-2.5">
            <div className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-bg"
                style={{ backgroundColor: colorFor(t.categoryId) }}
              >
                {t.categoryName.charAt(0).toUpperCase()}
              </span>
              <div>
                <p className="text-sm font-medium text-text">{t.categoryName}</p>
                {t.note && <p className="max-w-[180px] truncate text-xs text-text-muted">{t.note}</p>}
              </div>
            </div>
            <p className="font-mono text-sm font-medium text-magenta">- {formatCurrency(t.amount)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
