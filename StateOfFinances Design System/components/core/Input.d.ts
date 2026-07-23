import type { ReactNode, ChangeEvent } from 'react';

/**
 * Pill-shaped text input matching the Transactions page search bar.
 */
export interface InputProps {
  value?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  /** Optional leading icon element (e.g. a Lucide icon at 16px) */
  leadingSlot?: ReactNode;
}
