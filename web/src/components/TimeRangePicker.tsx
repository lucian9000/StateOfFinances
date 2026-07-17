"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { TimeRange } from "@/lib/queries";

const OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export function TimeRangePicker({ active }: { active: TimeRange }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function select(range: TimeRange) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", range);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => select(opt.value)}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            active === opt.value
              ? "bg-violet text-text"
              : "bg-surface text-text-muted hover:text-text"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
