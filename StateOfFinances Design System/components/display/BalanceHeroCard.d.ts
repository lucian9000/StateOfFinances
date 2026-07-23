/**
 * Hero card showing running balance with spend and profit stats. Gradient bg + violet shadow.
 */
export interface BalanceHeroCardProps {
  /** Running balance in ZAR */
  balance?: number;
  /** Total spend in the current period */
  spend?: number;
  /** Income minus spend — positive = cyan, negative = magenta */
  profit?: number;
}
