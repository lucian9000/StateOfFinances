/**
 * Category initial badge — colored circle or rounded square with the category's first letter.
 */
export interface BadgeProps {
  /** Category name — only the first character is shown */
  label: string;
  /** Index into the 4-color category palette (0=violet, 1=magenta, 2=cyan, 3=amber) */
  colorIndex?: number;
  size?: 'sm' | 'md' | 'lg';
  /** 'circle' = rounded-full (transaction rows); 'rounded' = radius-lg (overview thumbnails) */
  shape?: 'circle' | 'rounded';
}
