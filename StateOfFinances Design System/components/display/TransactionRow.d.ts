/**
 * Single ledger entry — category badge, name, optional note, and amount in magenta mono.
 */
export interface TransactionRowProps {
  categoryName?: string;
  /** Short description, truncated at 180px */
  note?: string;
  /** Amount in ZAR — always shown as negative spend */
  amount?: number;
  /** Index into the 4-color category palette */
  colorIndex?: number;
}
