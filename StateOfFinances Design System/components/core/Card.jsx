import React from 'react';

const bgMap = {
  default: 'var(--surface)',
  raised:  'var(--surface-raised)',
  hero:    'var(--gradient-hero)',
};

export function Card({children, variant='default', padding='var(--card-padding)'}) {
  return (
    <div style={{
      borderRadius:'var(--radius-card)',
      padding,
      background: bgMap[variant] || 'var(--surface)',
      boxShadow: variant === 'hero' ? 'var(--shadow-card)' : undefined,
    }}>
      {children}
    </div>
  );
}
