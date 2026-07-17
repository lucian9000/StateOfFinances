export const CATEGORY_PALETTE = ["#8B5CF6", "#E64FCC", "#22D3EE", "#F5A623"] as const;

/** Stable color assignment by position in a sorted list, cycling the 4-color palette. */
export function categoryColor(index: number): string {
  return CATEGORY_PALETTE[index % CATEGORY_PALETTE.length];
}
