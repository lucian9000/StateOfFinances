import type { TransactionRow } from "./queries";

export function dayLabel(dateStr: string, today = new Date()): string {
  const date = new Date(dateStr + "T00:00:00");
  const todayStr = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (dateStr === todayStr) return "Today";
  if (dateStr === yesterdayStr) return "Yesterday";
  return new Intl.DateTimeFormat("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function groupTransactionsByDay(
  transactions: TransactionRow[]
): { label: string; rows: TransactionRow[] }[] {
  const groups = new Map<string, TransactionRow[]>();
  for (const t of transactions) {
    const label = dayLabel(t.date);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(t);
  }
  return Array.from(groups.entries()).map(([label, rows]) => ({ label, rows }));
}
