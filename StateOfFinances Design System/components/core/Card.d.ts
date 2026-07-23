import type { ReactNode } from 'react';

/**
 * Base surface container. Three variants map to the layered dark-purple surface system.
 */
export interface CardProps {
  /** 'default' = --surface; 'raised' = --surface-raised; 'hero' = gradient + violet shadow */
  variant?: 'default' | 'raised' | 'hero';
  /** CSS padding string; defaults to --card-padding (24px) */
  padding?: string;
  children: ReactNode;
}
