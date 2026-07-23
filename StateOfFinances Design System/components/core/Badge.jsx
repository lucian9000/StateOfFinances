import React from 'react';

const PALETTE = [
  'var(--category-0)',
  'var(--category-1)',
  'var(--category-2)',
  'var(--category-3)',
];

export function Badge({label='?', colorIndex=0, size='md', shape='circle'}) {
  const sizes = {
    sm: {w:28, h:28, font:'0.6875rem'},
    md: {w:36, h:36, font:'0.875rem'},
    lg: {w:48, h:48, font:'1rem'},
  };
  const s = sizes[size] || sizes.md;
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0,
      width:s.w, height:s.h,
      borderRadius: shape === 'rounded' ? 'var(--radius-lg)' : 'var(--radius-full)',
      background: PALETTE[colorIndex % 4],
      color:'var(--bg)', fontWeight:600,
      fontFamily:'var(--font-display)', fontSize:s.font,
    }}>
      {String(label).charAt(0).toUpperCase()}
    </span>
  );
}
