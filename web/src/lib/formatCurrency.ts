/**
 * Single source of truth for money formatting: "R" prefix, space, comma
 * thousands separator, no decimals unless the value has cents.
 */
export function formatCurrency(amount: number | string): string {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  const hasCents = Math.abs(value % 1) > 0.001;
  const formatted = value.toLocaleString("en-ZA", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `R ${formatted}`;
}

/** Same formatting, without the "R " prefix — for odometer digit rendering. */
export function formatAmountDigits(amount: number | string): string {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  const hasCents = Math.abs(value % 1) > 0.001;
  return value.toLocaleString("en-ZA", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  });
}
