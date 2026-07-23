import type { ReactNode } from 'react';

/**
 * Primary action trigger. Pill-shaped, five financial-semantic variants.
 */
export interface ButtonProps {
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'income';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  /** Stretch to fill container width */
  fullWidth?: boolean;
  children: ReactNode;
}
