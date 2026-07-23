import React from 'react';

export function FilterChip({label, active=false, onClick}) {
  return (
    <button onClick={onClick} style={{
      flexShrink:0, borderRadius:'var(--radius-full)', padding:'5px 14px',
      border:'none', cursor:'pointer',
      fontFamily:'var(--font-body)', fontSize:'var(--text-sm)', fontWeight:500,
      transition:'background var(--transition-fast), color var(--transition-fast)',
      background: active ? 'var(--violet)' : 'var(--surface)',
      color:       active ? 'var(--text)'   : 'var(--text-muted)',
      whiteSpace:'nowrap',
    }}>
      {label}
    </button>
  );
}
