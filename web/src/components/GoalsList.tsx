import * as Icons from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";
import type { Goal } from "@/lib/queries";

function GoalIcon({ name }: { name: string | null }) {
  const Icon = (name && (Icons as unknown as Record<string, Icons.LucideIcon>)[toPascalCase(name)]) || Icons.Target;
  return <Icon size={16} />;
}

function toPascalCase(s: string) {
  return s
    .split(/[-_\s]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

export function GoalsList({ goals }: { goals: Goal[] }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Goal</h2>
        {/* No standalone goals page yet (out of the two-page spec) — all active
            goals are already listed below, so "See all" is just a visual label. */}
        <span className="text-sm text-text-muted">See all</span>
      </div>

      {goals.length === 0 ? (
        <p className="mt-3 text-sm text-text-muted">No goals set yet.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {goals.map((goal) => (
            <li
              key={goal.id}
              className="flex items-center justify-between rounded-card bg-surface px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber/20 text-amber">
                  <GoalIcon name={goal.icon} />
                </span>
                <div>
                  <p className="text-sm font-medium text-text">{goal.name}</p>
                  <p className="text-xs text-text-muted">
                    Goal {formatCurrency(goal.targetAmount)}
                  </p>
                </div>
              </div>
              <span className="font-mono text-sm font-semibold text-amber">
                {goal.progressPct}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
