"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { categoryColor } from "@/lib/categoryColors";
import type { CategoryBreakdownRow } from "@/lib/queries";

export function CategoryDonut({ data }: { data: CategoryBreakdownRow[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-text-muted">
        No spend in this period yet
      </div>
    );
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="name"
            innerRadius="62%"
            outerRadius="90%"
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((entry, i) => (
              <Cell key={entry.categoryId ?? `none-${i}`} fill={categoryColor(i)} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
