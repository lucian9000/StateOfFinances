import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { OdometerNumber } from "./OdometerNumber";
import { formatAmountDigits } from "@/lib/formatCurrency";

export function BalanceHeroCard({
  balance,
  spend,
  profit,
}: {
  balance: number;
  spend: number;
  profit: number;
}) {
  return (
    <div className="rounded-card bg-hero p-6 shadow-card">
      <p className="text-sm text-text-muted">My Balance</p>
      <p className="mt-1 font-display text-4xl font-semibold">
        <span className="text-text-muted">R </span>
        <OdometerNumber text={formatAmountDigits(balance)} />
      </p>

      <div className="mt-6 flex gap-6">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-magenta/20 text-magenta">
            <ArrowDownRight size={16} />
          </span>
          <div>
            <p className="text-xs text-text-muted">Spend</p>
            <p className="font-mono text-sm font-medium text-magenta">
              + {formatAmountDigits(spend)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan/20 text-cyan">
            <ArrowUpRight size={16} />
          </span>
          <div>
            <p className="text-xs text-text-muted">Profit</p>
            <p className="font-mono text-sm font-medium text-cyan">
              {profit >= 0 ? "+" : "-"} {formatAmountDigits(Math.abs(profit))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
