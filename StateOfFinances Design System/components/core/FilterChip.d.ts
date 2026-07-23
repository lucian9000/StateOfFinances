/**
 * Category filter chip. Active state fills with --violet. Use in a scrollable flex row.
 */
export interface FilterChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}
