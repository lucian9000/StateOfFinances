/**
 * Savings/wishlist goal row — amber icon well, goal name, target, and auto-calculated progress %.
 */
export interface GoalCardProps {
  name?: string;
  /** Emoji or single character — displayed in an amber icon well */
  icon?: string;
  targetAmount?: number;
  currentAmount?: number;
}
