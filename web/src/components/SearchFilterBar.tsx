"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useState, useTransition } from "react";

export function SearchFilterBar({
  categories,
  activeCategory,
  initialSearch,
}: {
  categories: { id: number; name: string }[];
  activeCategory?: number;
  initialSearch: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [, startTransition] = useTransition();

  function updateParams(next: { q?: string; category?: number | null }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.q !== undefined) {
      if (next.q) params.set("q", next.q);
      else params.delete("q");
    }
    if (next.category !== undefined) {
      if (next.category) params.set("category", String(next.category));
      else params.delete("category");
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-card bg-surface px-4 py-3">
        <Search size={16} className="text-text-muted" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            updateParams({ q: e.target.value });
          }}
          placeholder="Search transactions"
          className="w-full bg-transparent text-sm text-text placeholder:text-text-muted focus:outline-none"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => updateParams({ category: null })}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
            !activeCategory ? "bg-violet text-text" : "bg-surface text-text-muted"
          }`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => updateParams({ category: c.id })}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
              activeCategory === c.id ? "bg-violet text-text" : "bg-surface text-text-muted"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}
